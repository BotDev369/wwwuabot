/**
 * Журнал дій з адмінки.
 *
 * Ті самі `/api/admin/*`-шляхи, що й у решти панелі: cookie-сесію додає
 * спільний `apiFetch`, а адмін-гейт стоїть у `api-dev` до контролера.
 *
 * @module web-admin-dev/src/shared/api/events.api
 */

import type { EventKind, EventList, EventSurface, EventSummary } from "@wwwuabot/shared/events";
import { apiFetch } from "./client";

/** Тіло прибирання: ознаки плюс `all` (єдина згода на «стерти все»). */
export interface EventCleanupRequest {
  all?: boolean;
  dryRun?: boolean;
  userId?: number;
  from?: string;
  to?: string;
  surface?: EventSurface;
  kind?: EventKind;
}

function rangeQuery(range: { from: string; to: string }): string {
  return `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
}

export function fetchEventSummary(range: { from: string; to: string }): Promise<EventSummary> {
  return apiFetch<EventSummary>(`/api/admin/events/summary?${rangeQuery(range)}`);
}

export function fetchEvents(params: {
  from: string;
  to: string;
  userId?: number | null;
  limit?: number;
  offset?: number;
}): Promise<EventList> {
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    limit: String(params.limit ?? 100),
    offset: String(params.offset ?? 0),
  });
  if (params.userId !== undefined && params.userId !== null) {
    query.set("userId", String(params.userId));
  }
  return apiFetch<EventList>(`/api/admin/events?${query.toString()}`);
}

/**
 * Прибирання журналу: `dryRun` повертає `matched`, інакше — `deleted`.
 * Обидва — у тій самій відповіді, бо це той самий відбір, лише без запису.
 */
export function cleanupEvents(
  body: EventCleanupRequest,
): Promise<{ matched?: number; deleted?: number }> {
  return apiFetch(`/api/admin/events/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
