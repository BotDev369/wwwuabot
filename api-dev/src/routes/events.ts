/**
 * Шляхи журналу дій: зведення, список, люди для вибору й прибирання. Один
 * домен — один модуль, щоб роутер лишався списком доменів (`docs/EVENTS.md`).
 *
 * Усі шляхи — під префіксом `/api/admin/`, тож адмін-гейт стоїть до них.
 *
 * @module api-dev/src/routes/events
 */

import type { Env } from "../shared/types";
import {
  handleEventCleanup,
  handleEventList,
  handleEventSummary,
  handleEventUsers,
} from "../controllers/events.controller";

/** Відповідь, якщо шлях належить журналу; `null` — інший домен. */
export function matchEventsRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (!pathname.startsWith("/api/admin/events")) return null;

  if (pathname === "/api/admin/events/summary" && request.method === "GET") {
    return handleEventSummary(request, env);
  }
  if (pathname === "/api/admin/events/users" && request.method === "GET") {
    return handleEventUsers(request, env);
  }
  if (pathname === "/api/admin/events" && request.method === "GET") {
    return handleEventList(request, env);
  }
  // Прибирання — `POST`: `DELETE` читався б як «видали подію за адресою».
  if (pathname === "/api/admin/events/delete" && request.method === "POST") {
    return handleEventCleanup(request, env);
  }
  return null;
}
