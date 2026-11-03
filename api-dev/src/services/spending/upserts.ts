/**
 * Рядки домену в D1: розпорядники, довідники, договори й платежі.
 *
 * Кожен запис — `INSERT … ON CONFLICT DO UPDATE`: ключ — ідентифікатор
 * джерела (`id` документа, `id` платежу, `edrpou`), тож повторний прогін
 * оновлює рядок. Порожнє поле ніколи не затирає відоме.
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

export async function upsertTransactions(
  db: D1Database,
  rows: readonly TransactionRow[],
): Promise<void> {
  const statements = rows.map((row) =>
    db
      .prepare(
        `INSERT INTO spending_transactions
           (id, payer_edrpou, payer_name, recipt_edrpou, recipt_name, trans_date, amount, currency,
            payment_details, kekv, kpk, budget_code, contract_id, contract_number, source_name,
            region_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payer_edrpou = excluded.payer_edrpou,
           payer_name = excluded.payer_name,
           recipt_edrpou = excluded.recipt_edrpou,
           recipt_name = excluded.recipt_name,
           trans_date = excluded.trans_date,
           currency = excluded.currency,
           amount = excluded.amount,
           payment_details = excluded.payment_details,
           kekv = excluded.kekv,
           kpk = excluded.kpk,
           budget_code = excluded.budget_code,
           contract_id = excluded.contract_id,
           contract_number = excluded.contract_number,
           source_name = excluded.source_name,
           region_code = excluded.region_code,
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
        row.regionCode,
      ),
  );
  await runBatched(db, statements);
}
