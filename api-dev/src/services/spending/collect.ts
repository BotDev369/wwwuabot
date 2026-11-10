/**
 * Прогін колектора Є-data за один місяць: довідники, договори, платежі, архів.
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
  MAX_CONSECUTIVE_FAILURES,
  MAX_PAYERS_PER_REQUEST,
  REFRESH_AFTER_MS,
  REGIONS_SYNC_KEY,
  RUN_BUDGET_MS,
  SEED_ORGS,
  SOURCE_PAUSE_MS,
  type MonthWindow,
  batchKey,
  cardKey,
  chunk,
  monthWindow,
  receiptsKey,
} from "./config";
import { buildOrgCard } from "./card";
import { refreshRange } from "./range";
import { collectContracts } from "./documents";
import {
  type CounterpartyRow,
  type RawRecord,
  orgRow,
  paymentCounterparties,
  regionRow,
  transactionRow,
} from "./normalize";
import { saveCounterparties } from "./parties";
import {
  disposerUrl,
  fetchJson,
  lastLoadUrl,
  pause,
  receiptsUrl,
  regionsUrl,
  transactionsUrl,
} from "./source";
import { archiveRaw, ensureSpendingTables, isSettled, markSync } from "./store";
import { upsertDocuments, upsertOrgs, upsertRegions, upsertTransactions } from "./upserts";

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
  readonly receipts: number;
  readonly archivedBytes: number;
  readonly skipped: readonly string[];
  readonly failed: readonly string[];
  /** Причина, з якої прогін спинився достроково; `null` — пройшов увесь. */
  readonly stopped: string | null;
}

interface RunState {
  readonly deadline: number;
  /** Скільки живе зібране; `undefined` — ручний запуск перечитує все. */
  readonly settledFor: number | undefined;
  consecutiveFailures: number;
  stopped: string | null;
  documents: number;
  transactions: number;
  receipts: number;
  archivedBytes: number;
  parties: CounterpartyRow[];
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

/**
 * Довідник областей: 27 рядків, один запит на прогін.
 *
 * Збій довідника не рахується як збій прогону: платежі з `region_code` і без
 * назви області лишаються читабельними, а наступний прогін добере довідник.
 */
async function collectRegions(env: Env, state: RunState, window: MonthWindow): Promise<void> {
  if (await isSettled(env.DB, REGIONS_SYNC_KEY, state.settledFor)) return;
  await markSync(env.DB, {
    key: REGIONS_SYNC_KEY,
    kind: "regions",
    period: window.period,
    status: "running",
  });

  try {
    const payload = await fetchJson<unknown>(regionsUrl());
    const rows = asRows(payload)
      .map(regionRow)
      .filter((row): row is { code: string; name: string; koatuu: string } => row !== null);
    await upsertRegions(env.DB, rows);
    await markSync(env.DB, {
      key: REGIONS_SYNC_KEY,
      kind: "regions",
      period: window.period,
      status: "ok",
      rows: rows.length,
    });
  } catch (error) {
    apiLog.error("spending: довідник областей не прийшов", error);
    await markSync(env.DB, {
      key: REGIONS_SYNC_KEY,
      kind: "regions",
      period: window.period,
      status: "error",
      error: failure(error),
    });
  }
}

/** Договори й картка розпорядника: власний `try` на кожного, щоб один не з'їв решту. */
async function collectOrg(
  env: Env,
  bucket: R2Bucket,
  state: RunState,
  window: MonthWindow,
  edrpou: string,
): Promise<void> {
  const key = `org:${edrpou}:${window.period}`;
  await markSync(env.DB, { key, kind: "contracts", period: window.period, status: "running" });

  const org = orgRow(await fetchJson<RawRecord>(disposerUrl(edrpou)));
  const contracts = await collectContracts(bucket, state, edrpou, window, window.from, window.to);

  if (org) await upsertOrgs(env.DB, [org]);
  await upsertDocuments(env.DB, contracts.documents);
  state.parties.push(...contracts.parties);
  state.documents += contracts.documents.length;
  await markSync(env.DB, {
    key,
    kind: "contracts",
    period: window.period,
    status: "ok",
    rows: contracts.documents.length,
  });
}

/**
 * Пачка платежів за один бік: `payers_edrpous` — сплати, `recipt_edrpous` —
 * надходження. Рядки лягають в одну таблицю: `id` у джерела той самий, тож
 * платіж усередині громади не задвоїться.
 */
async function collectPayments(
  env: Env,
  bucket: R2Bucket,
  state: RunState,
  window: MonthWindow,
  batch: readonly string[],
  key: string,
  kind: "transactions" | "receipts",
): Promise<number> {
  const url =
    kind === "receipts"
      ? receiptsUrl(batch, window.from, window.to)
      : transactionsUrl(batch, window.from, window.to);
  const signature = key.split(":").at(-1) ?? "batch";
  const archiveKey = `spending/${kind === "receipts" ? "recipts" : "transactions"}/${window.period}/${signature}.json.gz`;

  await markSync(env.DB, { key, kind, period: window.period, status: "running" });
  const payload = await fetchJson<unknown>(url, {
    onBody: async (body) => {
      state.archivedBytes += await archiveRaw(bucket, archiveKey, body);
    },
  });

  const rows = asRows(payload)
    .map(transactionRow)
    .filter((row) => row !== null);
  await upsertTransactions(env.DB, rows);
  state.parties.push(...rows.flatMap(paymentCounterparties));
  await markSync(env.DB, {
    key,
    kind,
    period: window.period,
    status: "ok",
    rows: rows.length,
  });
  return rows.length;
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
    settledFor: options.force ? undefined : REFRESH_AFTER_MS,
    consecutiveFailures: 0,
    stopped: null,
    documents: 0,
    transactions: 0,
    receipts: 0,
    archivedBytes: 0,
    parties: [],
  };

