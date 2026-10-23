/**
 * Адмінські читання журналу дій (`/api/admin/events…`): зведення й список.
 *
 * Два шляхи, а не один: у спільній відповіді незрозуміло, що обмежене —
 * `LIMIT` людей чи подій. Діапазон добирає `resolveEventRange` (`docs/EVENTS.md`).
 *
 * @module api-dev/src/controllers/events.controller
 */

import { resolveEventRange, type EventRange } from "@wwwuabot/shared/events";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { readEventSummary, readEvents } from "../services/user-events.service";

const EVENTS_LIMIT_DEFAULT = 100;
const EVENTS_LIMIT_MAX = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      // Журнал читається свіжим: кеш показував би вчорашню поведінку.
      "Cache-Control": "no-store",
    },
  });
}

function rangeOf(request: Request): EventRange {
  const query = new URL(request.url).searchParams;
  return resolveEventRange({ from: query.get("from"), to: query.get("to") });
}

/** `GET /api/admin/events/summary` — зведення за діапазоном. */
export async function handleEventSummary(request: Request, env: Env): Promise<Response> {
  try {
    return json(await readEventSummary(env, rangeOf(request)));
  } catch (error) {
    apiLog.error("events: зведення", error);
    return json({ error: "Не вдалось прочитати журнал" }, 500);
  }
}

/**
 * `GET /api/admin/events` — події діапазону.
 *
 * `userId` звужує до однієї людини (акордеон в адмінці), `limit`/`offset`
 * гортають список. Некоректний `userId` — це 400, а не «усі»: інакше друкарська
 * помилка показала б чужі дії під виглядом вибраної людини.
 */
export async function handleEventList(request: Request, env: Env): Promise<Response> {
  const query = new URL(request.url).searchParams;

  const rawUser = query.get("userId");
  const userId = rawUser === null ? null : Number(rawUser);
  if (rawUser !== null && (!Number.isInteger(userId) || (userId as number) <= 0)) {
    return json({ error: "Некоректний userId" }, 400);
  }

  const requestedLimit = Number(query.get("limit") ?? EVENTS_LIMIT_DEFAULT);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(EVENTS_LIMIT_MAX, Math.max(1, Math.trunc(requestedLimit)))
    : EVENTS_LIMIT_DEFAULT;
  const requestedOffset = Number(query.get("offset") ?? 0);
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.trunc(requestedOffset)) : 0;

  try {
    return json(await readEvents(env, rangeOf(request), { userId, limit, offset }));
  } catch (error) {
    apiLog.error("events: список", error);
    return json({ error: "Не вдалось прочитати журнал" }, 500);
  }
}
