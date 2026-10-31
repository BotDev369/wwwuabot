/**
 * Сирий запис джерела → рядок D1. Тут немає ні мережі, ні бази: лише форма.
 *
 * Поля читаються терпимо (`str` / `num`): джерело віддає `null` там, де
 * значення немає, і мовчазний `NaN` у сумі був би гіршим за нуль. Повний
 * сирий JSON лежить у R2 — тож втрачене при нормалізації завжди видно.
 * @module api-dev/src/services/spending/normalize
 */

/** Сирий об'єкт джерела: набір полів у нього не фіксований і може рости. */
export type RawRecord = Record<string, unknown>;

/** Межа на довгий текст призначення платежу: решта — в архіві R2. */
const MAX_DETAILS = 2000;

/** Рядок — те, що вже є рядком, або число; усе інше — порожньо. */
export function str(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/** Число — лише скінченне; `null`, `"abc"` і порожнеча дають `0`. */
export function num(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function cut(value: string): string {
  return value.length > MAX_DETAILS ? value.slice(0, MAX_DETAILS) : value;
}

export interface OrgRow {
  readonly edrpou: string;
  readonly name: string;
  readonly form: string;
  readonly kopfg: string;
  readonly koatuu: string;
  readonly kved: string;
}

export interface DocumentRow {
  readonly id: string;
  readonly edrpou: string;
  readonly kind: string;
  readonly number: string;
  readonly documentDate: string;
  readonly signDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly subject: string;
  readonly cpv: string;
  readonly contractors: string;
}

export interface TransactionRow {
  readonly id: string;
  readonly payerEdrpou: string;
  readonly payerName: string;
  readonly reciptEdrpou: string;
  readonly reciptName: string;
  readonly transDate: string;
  readonly amount: number;
  readonly currency: string;
  readonly paymentDetails: string;
  readonly kekv: string;
  readonly kpk: string;
  readonly budgetCode: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly sourceName: string;
}

/** Контрагент договору: `identifier` буває `HIDDEN` — це ознака джерела, не дефект. */
function contractorRow(raw: RawRecord): { identifier: string; name: string; kind: number } {
  return {
    identifier: str(raw.identifier) || str(raw.edrpou),
    name: str(raw.name),
    kind: num(raw.contractorType),
  };
}

/** Довідник розпорядника; `null`, коли відповідь без ЄДРПОУ. */
export function orgRow(raw: RawRecord): OrgRow | null {
  const edrpou = str(raw.edrpou);
  if (!edrpou) return null;
  return {
    edrpou,
    name: str(raw.orgName),
    form: str(raw.orgForm),
    kopfg: str(raw.kopfg),
    koatuu: str(raw.koatuu),
    kved: str(raw.kved),
  };
}

/** Договір (або інший документ тієї самої форми); `null`, коли немає `id`. */
export function documentRow(raw: RawRecord, kind: string): DocumentRow | null {
  const id = str(raw.id);
  if (!id) return null;

  const items = Array.isArray(raw.procurementItems) ? raw.procurementItems : [];
  const first = items[0];
  const contractors = Array.isArray(raw.contractors)
    ? raw.contractors.filter((item): item is RawRecord => typeof item === "object" && item !== null)
    : [];

  return {
    id,
    edrpou: str(raw.edrpou),
    kind,
    number: str(raw.documentNumber),
    documentDate: str(raw.documentDate),
    signDate: str(raw.signDate),
    amount: num(raw.amount),
    currency: str(raw.currency) || "UAH",
    subject: cut(str(raw.subject)),
    cpv: typeof first === "object" && first !== null ? str((first as RawRecord).cpvCode) : "",
    contractors: JSON.stringify(contractors.map(contractorRow)),
  };
}

/** Платіж казначейства; `null`, коли немає `id`. */
export function transactionRow(raw: RawRecord): TransactionRow | null {
  const id = str(raw.id);
  if (!id) return null;
  return {
    id,
    payerEdrpou: str(raw.payer_edrpou),
    payerName: str(raw.payer_name),
    reciptEdrpou: str(raw.recipt_edrpou),
    reciptName: str(raw.recipt_name),
    transDate: str(raw.trans_date),
    amount: num(raw.amount),
    currency: str(raw.currency) || "UAH",
    paymentDetails: cut(str(raw.payment_details)),
    kekv: str(raw.kekv),
    kpk: str(raw.kpk),
    budgetCode: str(raw.budget_code) || str(raw.budgetCode),
    contractId: str(raw.contractId) || str(raw.contract_id),
    contractNumber: str(raw.contractNumber) || str(raw.contract_number),
    sourceName: str(raw.source_name),
  };
}