  await collectRegions(env, state, window);

  for (const edrpou of orgs) {
    if (state.stopped || outOfBudget(state)) break;

    const key = `org:${edrpou}:${window.period}`;
    if (await isSettled(env.DB, key, state.settledFor)) {
      skipped.push(edrpou);
      continue;
    }

    try {
      await collectOrg(env, bucket, state, window, edrpou);
      state.consecutiveFailures = 0;
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
  for (const kind of ["transactions", "receipts"] as const) {
    for (const batch of batches) {
      if (state.stopped || outOfBudget(state)) break;

      const key =
        kind === "receipts" ? receiptsKey(window.period, batch) : batchKey(window.period, batch);
      if (await isSettled(env.DB, key, state.settledFor)) {
        skipped.push(key);
        continue;
      }

      try {
        const count = await collectPayments(env, bucket, state, window, batch, key, kind);
        state[kind] += count;
        state.consecutiveFailures = 0;
      } catch (error) {
        failed.push(key);
        apiLog.error(`spending: ${kind} ${key} не зібрано`, error);
        const reason = `${batch.join(",")}: ${failure(error)}`;
        await markSync(env.DB, {
          key,
          kind,
          period: window.period,
          status: "error",
          error: reason,
        });
        noteFailure(state, reason);
      }
      await pause(SOURCE_PAUSE_MS);
    }
  }

  const counterparties = await saveCounterparties(env.DB, state.parties);

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

  // Межі дат зсуваються лише від нових рядків, тож кеш оновлює синк, а не екран.
  if (!state.stopped) {
    try {
      await refreshRange(env);
    } catch (error) {
      apiLog.error("spending: межі дат у KV не оновлено", error);
    }
  }

  const report: SpendingRunReport = {
    period: window.period,
    orgs: orgs.length,
    documents: state.documents,
    transactions: state.transactions,
    receipts: state.receipts,
    archivedBytes: state.archivedBytes,
    skipped,
    failed,
    stopped: state.stopped,
  };
  apiLog.info("spending: прогін завершено", { ...report, skipped: skipped.length, counterparties });
  return report;
}
