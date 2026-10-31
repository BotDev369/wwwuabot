/**
 * Читання зібраного Є-data: картки розпорядників, списки й стан збору.
 *
 * Запису тут немає — його робить колектор (`store.ts`). KV так само не
 * джерело: картки в ньому це кеш із TTL доби, а істина — рядки D1.
 * @module api-dev/src/services/spending/read
 */

import {
  encodeCursor,
  type SpendingContractor,
  type SpendingCursor,
  type SpendingDocument,
  type SpendingLastLoad,
  type SpendingOrg,
  type SpendingPage,
  type SpendingRole,
  type SpendingSyncRow,
  type SpendingTotals,
  type SpendingTransaction,
} from "@wwwuabot/shared/spending";
import { LASTLOAD_KEY, monthWindow } from "./config";

/** Стеля стану збору: кроків на період десятки, а не тисячі. */
const SYNC_LIMIT = 200;

const ZERO: SpendingTotals = { count: 0, amount: 0 };

interface SyncDbRow {
  key: string;
  kind: string;
  period: string;
  status: string;
  rows: number;
  started_at: string;
  finished_at: string | null;
  error: string;
}

interface TotalsDbRow {
  edrpou: string;
  count: number;
  amount: number;
}

interface DocumentDbRow {
  id: string;
  edrpou: string;
  kind: string;
  number: string;
  document_date: string;
  sign_date: string;
  amount: number;
  currency: string;
  subject: string;
  cpv: string;
  contractors: string;
}

interface TransactionDbRow {
  id: string;
  payer_edrpou: string;
  payer_name: string;
  recipt_edrpou: string;
  recipt_name: string;
  trans_date: string;
  amount: number;
  currency: string;
  payment_details: string;
  kekv: string;
  kpk: string;
  budget_code: string;
  contract_id: string;
  contract_number: string;
  source_name: string;
}

/** Невідомий статус читаємо як `running`: він не каже «готово» даремно. */
function toSyncRow(row: SyncDbRow): SpendingSyncRow {
  const status = row.status === "ok" || row.status === "error" ? row.status : "running";
  return {
    key: row.key,
    kind: row.kind,
    period: row.period,
    status,
    rows: Number(row.rows ?? 0),
    startedAt: row.started_at ?? "",
    finishedAt: row.finished_at ?? null,
    error: row.error ?? "",
  };
}

/** Період, за який є хоч один завершений крок; `null` — збору ще не було. */
export async function latestPeriod(db: D1Database): Promise<string | null> {
  const row = await db
    .prepare("SELECT MAX(period) AS period FROM spending_sync WHERE status = 'ok' AND period <> ''")
    .first<{ period: string | null }>();
  return row?.period ?? null;
}

export async function readSyncRows(
  db: D1Database,
  period?: string | null,
): Promise<SpendingSyncRow[]> {
  const columns =
    "SELECT key, kind, period, status, rows, started_at, finished_at, error FROM spending_sync";
  const statement = period
    ? db.prepare(`${columns} WHERE period = ? ORDER BY key LIMIT ?`).bind(period, SYNC_LIMIT)
    : db.prepare(`${columns} ORDER BY period DESC, key LIMIT ?`).bind(SYNC_LIMIT);
  const result = await statement.all<SyncDbRow>();
  return (result.results ?? []).map(toSyncRow);
}

/** Дату завантаження джерела зберігає колектор; тут лише її форма. */
export async function readLastLoad(kv: KVNamespace | undefined): Promise<SpendingLastLoad | null> {
  if (!kv) return null;
  const stored = (await kv.get(LASTLOAD_KEY, "json")) as {
    fetchedAt?: unknown;
    payload?: unknown;
  } | null;
  if (!stored) return null;
  return {
    fetchedAt: typeof stored.fetchedAt === "string" ? stored.fetchedAt : "",
    raw: stored.payload ?? null,
  };
}

async function grouped(
  db: D1Database,
  sql: string,
  args: readonly unknown[],
): Promise<Map<string, SpendingTotals>> {
  const result = await db
    .prepare(sql)
    .bind(...args)
    .all<TotalsDbRow>();
  const map = new Map<string, SpendingTotals>();
  for (const row of result.results ?? []) {
    if (!row.edrpou) continue;
    map.set(row.edrpou, { count: Number(row.count ?? 0), amount: Number(row.amount ?? 0) });
  }
  return map;
}

/**
 * Картки всіх розпорядників за період: три згруповані запити, а не три на
 * кожного — інакше дванадцять кодів дали б тридцять шість запитів на екран.
 */
