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
  DOCUMENTS_CAP,
  LASTLOAD_KEY,
  MAX_CONSECUTIVE_FAILURES,
  MAX_PAYERS_PER_REQUEST,
  REFRESH_AFTER_MS,
  RUN_BUDGET_MS,
  SEED_ORGS,
  SOURCE_PAUSE_MS,
  type MonthWindow,
  batchKey,
  cardKey,
  chunk,
  monthWindow,
  splitRange,
} from "./config";
import {
  type DocumentRow,
  type RawRecord,
  type TransactionRow,
  documentRow,
  num,
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
import {
  contractsUrl,
  disposerUrl,
  fetchJson,
  lastLoadUrl,
  pause,
  transactionsUrl,
} from "./source";

export interface SpendingRunOptions {
  /** `YYYY-MM` — рівно один місяць: ширше джерело не віддає транзакцій. */
  readonly period: string;
  /** Набір ЄДРПОУ; типово — громада з `SEED_ORGS`. */
  readonly orgs?: readonly string[];
  /** Перечитати навіть свіже зібране: ручний запуск з адмінки. */
  readonly force?: boolean;
}

export interface SpendingRunReport {
  readonly period: string;
  readonly orgs: number;
  readonly documents: number;
  readonly transactions: number;
  readonly archivedBytes: number;
  readonly skipped: readonly string[];
  readonly failed: readonly string[];
  /** Причина, з якої прогін спинився достроково; `null` — пройшов увесь. */
  readonly stopped: string | null;
}

interface RunState {
  readonly deadline: number;
  consecutiveFailures: number;
  stopped: string | null;
  documents: number;
  transactions: number;
  archivedBytes: number;
}

interface ContractsPayload {
  readonly documents?: RawRecord[];
  readonly count?: unknown;
  readonly moreThenCount?: unknown;
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

/** Джерело обрізало відповідь: рядків більше, ніж влазить у `DOCUMENTS_CAP`. */
function truncated(payload: ContractsPayload, raw: readonly RawRecord[]): boolean {
  if (raw.length >= DOCUMENTS_CAP) return true;
  if (num(payload.moreThenCount) > 0) return true;
  return num(payload.count) > raw.length;
}

function outOfBudget(state: RunState): boolean {
  if (Date.now() < state.deadline) return false;
  state.stopped = `бюджет ${Math.round(RUN_BUDGET_MS / 60_000)} хв вичерпано`;
  return true;
}

function noteFailure(state: RunState, message: string): void {
  state.consecutiveFailures += 1;
  if (state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    state.stopped = `${MAX_CONSECUTIVE_FAILURES} збої поспіль (останній: ${message})`;
  }
}

/** Архів лежить один на місяць; роздроблене вікно додає свої межі до назви. */
function contractsArchiveKey(
  edrpou: string,
  window: MonthWindow,
  from: string,
  to: string,
): string {
  const scope =
    from === window.from && to === window.to ? window.period : `${window.period}.${from}_${to}`;
  return `spending/contracts/${edrpou}/${scope}.json.gz`;
}

/**
 * Договори за вікно з добором обрізаного: джерело віддає не більше
 * `DOCUMENTS_CAP` за відповідь, тож місяць ділиться навпіл, доки влазить.
 */
async function collectContracts(
  bucket: R2Bucket,
  state: RunState,
  edrpou: string,
  window: MonthWindow,
  from: string,
  to: string,
): Promise<DocumentRow[]> {
  const key = contractsArchiveKey(edrpou, window, from, to);
  const payload = await fetchJson<ContractsPayload>(contractsUrl(edrpou, from, to), {
    onBody: async (body) => {
      state.archivedBytes += await archiveRaw(bucket, key, body);
    },
  });

  const raw = payload.documents ?? [];
  if (!truncated(payload, raw)) {
    return raw.map((item) => documentRow(item, "contract")).filter((row) => row !== null);
  }
  if (from === to) {
    throw new Error(
      `Є-data обрізало договори за ${from} (понад ${DOCUMENTS_CAP}) — повне вивантаження цього дня неможливе`,
    );
  }

  const { left, right } = splitRange(from, to);
  const parts: DocumentRow[] = [];
  for (const [start, end] of [left, right]) {
    await pause(SOURCE_PAUSE_MS);
    parts.push(...(await collectContracts(bucket, state, edrpou, window, start, end)));
  }
  return parts;
}

export async function runSpendingCollection(
  env: Env,
  options: SpendingRunOptions,
): Promise<SpendingRunReport> {
  const bucket = env.SPENDING_SNAPSHOTS;
  if (!bucket) {
    throw new Error("Немає биндингу SPENDING_SNAPSHOTS: архів сирих відповідей неможливий.");
  }

  await ensureSpendingTables(env.DB);

  const window = monthWindow(options.period);
  const orgs = options.orgs ?? SEED_ORGS;
  const skipped: string[] = [];
  const failed: string[] = [];
  const state: RunState = {
    deadline: Date.now() + RUN_BUDGET_MS,
    consecutiveFailures: 0,
    stopped: null,
    documents: 0,
    transactions: 0,
    archivedBytes: 0,
  };
  /* Свіже не перечитуємо, застаріле — так: джерело доопубліковує із запізненням. */
  const settledFor = options.force ? undefined : REFRESH_AFTER_MS;

  for (const edrpou of orgs) {
    if (state.stopped || outOfBudget(state)) break;

    const key = `org:${edrpou}:${window.period}`;
    if (await isSettled(env.DB, key, settledFor)) {
      skipped.push(edrpou);
      continue;
    }

    await markSync(env.DB, { key, kind: "contracts", period: window.period, status: "running" });
    try {
      const org = orgRow(await fetchJson<RawRecord>(disposerUrl(edrpou)));
      const rows = await collectContracts(bucket, state, edrpou, window, window.from, window.to);

      if (org) await upsertOrgs(env.DB, [org]);
      await upsertDocuments(env.DB, rows);
      state.documents += rows.length;
      state.consecutiveFailures = 0;
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
      const reason = `${edrpou}: ${failure(error)}`;
      await markSync(env.DB, {
        key,
        kind: "contracts",
        period: window.period,
        status: "error",
        error: reason,
      });
      noteFailure(state, reason);
    }
    await pause(SOURCE_PAUSE_MS);
  }

  const batches = chunk(orgs, MAX_PAYERS_PER_REQUEST);
  for (const batch of batches) {
    if (state.stopped || outOfBudget(state)) break;

    const key = batchKey(window.period, batch);
    if (await isSettled(env.DB, key, settledFor)) {
      skipped.push(key);
      continue;
    }

    await markSync(env.DB, { key, kind: "transactions", period: window.period, status: "running" });
    try {
      const payload = await fetchJson<unknown>(transactionsUrl(batch, window.from, window.to), {
        onBody: async (body) => {
          state.archivedBytes += await archiveRaw(
            bucket,
            `spending/transactions/${window.period}/${key.split(":").at(-1) ?? "batch"}.json.gz`,
            body,
          );
        },
      });

      const rows = asRows(payload)
        .map(transactionRow)
        .filter((row): row is TransactionRow => row !== null);

      await upsertTransactions(env.DB, rows);
      state.transactions += rows.length;
      state.consecutiveFailures = 0;
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
      const reason = `${batch.join(",")}: ${failure(error)}`;
      await markSync(env.DB, {
        key,
        kind: "transactions",
        period: window.period,
        status: "error",
        error: reason,
      });
      noteFailure(state, reason);
    }
    await pause(SOURCE_PAUSE_MS);
  }

  if (!state.stopped) {
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
  }

  const report: SpendingRunReport = {
    period: window.period,
    orgs: orgs.length,
    documents: state.documents,
    transactions: state.transactions,
    archivedBytes: state.archivedBytes,
    skipped,
    failed,
    stopped: state.stopped,
  };
  apiLog.info("spending: прогін завершено", { ...report, skipped: skipped.length });
  return report;
}
