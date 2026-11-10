/**
 * Рядки домену в D1: розпорядники, довідники, договори й платежі.
 *
 * Запис — `INSERT … ON CONFLICT DO UPDATE` за ключем джерела (`id`, `edrpou`),
 * порожнє поле не затирає відоме. Платіж пише лише зміни: `WHERE` у
 * `DO UPDATE` лишає незмінений рядок без жодного запису.
 * @module api-dev/src/services/spending/upserts
 */

import type { CounterpartyRow, DocumentRow, OrgRow, TransactionRow } from "./normalize";
import { runBatched } from "./store";

export async function upsertOrgs(db: D1Database, rows: readonly OrgRow[]): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_orgs
           (edrpou, name, form, kopfg, koatuu, kved, org_type, parent_edrpou,
            region, city, address, phone, email, registered_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(edrpou) DO UPDATE SET
           name = excluded.name,
           form = excluded.form,
           kopfg = excluded.kopfg,
           koatuu = excluded.koatuu,
           kved = excluded.kved,
           org_type = excluded.org_type,
           parent_edrpou = excluded.parent_edrpou,
           region = excluded.region,
           city = excluded.city,
           address = excluded.address,
           phone = excluded.phone,
           email = excluded.email,
           registered_at = excluded.registered_at,
           updated_at = datetime('now')`,
      )
      .bind(
        row.edrpou,
        row.name,
        row.form,
        row.kopfg,
        row.koatuu,
        row.kved,
        row.orgType,
        row.parentEdrpou,
        row.region,
        row.city,
        row.address,
        row.phone,
        row.email,
        row.registeredAt,
      ),
  );
  await runBatched(db, statements);
}

/** Довідник областей: 27 рядків на прогін, тому перезапис цілком — це норма. */
export async function upsertRegions(
  db: D1Database,
  rows: readonly { code: string; name: string; koatuu: string }[],
): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_regions (code, name, koatuu) VALUES (?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET
           name = excluded.name,
           koatuu = excluded.koatuu,
           synced_at = datetime('now')`,
      )
      .bind(row.code, row.name, row.koatuu),
  );
  await runBatched(db, statements);
}

/**
 * Каталог контрагентів: порожнє поле не затирає відоме.
 *
 * Платіж дає лише код і назву, договір — ще й місто; без `CASE` другий запис
 * стер би адресу, яку приніс перший.
 */
export async function upsertCounterparties(
  db: D1Database,
  rows: readonly CounterpartyRow[],
): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_counterparties (edrpou, name, city, region) VALUES (?, ?, ?, ?)
         ON CONFLICT(edrpou) DO UPDATE SET
           name = CASE WHEN excluded.name <> '' THEN excluded.name
                       ELSE spending_counterparties.name END,
           city = CASE WHEN excluded.city <> '' THEN excluded.city
                       ELSE spending_counterparties.city END,
           region = CASE WHEN excluded.region <> '' THEN excluded.region
                         ELSE spending_counterparties.region END,
           updated_at = datetime('now')`,
      )
      .bind(row.edrpou, row.name, row.city, row.region),
  );
  await runBatched(db, statements);
}

export async function upsertDocuments(db: D1Database, rows: readonly DocumentRow[]): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_documents
           (id, edrpou, kind, number, document_date, sign_date, amount, currency, subject, cpv, contractors)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           edrpou = excluded.edrpou,
           kind = excluded.kind,
           number = excluded.number,
           document_date = excluded.document_date,
           currency = excluded.currency,
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

/**
 * Колонки платежу й поля рядка: один список живить і `SET`, і `WHERE`.
 *
 * Дві копії списку розійшлися б на першій же новій колонці: рядок або
 * перестав би оновлюватись, або писався б дарма при кожному прогоні.
 */
const TRANSACTION_FIELDS = [
  ["payer_edrpou", "payerEdrpou"],
  ["payer_name", "payerName"],
  ["recipt_edrpou", "reciptEdrpou"],
  ["recipt_name", "reciptName"],
  ["trans_date", "transDate"],
  ["currency", "currency"],
  ["amount", "amount"],
  ["payment_details", "paymentDetails"],
  ["kekv", "kekv"],
  ["kpk", "kpk"],
  ["budget_code", "budgetCode"],
  ["contract_id", "contractId"],
  ["contract_number", "contractNumber"],
  ["source_name", "sourceName"],
  ["region_code", "regionCode"],
] as const satisfies readonly (readonly [string, keyof TransactionRow])[];

const TRANSACTION_COLUMNS = TRANSACTION_FIELDS.map(([column]) => column);

const TRANSACTION_INSERT = `INSERT INTO spending_transactions
           (id, ${TRANSACTION_COLUMNS.join(", ")})
         VALUES (?, ${TRANSACTION_COLUMNS.map(() => "?").join(", ")})
         ON CONFLICT(id) DO UPDATE SET
           ${TRANSACTION_COLUMNS.map((column) => `${column} = excluded.${column}`).join(",\n           ")},
           fetched_at = datetime('now')
         WHERE ${TRANSACTION_COLUMNS.map(
           (column) => `spending_transactions.${column} IS NOT excluded.${column}`,
         ).join("\n            OR ")}`;

/**
 * Платіж лягає в базу, лише коли його поля справді змінились: `WHERE` у
 * `DO UPDATE` робить незмінений рядок нульовою ціною. `fetched_at` тут —
 * момент останньої **зміни** рядка джерелом, а не останнього прогону.
 */
export async function upsertTransactions(
  db: D1Database,
  rows: readonly TransactionRow[],
): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(TRANSACTION_INSERT)
      .bind(row.id, ...TRANSACTION_FIELDS.map(([, field]) => row[field] as string | number)),
  );
  await runBatched(db, statements);
}
