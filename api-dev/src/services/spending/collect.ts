/**
 * Прогін колектора Є-data за один місяць: договори, платежі, архів, картки.
 *
 * Порядок кроків навмисний: спершу сира відповідь їде в R2, потім рядки в D1,
 * і лише наприкінці — картки в KV. Обірваний прогін лишає `error` у
 * `spending_sync` і продовжується з того кроку, а не з початку.
 * @module api-dev/src/services/spending/collect
 */

import { apiLog } from "../../shared/logger";
import type { Env } from "../../shared/types";
import {
  CARD_TTL_SECONDS,
  LASTLOAD_KEY,
  MAX_PAYERS_PER_REQUEST,
  SEED_ORGS,
  SOURCE_PAUSE_MS,
  cardKey,
  chunk,
  monthWindow,
} from "./config";
import {
  type DocumentRow,
  type RawRecord,
  type TransactionRow,
  documentRow,
  orgRow,
  transactionRow,
} from "./normalize";
import {
  archiveRaw,
  buildOrgCard,
  ensureSpendingTables,
  isSettled,
  markSync,
  upsertDocuments,
  upsertOrgs,
  upsertTransactions,
} from "./store";
import { contractsUrl, disposerUrl, fetchJson, lastLoadUrl, pause, transactionsUrl } from "./source";

export interface SpendingRunOptions {
  /** `YYYY-MM` — рівно один місяць: ширше джерело не віддає транзакцій. */
  readonly period: string;
  /** Набір ЄДРПОУ; типово — громада з `SEED_ORGS`. */
  readonly orgs?: readonly string[];
}

export interface SpendingRunReport {
  readonly period: string;
  readonly orgs: number;
  readonly documents: number;
  readonly transactions: number;
  readonly archivedBytes: number;
  readonly skipped: readonly string[];
  readonly failed: readonly string[];
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Платежі приходять масивом; об'єкт у відповіді — це `errorMessage`, а не дані. */
function asRows(payload: unknown): RawRecord[] {
  if (!Array.isArray(payload)) {
    throw new Error("Є-data віддало не масив — причину шукати в тілі відповіді.");
  }
  return payload as RawRecord[];
}

export async function runSpendingCollection(
  env: Env,
  options: SpendingRunOptions,
): Promise<SpendingRunReport> {
  const bucket = env.SPENDING_SNAPSHOTS;
  if (!bucket) {
    throw new Error("Немає біндингу SPENDING_SNAPSHOTS: архів сирих відповідей неможливий.");
  }

  await ensureSpendingTables(env.DB);

  const window = monthWindow(options.period);
  const orgs = options.orgs ?? SEED_ORGS;
  const skipped: string[] = [];
  const failed: string[] = [];
  let documents = 0;
  let transactions = 0;
  let archivedBytes = 0;

  for (const edrpou of orgs) {
    const key = `org:${edrpou}:${window.period}`;
    if (await isSettled(env.DB, key)) {
      skipped.push(edrpou);
      continue;
    }

    await markSync(env.DB, { key, kind: "contracts", period: window.period, status: "running" });
    try {
      const org = orgRow(await fetchJson<RawRecord>(disposerUrl(edrpou)));
      const payload = await fetchJson<{ documents?: RawRecord[] }>(
        contractsUrl(edrpou, window.from, window.to),
      );
      archivedBytes += await archiveRaw(
        bucket,
        `spending/contracts/${edrpou}/${window.period}.json.gz`,
        payload,
      );

      const rows = (payload.documents ?? [])
        .map((raw) => documentRow(raw, "contract"))
        .filter((row): row is DocumentRow => row !== null);

      if (org) await upsertOrgs(env.DB, [org]);
      await upsertDocuments(env.DB, rows);
      documents += rows.length;
      await markSync(env.DB, {
        key,
        kind: "contracts",
        period: window.period,
        status: "ok",
        rows: rows.length,
      });
    } catch (error) {
      failed.push(edrpou);
      apiLog.error(`spending: договори ${edrpou} за ${window.period} не зібрано`, error);
      await markSync(env.DB, {
        key,
        kind: "contracts",
        period: window.period,
        status: "error",
        error: failure(error),
      });
    }
    await pause(SOURCE_PAUSE_MS);
  }

  const batches = chunk(orgs, MAX_PAYERS_PER_REQUEST);
  for (const [index, batch] of batches.entries()) {
    const key = `transactions:${window.period}:batch-${index + 1}`;
    if (await isSettled(env.DB, key)) {
      skipped.push(key);
      continue;
    }

    await markSync(env.DB, { key, kind: "transactions", period: window.period, status: "running" });
    try {
      const payload = await fetchJson<unknown>(transactionsUrl(batch, window.from, window.to));
      archivedBytes += await archiveRaw(
        bucket,
        `spending/transactions/${window.period}/batch-${index + 1}.json.gz`,
        payload,
      );

      const rows = asRows(payload)
        .map(transactionRow)
        .filter((row): row is TransactionRow => row !== null);

      await upsertTransactions(env.DB, rows);
      transactions += rows.length;
      await markSync(env.DB, {
        key,
        kind: "transactions",
        period: window.period,
        status: "ok",
        rows: rows.length,
      });
    } catch (error) {
      failed.push(key);
      apiLog.error(`spending: платежі ${key} не зібрано`, error);
      await markSync(env.DB, {
        key,
        kind: "transactions",
        period: window.period,
        status: "error",
        error: failure(error),
      });
    }
    await pause(SOURCE_PAUSE_MS);
  }

  for (const edrpou of orgs) {
    const card = await buildOrgCard(env.DB, edrpou, window);
    await env.CONTENT_KV.put(cardKey(edrpou), JSON.stringify(card), {
      expirationTtl: CARD_TTL_SECONDS,
    });
  }

  try {
    const lastLoad = await fetchJson<RawRecord>(lastLoadUrl());
    await env.CONTENT_KV.put(
      LASTLOAD_KEY,
      JSON.stringify({ fetchedAt: new Date().toISOString(), payload: lastLoad }),
    );
  } catch (error) {
    apiLog.error("spending: дата останнього завантаження не прийшла", error);
  }

  const report: SpendingRunReport = {
    period: window.period,
    orgs: orgs.length,
    documents,
    transactions,
    archivedBytes,
    skipped,
    failed,
  };
  apiLog.info("spending: прогін завершено", { ...report, skipped: skipped.length });
  return report;
}
