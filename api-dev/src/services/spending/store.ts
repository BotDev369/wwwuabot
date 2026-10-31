/**
 * Сховища колектора: D1 (рядки й курсор), R2 (сирі відповіді), KV (картки).
 *
 * Запис ідемпотентний: ключ рядка — `id` джерела, тому повторний прогін
 * оновлює запис, а не плодить дубль. Курсор живе в `spending_sync`, а не в
 * пам'яті: обірваний прогін продовжується з того місця, де спинився.
 * @module api-dev/src/services/spending/store
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { TableName } from "@wwwuabot/shared/database/tables";
import type { MonthWindow } from "./config";
import type { DocumentRow, OrgRow, TransactionRow } from "./normalize";

/** Таблиці цього домену — створюються раз, перед першим записом. */
export const SPENDING_TABLES = [
  "spending_orgs",
  "spending_documents",
  "spending_transactions",
  "spending_sync",
] as const satisfies readonly TableName[];

/** Скільки тверджень відправляти одним `batch`: більші пачки D1 рве по таймауту. */
const BATCH_SIZE = 50;

export async function ensureSpendingTables(db: D1Database): Promise<void> {
  await ensureTables(db, SPENDING_TABLES);
}

/** Стан кроку синхронізації; `ok` означає «цей період уже зібрано». */
export type SyncStatus = "running" | "ok" | "error";

export interface SyncUpdate {
  readonly key: string;
  readonly kind: string;
  readonly period: string;
  readonly status: SyncStatus;
  readonly rows?: number;
  readonly error?: string;
}

export async function isSettled(db: D1Database, key: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT status FROM spending_sync WHERE key = ?")
    .bind(key)
    .first<{ status: string }>();
  return row?.status === "ok";
}

export async function markSync(db: D1Database, update: SyncUpdate): Promise<void> {
  const finishedAt = update.status === "running" ? null : new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO spending_sync (key, kind, period, status, rows, finished_at, error)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         status = excluded.status,
         rows = excluded.rows,
         finished_at = excluded.finished_at,
         error = excluded.error`,
    )
    .bind(
      update.key,
      update.kind,
      update.period,
      update.status,
      update.rows ?? 0,
      finishedAt,
      update.error ?? "",
    )
    .run();
}

async function runBatched(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  for (let index = 0; index < statements.length; index += BATCH_SIZE) {
    await db.batch(statements.slice(index, index + BATCH_SIZE));
  }
}

export async function upsertOrgs(db: D1Database, rows: readonly OrgRow[]): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_orgs (edrpou, name, form, kopfg, koatuu, kved)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(edrpou) DO UPDATE SET
           name = excluded.name,
           form = excluded.form,
           kopfg = excluded.kopfg,
           koatuu = excluded.koatuu,
           kved = excluded.kved,
           updated_at = datetime('now')`,
      )
      .bind(row.edrpou, row.name, row.form, row.kopfg, row.koatuu, row.kved),
  );
  await runBatched(db, statements);
}

export async function upsertDocuments(
  db: D1Database,
  rows: readonly DocumentRow[],
): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_documents
           (id, edrpou, kind, number, document_date, sign_date, amount, currency, subject, cpv, contractors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           amount = excluded.amount,
           sign_date = excluded.sign_date,
           subject = excluded.subject,
           cpv = excluded.cpv,
           contractors = excluded.contractors,
           fetched_at = datetime('now')`,
      )
      .bind(
        row.id,
        row.edrpou,
        row.kind,
        row.number,
        row.documentDate,
        row.signDate,
        row.amount,
        row.currency,
        row.subject,
        row.cpv,
        row.contractors,
      ),
  );
  await runBatched(db, statements);
}

export async function upsertTransactions(
  db: D1Database,
  rows: readonly TransactionRow[],
): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_transactions
           (id, payer_edrpou, payer_name, recipt_edrpou, recipt_name, trans_date, amount, currency,
            payment_details, kekv, kpk, budget_code, contract_id, contract_number, source_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           amount = excluded.amount,
           payment_details = excluded.payment_details,
           contract_id = excluded.contract_id,
           fetched_at = datetime('now')`,
      )
      .bind(
        row.id,
        row.payerEdrpou,
        row.payerName,
        row.reciptEdrpou,
        row.reciptName,
        row.transDate,
        row.amount,
        row.currency,
        row.paymentDetails,
        row.kekv,
        row.kpk,
        row.budgetCode,
        row.contractId,
        row.contractNumber,
        row.sourceName,
      ),
  );
  await runBatched(db, statements);
}

/** Сира відповідь у R2: gzip, далі розбір не робить жодного запиту до джерела. */
export async function archiveRaw(
  bucket: R2Bucket,
  key: string,
  payload: unknown,
): Promise<number> {
  const body = new Response(JSON.stringify(payload)).body;
  if (!body) throw new Error(`R2: не вдалося стиснути «${key}».`);
  const gzipped = new Uint8Array(
    await new Response(body.pipeThrough(new CompressionStream("gzip"))).arrayBuffer(),
  );
  await bucket.put(key, gzipped, {
    httpMetadata: { contentType: "application/json", contentEncoding: "gzip" },
  });
  return gzipped.byteLength;
}

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
