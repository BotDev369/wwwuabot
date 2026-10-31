/**
 * Є-data: форма того, що панель читає з `api-dev`.
 *
 * Типи живуть тут, а не в контролері, бо контракт мають дві сторони — сервер і
 * адмінка; копія в кожного розійшлася б на першій же зміні поля.
 * @module @wwwuabot/shared/spending
 */

/** Сума й кількість рядків за зріз: те, що показує колонка таблиці. */
export interface SpendingTotals {
  readonly count: number;
  readonly amount: number;
}

/** Розпорядник із трьома сумами за період: договори, сплати, надходження. */
export interface SpendingOrg {
  readonly edrpou: string;
  readonly name: string;
  readonly form: string;
  readonly koatuu: string;
  readonly documents: SpendingTotals;
  readonly payments: SpendingTotals;
  readonly receipts: SpendingTotals;
}

export type SpendingSyncStatus = "running" | "ok" | "error";

/** Стан кроку збору: `error` лишається при рядку, поки прогін не повторить крок. */
export interface SpendingSyncRow {
  readonly key: string;
  readonly kind: string;
  readonly period: string;
  readonly status: SpendingSyncStatus;
  readonly rows: number;
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly error: string;
}

/**
 * Довідка джерела `lastload` без розбору: форма її відповіді не описана, тож
 * показуємо те, що прийшло, а не власне тлумачення чужого формату.
 */
export interface SpendingLastLoad {
  readonly fetchedAt: string;
  readonly raw: unknown;
}

/** Усе для першого екрана: період, свіжість, розпорядники й стан збору. */
export interface SpendingOverview {
  /** `null` — жодного завершеного прогону: показувати «не збирали», а не нулі. */
  readonly period: string | null;
  readonly from: string | null;
  readonly to: string | null;
  /** Коли завершився збір за цей період; не дата даних у джерелі. */
  readonly capturedAt: string | null;
  readonly lastLoad: SpendingLastLoad | null;
  readonly orgs: readonly SpendingOrg[];
  readonly sync: readonly SpendingSyncRow[];
}

/** Сторона договору; `identifier` буває `HIDDEN` — це ознака джерела. */
export interface SpendingContractor {
  readonly identifier: string;
  readonly name: string;
  readonly kind: number;
}

export interface SpendingDocument {
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
  readonly contractors: readonly SpendingContractor[];
}

export interface SpendingTransaction {
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

/** Сторінка списку; `nextCursor` порожній, коли більше немає. */
export interface SpendingPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

/** Стан збору окремо: його читають і коли даних за період ще немає. */
export interface SpendingSyncView {
  readonly period: string | null;
  readonly rows: readonly SpendingSyncRow[];
  readonly lastLoad: SpendingLastLoad | null;
}

/**
 * Роль розпорядника в платежі. Третій варіант («будь-яка») навмисно не
 * заведений: змішати платника й отримувача в одному списку — це подвоїти суму
 * там, де обидві сторони з нашої громади.
 */
export type SpendingRole = "payer" | "recipt";

export interface SpendingCursor {
  readonly date: string;
  readonly id: string;
}

/** Курсор пагінації: остання пара «дата + id» одним рядком. */
export function encodeCursor(date: string, id: string): string {
  return `${encodeURIComponent(date)}|${encodeURIComponent(id)}`;
}

/** Розбір курсора; `null` — курсор зіпсований, тобто клієнт прислав не те. */
export function decodeCursor(raw: string | null | undefined): SpendingCursor | null {
  if (!raw) return null;
  const separator = raw.indexOf("|");
  if (separator <= 0) return null;
  try {
    const date = decodeURIComponent(raw.slice(0, separator));
    const id = decodeURIComponent(raw.slice(separator + 1));
    return date && id ? { date, id } : null;
  } catch {
    return null;
  }
}

/** `YYYY-MM` — єдиний період, який розуміє джерело. */
export function isPeriod(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
