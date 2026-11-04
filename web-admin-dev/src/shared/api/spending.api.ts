/**
 * Читання зібраного Є-data з панелі та перезбір місяця.
 *
 * Ті самі `/api/admin/*`-шляхи, що й у решти адмінки: cookie-сесія їде
 * автоматично, а 401 обробляє спільний `apiFetch`. Запис рівно один —
 * `refresh`: місяць, до якого джерело дописало рядки, треба вміти перечитати.
 * @module web-admin-dev/src/shared/api/spending.api
 */

import type {
  SpendingCodes,
  SpendingDocument,
  SpendingOverview,
  SpendingRecipients,
  SpendingScope,
  SpendingPage,
  SpendingRole,
  SpendingRefreshReport,
  SpendingSyncView,
  SpendingTransaction,
} from "@wwwuabot/shared/spending";
import { apiFetch } from "./client";

type Param = string | number | null | undefined;

/** Порожні параметри не потрапляють в адресу: `?period=` читався б як вибір. */
function withQuery(path: string, params: Readonly<Record<string, Param>>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}

export function fetchSpendingOverview(period?: string | null): Promise<SpendingOverview> {
  return apiFetch<SpendingOverview>(withQuery("/api/admin/spending/overview", { period }));
}

export function fetchSpendingCodes(period?: string | null): Promise<SpendingCodes> {
  return apiFetch<SpendingCodes>(withQuery("/api/admin/spending/codes", { period }));
}

/** Розріз за отримувачами: вікно задає `scope`, а не адреса екрана. */
export function fetchSpendingRecipients(scope: SpendingScope): Promise<SpendingRecipients> {
  return apiFetch<SpendingRecipients>(withQuery("/api/admin/spending/recipients", { scope }));
}

export function fetchSpendingSync(period?: string | null): Promise<SpendingSyncView> {
  return apiFetch<SpendingSyncView>(withQuery("/api/admin/spending/sync", { period }));
}

export interface SpendingListQuery {
  /** Порожній — наскрізний список громади; порожні параметри не їдуть в адресу. */
  readonly edrpou?: string | null;
  readonly period?: string | null;
  readonly role?: SpendingRole;
  readonly cursor?: string | null;
  readonly limit?: number;
}

export function fetchSpendingDocuments(
  query: SpendingListQuery,
): Promise<SpendingPage<SpendingDocument>> {
  return apiFetch<SpendingPage<SpendingDocument>>(
    withQuery("/api/admin/spending/documents", {
      edrpou: query.edrpou,
      period: query.period,
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}

/**
 * Перезбір місяця: запит живе, доки прогін не скінчиться (до кількох хвилин),
 * бо результат — це звіт про те, що саме вдалося, а не «прийнято».
 */
export function refreshSpending(period: string): Promise<{ report: SpendingRefreshReport }> {
  return apiFetch<{ report: SpendingRefreshReport }>("/api/admin/spending/refresh", {
    method: "POST",
    body: JSON.stringify({ period }),
  });
}

export function fetchSpendingTransactions(
  query: SpendingListQuery,
): Promise<SpendingPage<SpendingTransaction>> {
  return apiFetch<SpendingPage<SpendingTransaction>>(
    withQuery("/api/admin/spending/transactions", {
      edrpou: query.edrpou,
      role: query.role,
      period: query.period,
      cursor: query.cursor,
      limit: query.limit,
    }),
  );
}
