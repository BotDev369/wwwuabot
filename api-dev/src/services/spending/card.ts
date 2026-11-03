/**
 * Картка розпорядника для `CONTENT_KV`: три суми за період, не перелік.
 *
 * Картка — кеш із TTL доби, а не джерело правди: істина в D1, тож її втрата
 * нічого не ламає. Суми рахуються запитами до `spending_documents` і
 * `spending_transactions`, а не з прочитаного в пам'яті.
 * @module api-dev/src/services/spending/card
 */

import type { MonthWindow } from "./config";

export interface Totals {
  readonly count: number;
  readonly amount: number;
}

export interface OrgCard {
  readonly edrpou: string;
  readonly name: string;
  readonly form: string;
  readonly koatuu: string;
  readonly period: string;
  readonly documents: Totals;
  readonly payments: Totals;
  readonly receipts: Totals;
  readonly updatedAt: string;
}

async function totals(db: D1Database, sql: string, args: unknown[]): Promise<Totals> {
  const row = await db
    .prepare(sql)
    .bind(...args)
    .first<{ count: number; amount: number }>();
  return { count: Number(row?.count ?? 0), amount: Number(row?.amount ?? 0) };
}

/** Картка для KV: суми за період, а не перелік платежів. */
export async function buildOrgCard(
  db: D1Database,
  edrpou: string,
  window: MonthWindow,
): Promise<OrgCard> {
  const org = await db
    .prepare("SELECT name, form, koatuu FROM spending_orgs WHERE edrpou = ?")
    .bind(edrpou)
    .first<{ name: string; form: string; koatuu: string }>();

  const range = [edrpou, window.from, window.to];
  return {
    edrpou,
    name: org?.name ?? "",
    form: org?.form ?? "",
    koatuu: org?.koatuu ?? "",
    period: window.period,
    documents: await totals(
      db,
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM spending_documents
        WHERE edrpou = ? AND document_date >= ? AND document_date <= ?`,
      range,
    ),
    payments: await totals(
      db,
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM spending_transactions
        WHERE payer_edrpou = ? AND trans_date >= ? AND trans_date <= ?`,
      range,
    ),
    receipts: await totals(
      db,
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM spending_transactions
        WHERE recipt_edrpou = ? AND trans_date >= ? AND trans_date <= ?`,
      range,
    ),
    updatedAt: new Date().toISOString(),
  };
}
