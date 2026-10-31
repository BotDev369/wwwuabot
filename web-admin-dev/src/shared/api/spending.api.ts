/**
 * Читання зібраного Є-data з панелі.
 *
 * Ті самі `/api/admin/*`-шляхи, що й у решти адмінки: cookie-сесія їде
 * автоматично, а 401 обробляє спільний `apiFetch`. Запису тут немає — збір іде
 * розкладом, тож сторінка не має способу запустити його з браузера.
 * @module web-admin-dev/src/shared/api/spending.api
 */

import type {
  SpendingDocument,
  SpendingOverview,
  SpendingPage,
  SpendingRole,
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

export function fetchSpendingSync(period?: string | null): Promise<SpendingSyncView> {
  return apiFetch<SpendingSyncView>(withQuery("/api/admin/spending/sync", { period }));
}

export interface SpendingListQuery {
  readonly edrpou: string;
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
