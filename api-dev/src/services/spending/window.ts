/**
 * Рядки вікна й згортка в пам'яті: один прохід замість десятка `GROUP BY`.
 * Кожен розріз панелі читав ту саму таблицю окремим запитом зі сканом і двома
 * тимчасовими b-tree (див. `docs/D1_QUERY_COST.md`). Тут рядки читаються раз.
 * `ORDER BY rowid` тримає порядок `SUM()` SQLite, тож суми ті самі.
 * @module api-dev/src/services/spending/window
 */

/**
 * Рядок платежу, потрібний усім розрізам. Решти колонок таблиці (призначення,
 * договір, валюта) розрізи не бачать, тож і не читають.
 */
export interface SpendingWindowRow {
  readonly date: string;
  readonly amount: number;
  readonly kekv: string;
  readonly kpk: string;
  readonly budgetCode: string;
  readonly payerEdrpou: string;
  readonly payerName: string;
  readonly reciptEdrpou: string;
  readonly reciptName: string;
}

interface WindowDbRow {
  trans_date: string;
  amount: number;
  kekv: string;
  kpk: string;
  budget_code: string;
  payer_edrpou: string;
  payer_name: string;
  recipt_edrpou: string;
  recipt_name: string;
}

/** Сума й кількість: те, що раніше рахував `COUNT/SUM` у SQL. */
export interface WindowTotals {
  readonly count: number;
  readonly amount: number;
}

/** Група разом із `MAX`-підписом: отримувачу потрібна назва, коду — ні. */
export interface WindowGroup extends WindowTotals {
  readonly max: string;
}

export interface WindowBucket {
  readonly key: string;
  readonly count: number;
  readonly amount: number;
}

const COLUMNS =
  "trans_date, amount, kekv, kpk, budget_code, payer_edrpou, payer_name, recipt_edrpou, recipt_name";

/** Один запит на все вікно: скан таблиці дешевший за десять сканів. */
export async function loadWindow(
  db: D1Database,
  from: string,
  to: string,
): Promise<SpendingWindowRow[]> {
  const result = await db
    .prepare(
      `SELECT ${COLUMNS} FROM spending_transactions
        WHERE trans_date >= ? AND trans_date <= ? ORDER BY rowid`,
    )
    .bind(from, to)
    .all<WindowDbRow>();

  return (result.results ?? []).map((row) => ({
    date: row.trans_date,
    amount: Number(row.amount ?? 0),
    kekv: row.kekv ?? "",
    kpk: row.kpk ?? "",
    budgetCode: row.budget_code ?? "",
    payerEdrpou: row.payer_edrpou ?? "",
    payerName: row.payer_name ?? "",
    reciptEdrpou: row.recipt_edrpou ?? "",
    reciptName: row.recipt_name ?? "",
  }));
}

export function totalsOf(rows: readonly SpendingWindowRow[]): WindowTotals {
  let count = 0;
  let amount = 0;
  for (const row of rows) {
    count += 1;
    amount += row.amount;
  }
  return { count, amount };
}

/** Скільки різних ключів — `COUNT(DISTINCT …)` без другого проходу. */
export function distinctCount(
  rows: readonly SpendingWindowRow[],
  keyOf: (row: SpendingWindowRow) => string,
): number {
  const keys = new Set<string>();
  for (const row of rows) keys.add(keyOf(row));
  return keys.size;
}

/**
 * Групи за ключем. `maxOf` повторює `MAX(колонка)` — так підпис отримувача
 * лишається тим, що обрала б SQLite, а не «остання назва в рядку».
 */
export function groupRows(
  rows: readonly SpendingWindowRow[],
  keyOf: (row: SpendingWindowRow) => string,
  maxOf?: (row: SpendingWindowRow) => string,
): Map<string, WindowGroup> {
  const groups = new Map<string, WindowGroup>();
  for (const row of rows) {
    const key = keyOf(row);
    const one = groups.get(key) ?? { count: 0, amount: 0, max: "" };
    const value = maxOf ? maxOf(row) : "";
    groups.set(key, {
      count: one.count + 1,
      amount: one.amount + row.amount,
      max: value > one.max ? value : one.max,
    });
  }
  return groups;
}

/** Топ груп за сумою: `ORDER BY amount DESC LIMIT ?`, зі сталим порядком на рівних. */
export function topGroups(
  groups: Map<string, WindowGroup>,
  limit: number,
): Array<{ key: string; totals: WindowGroup }> {
  return [...groups.entries()]
    .sort((a, b) => {
      if (b[1].amount !== a[1].amount) return b[1].amount - a[1].amount;
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;
    })
    .slice(0, limit)
    .map(([key, totals]) => ({ key, totals }));
}

/** Ряд у часі: місяць — це `substr(trans_date, 1, 7)`, день — сама дата. */
export function bucketTotals(
  rows: readonly SpendingWindowRow[],
  bucket: "month" | "day",
): Map<string, WindowBucket> {
  const map = new Map<string, WindowBucket>();
  for (const row of rows) {
    const key = bucket === "month" ? row.date.slice(0, 7) : row.date;
    const one = map.get(key) ?? { key, count: 0, amount: 0 };
    map.set(key, { key, count: one.count + 1, amount: one.amount + row.amount });
  }
  return map;
}
