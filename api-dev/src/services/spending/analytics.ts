/**
 * Аналітика платежів: розріз за кодами й за отримувачами.
 *
 * Читає ті самі рядки, що вже зібрав колектор; вікно рахується від останньої
 * дати в базі, а не від годинника, інакше між cron і відповіддю джерела
 * панель показувала б нулі. Розрізи рахуються в пам'яті з одного читання.
 * @module api-dev/src/services/spending/analytics
 */

import type {
  SpendingBucket,
  SpendingCodeKind,
  SpendingCodeRow,
  SpendingCodes,
  SpendingRecipientRow,
  SpendingRecipients,
  SpendingScope,
  SpendingTotals,
} from "@wwwuabot/shared/spending";
import { monthWindow } from "./config";
import { readRange } from "./range";
import type { Env } from "../../shared/types";
import {
  bucketTotals,
  distinctCount,
  groupRows,
  loadWindow,
  type SpendingWindowRow,
  topGroups,
  totalsOf,
} from "./window";

/** Стеля рядків розрізу: решта коду — хвіст, який все одно не читають. */
const CODE_LIMIT = 100;
const RECIPIENT_LIMIT = 25;

const CODE_OF: Readonly<Record<SpendingCodeKind, (row: SpendingWindowRow) => string>> = {
  kekv: (row) => row.kekv,
  kpk: (row) => row.kpk,
  budget: (row) => row.budgetCode,
};

const ZERO: SpendingTotals = { count: 0, amount: 0 };

/** Перший день місяця, у якому стоїть дата. */
function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** Зсув на `delta` місяців: `Date.UTC` тримає місяці без переходів на літній час. */
function shiftMonths(date: string, delta: number): string {
  const [year, month] = date.slice(0, 7).split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return shifted.toISOString().slice(0, 10);
}

/** Усі місяці діапазону — ряд заповнюється нулями, а не пропусками. */
function monthsBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let cursor = monthStart(from); cursor <= to; cursor = shiftMonths(cursor, 1)) {
    keys.push(cursor.slice(0, 7));
  }
  return keys;
}

/** Усі дні діапазону; `Date.UTC` щоб не залежати від часової зони воркера. */
function daysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  for (let cursor = from; cursor <= to; cursor = nextDay(cursor)) keys.push(cursor);
  return keys;
}

function nextDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

/** Розріз за кодами платежу за конкретний місяць. */
export async function readCodes(db: D1Database, period: string | null): Promise<SpendingCodes> {
  if (!period) {
    return {
      period: null,
      from: null,
      to: null,
      totals: ZERO,
      kekv: [],
      kpk: [],
      budget: [],
    };
  }

  const window = monthWindow(period);
  const rows = await loadWindow(db, window.from, window.to);
  const codesOf = (kind: SpendingCodeKind): SpendingCodeRow[] =>
    topGroups(groupRows(rows, CODE_OF[kind]), CODE_LIMIT).map(({ key, totals }) => ({
      code: key,
      count: totals.count,
      amount: totals.amount,
    }));

  return {
    period,
    from: window.from,
    to: window.to,
    totals: totalsOf(rows),
    kekv: codesOf("kekv"),
    kpk: codesOf("kpk"),
    budget: codesOf("budget"),
  };
}

/** Вікно розрізу: для одного дня межа — дата, для решти — діапазон із базовим кроком. */
function windowOf(
  scope: SpendingScope,
  range: { from: string; to: string },
): { from: string; to: string; bucket: "month" | "day" } {
  switch (scope) {
    case "all":
      return { from: range.from, to: range.to, bucket: "month" };
    case "year":
      return { from: shiftMonths(monthStart(range.to), -11), to: range.to, bucket: "month" };
    case "month": {
      const window = monthWindow(range.to.slice(0, 7));
      return { from: window.from, to: window.to, bucket: "day" };
    }
    case "day":
      return { from: range.to, to: range.to, bucket: "day" };
  }
}

/** Дні й місяці без платежів лишаються в ряду нулями: пропуск читався б як розрив збору. */
function fillBuckets(
  keys: readonly string[],
  values: Map<string, { count: number; amount: number }>,
): SpendingBucket[] {
  return keys.map((key) => {
    const totals = values.get(key) ?? ZERO;
    return { key, count: totals.count, amount: totals.amount };
  });
}

/** Розріз за отримувачами: ряд у часі й топ за сумою, без пагінації. */
export async function readRecipients(env: Env, scope: SpendingScope): Promise<SpendingRecipients> {
  const range = await readRange(env);
  if (!range) {
    return {
      scope,
      from: null,
      to: null,
      bucket: "month",
      totals: { ...ZERO, recipients: 0 },
      buckets: [],
      rows: [],
    };
  }

  const window = windowOf(scope, range);
  const rows = await loadWindow(env.DB, window.from, window.to);

  const keys =
    window.bucket === "month"
      ? monthsBetween(window.from, window.to)
      : daysBetween(window.from, window.to);

  // Порожній ЄДРПОУ — це «не оприлюднено», а не отримувач: SQL відсікав його
  // умовою `recipt_edrpou <> ''`, і саме тому він не потрапляє в топ.
  const withRecipient = rows.filter((row) => row.reciptEdrpou !== "");
  const grouped = groupRows(
    withRecipient,
    (row) => row.reciptEdrpou,
    (row) => row.reciptName,
  );

  return {
    scope,
    from: window.from,
    to: window.to,
    bucket: window.bucket,
    totals: {
      ...totalsOf(rows),
      recipients: distinctCount(rows, (row) => row.reciptEdrpou),
    },
    buckets: fillBuckets(keys, bucketTotals(rows, window.bucket)),
    rows: topGroups(grouped, RECIPIENT_LIMIT).map(({ key, totals }) => ({
      edrpou: key,
      name: totals.max,
      count: totals.count,
      amount: totals.amount,
    })) satisfies SpendingRecipientRow[],
  };
}