export async function readOrgs(db: D1Database, period: string): Promise<SpendingOrg[]> {
  const window = monthWindow(period);
  const range = [window.from, window.to];
  const [orgs, documents, payments, receipts] = await Promise.all([
    db.prepare("SELECT edrpou, name, form, koatuu FROM spending_orgs ORDER BY name").all<{
      edrpou: string;
      name: string;
      form: string;
      koatuu: string;
    }>(),
    grouped(
      db,
      `SELECT edrpou, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM spending_documents WHERE document_date >= ? AND document_date <= ?
        GROUP BY edrpou`,
      range,
    ),
    grouped(
      db,
      `SELECT payer_edrpou AS edrpou, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM spending_transactions WHERE trans_date >= ? AND trans_date <= ?
        GROUP BY payer_edrpou`,
      range,
    ),
    grouped(
      db,
      `SELECT recipt_edrpou AS edrpou, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount
        FROM spending_transactions WHERE trans_date >= ? AND trans_date <= ? AND recipt_edrpou <> ''
        GROUP BY recipt_edrpou`,
      range,
    ),
  ]);

  return (orgs.results ?? []).map((org) => ({
    edrpou: org.edrpou,
    name: org.name,
    form: org.form,
    koatuu: org.koatuu,
    documents: documents.get(org.edrpou) ?? ZERO,
    payments: payments.get(org.edrpou) ?? ZERO,
    receipts: receipts.get(org.edrpou) ?? ZERO,
  }));
}

/** Контрагенти лежать JSON-рядком; битий вміст дає порожній список, не падіння. */
function parseContractors(raw: string): SpendingContractor[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .map((item) => ({
        identifier: String(item.identifier ?? ""),
        name: String(item.name ?? ""),
        kind: Number(item.kind ?? 0),
      }));
  } catch {
    return [];
  }
}

export interface DocumentQuery {
  readonly edrpou: string;
  readonly period: string | null;
  readonly limit: number;
  readonly cursor: SpendingCursor | null;
}

export interface TransactionQuery extends DocumentQuery {
  readonly role: SpendingRole;
}

/** Ключ пагінації один для обох списків: дата плюс `id` джерела. */
function pageOf<T>(
  rows: readonly T[],
  limit: number,
  key: (row: T) => SpendingCursor,
): { items: T[]; nextCursor: string | null } {
  const last = rows.length === limit ? rows[rows.length - 1] : undefined;
  return {
    items: [...rows],
    nextCursor: last ? encodeCursor(key(last).date, key(last).id) : null,
  };
}

export async function readDocuments(
  db: D1Database,
  query: DocumentQuery,
): Promise<SpendingPage<SpendingDocument>> {
  const where = ["edrpou = ?"];
  const args: unknown[] = [query.edrpou];
  if (query.period) {
    const window = monthWindow(query.period);
    where.push("document_date >= ? AND document_date <= ?");
    args.push(window.from, window.to);
  }
  if (query.cursor) {
    where.push("(document_date < ? OR (document_date = ? AND id < ?))");
    args.push(query.cursor.date, query.cursor.date, query.cursor.id);
  }

  const result = await db
    .prepare(
      `SELECT id, edrpou, kind, number, document_date, sign_date, amount, currency, subject, cpv, contractors
        FROM spending_documents WHERE ${where.join(" AND ")}
        ORDER BY document_date DESC, id DESC LIMIT ?`,
    )
    .bind(...args, query.limit)
    .all<DocumentDbRow>();

  const page = pageOf(result.results ?? [], query.limit, (row) => ({
    date: row.document_date,
    id: row.id,
  }));
  return {
    items: page.items.map((row) => ({
      id: row.id,
      edrpou: row.edrpou,
      kind: row.kind,
      number: row.number,
      documentDate: row.document_date,
      signDate: row.sign_date,
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      subject: row.subject,
      cpv: row.cpv,
      contractors: parseContractors(row.contractors),
    })),
    nextCursor: page.nextCursor,
  };
}

export async function readTransactions(
  db: D1Database,
  query: TransactionQuery,
): Promise<SpendingPage<SpendingTransaction>> {
  const column = query.role === "recipt" ? "recipt_edrpou" : "payer_edrpou";
  const where = [`${column} = ?`];
  const args: unknown[] = [query.edrpou];
  if (query.period) {
    const window = monthWindow(query.period);
    where.push("trans_date >= ? AND trans_date <= ?");
    args.push(window.from, window.to);
  }
  if (query.cursor) {
    where.push("(trans_date < ? OR (trans_date = ? AND id < ?))");
    args.push(query.cursor.date, query.cursor.date, query.cursor.id);
  }

  const result = await db
    .prepare(
      `SELECT id, payer_edrpou, payer_name, recipt_edrpou, recipt_name, trans_date, amount, currency,
        payment_details, kekv, kpk, budget_code, contract_id, contract_number, source_name
        FROM spending_transactions WHERE ${where.join(" AND ")}
        ORDER BY trans_date DESC, id DESC LIMIT ?`,
    )
    .bind(...args, query.limit)
    .all<TransactionDbRow>();

  const page = pageOf(result.results ?? [], query.limit, (row) => ({
    date: row.trans_date,
    id: row.id,
  }));
  return {
    items: page.items.map((row) => ({
      id: row.id,
      payerEdrpou: row.payer_edrpou,
      payerName: row.payer_name,
      reciptEdrpou: row.recipt_edrpou,
      reciptName: row.recipt_name,
      transDate: row.trans_date,
      amount: Number(row.amount ?? 0),
      currency: row.currency,
      paymentDetails: row.payment_details,
      kekv: row.kekv,
      kpk: row.kpk,
      budgetCode: row.budget_code,
      contractId: row.contract_id,
      contractNumber: row.contract_number,
      sourceName: row.source_name,
    })),
    nextCursor: page.nextCursor,
  };
}
