/**
 * Аналітика платежів: розріз за кодами й за отримувачами.
 *
 * Читає ті самі рядки, що вже зібрав колектор, і не робить жодного запиту до
 * джерела. Вікно рахується від останньої дати в базі, а не від годинника:
 * інакше між cron і відповіддю джерела панель показувала б нулі.
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

/** Стеля рядків розрізу: решта коду — хвіст, який все одно не читають. */
const CODE_LIMIT = 100;
const RECIPIENT_LIMIT = 25;

const CODE_COLUMNS: Readonly<Record<SpendingCodeKind, string>> = {
  kekv: "kekv",
  kpk: "kpk",
  budget: "budget_code",
};

const ZERO: SpendingTotals = { count: 0, amount: 0 };

interface RangeRow {
  from: string | null;
  to: string | null;
}

interface CodeDbRow {
  code: string;
  count: number;
  amount: number;
}

interface BucketDbRow {
  key: string;
  count: number;
  amount: number;
}

interface RecipientDbRow {
  edrpou: string;
  name: string;
  count: number;
  amount: number;
}

/** Остання дата платежу в базі; `null` — таблиця порожня. */
export async function dataRange(db: D1Database): Promise<{ from: string; to: string } | null> {
  const row = await db
    .prepare("SELECT MIN(trans_date) AS from, MAX(trans_date) AS to FROM spending_transactions")
    .first<RangeRow>();
  if (!row?.from || !row?.to) return null;
  return { from: row.from, to: row.to };
}

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

async function totalsOf(db: D1Database, from: string, to: string): Promise<SpendingTotals> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM spending_transactions WHERE trans_date >= ? AND trans_date <= ?`,
    )
    .bind(from, to)
    .first<{ count: number; amount: number }>();
  return { count: Number(row?.count ?? 0), amount: Number(row?.amount ?? 0) };
}

async function codeRows(
  db: D1Database,
  kind: SpendingCodeKind,
  from: string,
  to: string,
): Promise<SpendingCodeRow[]> {
  const column = CODE_COLUMNS[kind];
  const result = await db
    .prepare(
      `SELECT ${column} AS code, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM spending_transactions WHERE trans_date >= ? AND trans_date <= ?
        GROUP BY ${column} ORDER BY amount DESC LIMIT ?`,
    )
    .bind(from, to, CODE_LIMIT)
    .all<CodeDbRow>();
  return (result.results ?? []).map((row) => ({
    code: row.code ?? "",
    count: Number(row.count ?? 0),
    amount: Number(row.amount ?? 0),
  }));
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
  const [totals, kekv, kpk, budget] = await Promise.all([
    totalsOf(db, window.from, window.to),
    codeRows(db, "kekv", window.from, window.to),
    codeRows(db, "kpk", window.from, window.to),
    codeRows(db, "budget", window.from, window.to),
  ]);

  return { period, from: window.from, to: window.to, totals, kekv, kpk, budget };
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

async function bucketRows(
  db: D1Database,
  from: string,
  to: string,
  bucket: "month" | "day",
): Promise<Map<string, SpendingTotals>> {
  const key = bucket === "month" ? "substr(trans_date, 1, 7)" : "trans_date";
  const result = await db
    .prepare(
      `SELECT ${key} AS key, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM spending_transactions WHERE trans_date >= ? AND trans_date <= ? GROUP BY ${key}`,
    )
    .bind(from, to)
    .all<BucketDbRow>();
  const map = new Map<string, SpendingTotals>();
  for (const row of result.results ?? []) {
    map.set(row.key, { count: Number(row.count ?? 0), amount: Number(row.amount ?? 0) });
  }
  return map;
}

/** Дні й місяці без платежів лишаються в ряду нулями: пропуск читався б як розрив збору. */
function fillBuckets(
  keys: readonly string[],
  values: Map<string, SpendingTotals>,
): SpendingBucket[] {
  return keys.map((key) => {
    const totals = values.get(key) ?? ZERO;
    return { key, count: totals.count, amount: totals.amount };
  });
}

/** Розріз за отримувачами: ряд у часі й топ за сумою, без пагінації. */
export async function readRecipients(
  db: D1Database,
  scope: SpendingScope,
): Promise<SpendingRecipients> {
  const range = await dataRange(db);
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
  const [totalsRow, buckets, rows] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount,
          COUNT(DISTINCT recipt_edrpou) AS recipients
          FROM spending_transactions WHERE trans_date >= ? AND trans_date <= ?`,
      )
      .bind(window.from, window.to)
      .first<{ count: number; amount: number; recipients: number }>(),
    bucketRows(db, window.from, window.to, window.bucket),
    db
      .prepare(
        `SELECT recipt_edrpou AS edrpou, MAX(recipt_name) AS name, COUNT(*) AS count,
          COALESCE(SUM(amount), 0) AS amount
          FROM spending_transactions
          WHERE trans_date >= ? AND trans_date <= ? AND recipt_edrpou <> ''
          GROUP BY recipt_edrpou ORDER BY amount DESC LIMIT ?`,
      )
      .bind(window.from, window.to, RECIPIENT_LIMIT)
      .all<RecipientDbRow>(),
  ]);

  const keys =
    window.bucket === "month"
      ? monthsBetween(window.from, window.to)
      : daysBetween(window.from, window.to);

  return {
    scope,
    from: window.from,
    to: window.to,
    bucket: window.bucket,
    totals: {
      count: Number(totalsRow?.count ?? 0),
      amount: Number(totalsRow?.amount ?? 0),
      recipients: Number(totalsRow?.recipients ?? 0),
    },
    buckets: fillBuckets(keys, buckets),
    rows: (rows.results ?? []).map((row) => ({
      edrpou: row.edrpou,
      name: row.name ?? "",
      count: Number(row.count ?? 0),
      amount: Number(row.amount ?? 0),
    })) satisfies SpendingRecipientRow[],
  };
}
