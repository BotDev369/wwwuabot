/**
 * Підписи Є-data: гроші, дати, статуси й те, як рахується «нічого».
 *
 * Окремо від компонентів: це чисті функції (AGENTS.md §3), і саме вони
 * вирішують, що прочитає людина. Головне з них — `totalsText`: нуль означає
 * **«не оприлюднено»**, а не «не платили» (`docs/SPENDING.md` §5).
 * @module web-admin-dev/src/pages/spending/format
 */

import type {
  SpendingContractor,
  SpendingOrg,
  SpendingRole,
  SpendingSyncRow,
  SpendingSyncStatus,
  SpendingTotals,
  SpendingTransaction,
} from "@wwwuabot/shared/spending";

const MONTHS = [
  "січень",
  "лютий",
  "березень",
  "квітень",
  "травень",
  "червень",
  "липень",
  "серпень",
  "вересень",
  "жовтень",
  "листопад",
  "грудень",
];

/** `2026-09` → «вересень 2026»; невідомий формат лишається як прийшов. */
export function formatPeriod(period: string | null): string {
  if (!period) return "—";
  const [year, month] = period.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : period;
}

/** Сума в гривні джерела; валюта приходить колонкою, тож її й показуємо. */
export function formatMoney(amount: number, currency = "UAH"): string {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "UAH";
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCount(count: number): string {
  return new Intl.NumberFormat("uk-UA").format(count);
}

/** `2026-09-10` → `10.09.2026`; рядок ріжеться вручну, щоб не зсунути день. */
export function formatDate(value: string | null): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : "—";
}

/** Час із повною позначкою: `capturedAt` — це момент збору, не дата даних. */
export function formatStamp(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusLabel(status: SpendingSyncStatus): string {
  if (status === "ok") return "зібрано";
  if (status === "error") return "помилка";
  return "у процесі";
}

export function statusClass(status: SpendingSyncStatus): string {
  if (status === "ok") return "spend-status spend-status-ok";
  if (status === "error") return "spend-status spend-status-error";
  return "spend-status spend-status-running";
}

export function roleLabel(role: SpendingRole): string {
  return role === "recipt" ? "надходження" : "сплати";
}

/** Періоди зі стану збору — єдине джерело вибору місяця на екрані. */
export function periodsOf(rows: readonly SpendingSyncRow[]): string[] {
  const unique = new Set<string>();
  for (const row of rows) if (row.period) unique.add(row.period);
  return [...unique].sort().reverse();
}

/**
 * Дві сторони платежу — два різні числа, і сумувати їх не можна: коли
 * платник і отримувач обидва з громади, один платіж потрапив би в обидві
 * колонки (`docs/SPENDING.md` §5).
 */
export function totalsText(totals: SpendingTotals): string {
  if (totals.count === 0) return "не оприлюднено";
  return `${formatCount(totals.count)} · ${formatMoney(totals.amount)}`;
}

/** Контрагенти договору; `HIDDEN` — ознака джерела, а не порожній код. */
export function contractorNames(contractors: readonly SpendingContractor[]): string {
  const names = contractors.map((contractor) =>
    contractor.identifier === "HIDDEN"
      ? `${contractor.name || "контрагент"} (ідентифікатор прихований)`
      : contractor.name || contractor.identifier,
  );
  return names.filter(Boolean).join(", ") || "—";
}

/**
 * Крок збору людською мовою. `kind` — ключ колектора (`contracts`), і в
 * таблиці він не читається: адміну потрібен предмет, а не ім'я кроку в коді.
 */
const SYNC_KIND_LABELS: Readonly<Record<string, string>> = {
  contracts: "Договори",
  transactions: "Платежі",
  payments: "Платежі",
  orgs: "Розпорядники",
  lastload: "Довідка джерела",
};

export function syncKindLabel(kind: string): string {
  return SYNC_KIND_LABELS[kind] ?? kind;
}

/**
 * Що саме збирав крок: розпорядник за ЄДРПОУ або пачка платежів.
 *
 * Ключ (`org:04360586:2026-09`) — адреса кроку в базі, а не підпис: людині
 * потрібна назва розпорядника, і беремо її з того ж огляду, а не з ключа.
 */
export function syncStepSubject(row: SpendingSyncRow, orgs: readonly SpendingOrg[]): string {
  const [head, ...rest] = row.key.split(":");

  if (head === "org") {
    const edrpou = rest[0] ?? "";
    const org = orgs.find((item) => item.edrpou === edrpou);
    return org?.name || `ЄДРПОУ ${edrpou || "—"}`;
  }

  if (head === "transactions" || head === "payments") {
    const batch = (rest[1] ?? "").replace("batch-", "");
    return batch ? `пачка ${batch}` : "усі пачки";
  }

  return "";
}

/** Джерело з відповіді `lastload`: назва й дата його останнього завантаження. */
export interface LastLoadSource {
  readonly name: string;
  readonly date: string;
}

/**
 * Розбір `lastload` у рядки «джерело → дата».
 *
 * Форму відповіді джерело не документує (`docs/SPENDING.md` §2), тож читаємо
 * лише те, що впізнаємо: масив об'єктів із `sourceName` і `lastLoad`. Решта
 * не вигадується й не показується сирим JSON.
 */
export function lastLoadSources(raw: unknown): LastLoadSource[] {
  if (!Array.isArray(raw)) return [];

  const rows: LastLoadSource[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.sourceName === "string" ? record.sourceName : "";
    const date = typeof record.lastLoad === "string" ? record.lastLoad : "";
    if (!name && !date) continue;
    rows.push({ name: name || "без назви", date });
  }

  return rows.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}

/** Друга сторона платежу: залежно від ролі нею буде платник або отримувач. */
export function counterparty(transaction: SpendingTransaction, role: SpendingRole): string {
  const name = role === "payer" ? transaction.reciptName : transaction.payerName;
  return name || "—";
}
