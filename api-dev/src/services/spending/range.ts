/**
 * Межі дат платежів: один скан на синк, а не на кожне відкриття розрізу.
 *
 * Діапазон змінюється лише тоді, коли синк дописав рядки, тож істинне джерело —
 * `MIN/MAX` після прогону, а гарячий шлях читає готову відповідь із KV.
 *
 * @module api-dev/src/services/spending/range
 */

import { DATA_RANGE_KEY } from "./config";
import type { Env } from "../../shared/types";

export interface DataRange {
  readonly from: string;
  readonly to: string;
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Значення з KV буває будь-чим: пошкоджене вважаємо промахом, а не даними. */
function parse(raw: unknown): DataRange | null {
  if (!raw || typeof raw !== "object") return null;
  const { from, to } = raw as Record<string, unknown>;
  if (typeof from !== "string" || typeof to !== "string") return null;
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || from > to) return null;
  return { from, to };
}

/**
 * Скан таблиці. Імена без `from`/`to`: це ключові слова SQL, і псевдонім
 * `AS from` валить запит у D1 (`near "from": syntax error`), а не повертає
 * порожнечу — саме так розріз за отримувачами віддавав 500 на проді.
 */
async function scan(db: D1Database): Promise<DataRange | null> {
  const row = await db
    .prepare(
      "SELECT MIN(trans_date) AS first_date, MAX(trans_date) AS last_date FROM spending_transactions",
    )
    .first<{ first_date: string | null; last_date: string | null }>();
  if (!row?.first_date || !row?.last_date) return null;
  return { from: row.first_date, to: row.last_date };
}

/** Межі даних: з KV, а на промаху — один скан і в кеш. */
export async function readRange(env: Env): Promise<DataRange | null> {
  const kv = env.CONTENT_KV;
  if (!kv) return scan(env.DB);

  const cached = parse(await kv.get(DATA_RANGE_KEY, "json"));
  if (cached) return cached;

  const range = await scan(env.DB);
  if (range) await kv.put(DATA_RANGE_KEY, JSON.stringify(range));
  return range;
}

/** Синк дописав рядки — межі могли зсунутись; порожня таблиця прибирає ключ. */
export async function refreshRange(env: Env): Promise<void> {
  const kv = env.CONTENT_KV;
  if (!kv) return;

  const range = await scan(env.DB);
  if (range) await kv.put(DATA_RANGE_KEY, JSON.stringify(range));
  else await kv.delete(DATA_RANGE_KEY);
}
