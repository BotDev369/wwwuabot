/**
 * Шляхи Є-data в адмінці: те, що зібрав розклад, і стан збору.
 *
 * Усі шляхи — під префіксом `/api/admin/`, тож адмін-гейт стоїть до них
 * (`ADMIN_PATH_PREFIXES` у `router.ts`). Один домен — один модуль, щоб роутер
 * лишався списком доменів (`api-dev/src/routes/events.ts` — той самий патерн).
 * @module api-dev/src/routes/spending
 */

import type { Env } from "../shared/types";
import {
  handleSpendingDocuments,
  handleSpendingOverview,
  handleSpendingSync,
  handleSpendingTransactions,
} from "../controllers/spending-admin.controller";

/** Відповідь, якщо шлях належить Є-data; `null` — інший домен. */
export function matchSpendingRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (!pathname.startsWith("/api/admin/spending")) return null;
  if (request.method !== "GET") return null;

  if (pathname === "/api/admin/spending/overview") {
    return handleSpendingOverview(request, env);
  }
  if (pathname === "/api/admin/spending/sync") {
    return handleSpendingSync(request, env);
  }
  if (pathname === "/api/admin/spending/documents") {
    return handleSpendingDocuments(request, env);
  }
  if (pathname === "/api/admin/spending/transactions") {
    return handleSpendingTransactions(request, env);
  }
  return null;
}
