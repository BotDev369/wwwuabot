/**
 * Адмінські читання журналу дій (`/api/admin/events…`): зведення й список.
 *
 * Два шляхи, а не один: у спільній відповіді незрозуміло, що обмежене —
 * `LIMIT` людей чи подій. Діапазон добирає `resolveEventRange` (`docs/EVENTS.md`).
 *
 * @module api-dev/src/controllers/events.controller
 */

import { z } from "zod";
import {
  EVENT_KINDS,
  EVENT_SURFACES,
  resolveEventRange,
  type EventRange,
} from "@wwwuabot/shared/events";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { readBody } from "../shared/body";
import {
  cleanupEvents,
  readEventSummary,
  readEventUsers,
  readEvents,
  readFullEventLogging,
  writeFullEventLogging,
  type EventCleanupFilter,
} from "../services/user-events.service";

const EVENTS_LIMIT_DEFAULT = 100;
const EVENTS_LIMIT_MAX = 200;

/**
 * Ознаки прибирання. `all` — єдине, що дозволяє порожній набір: забутий
 * фільтр не має сам перетворюватись у «видалити все».
 */
const cleanupSchema = z.object({
  all: z.boolean().optional(),
  dryRun: z.boolean().optional(),
  userId: z.number().int().positive().optional(),
  from: z.string().min(1).optional(),
  to: z.string().min(1).optional(),
  surface: z.enum(EVENT_SURFACES).optional(),
  kind: z.enum(EVENT_KINDS).optional(),
});

/** Налаштування журналу: чи писати кожен дотик, а не лише екрани. */
const loggingSchema = z.object({ fullLogging: z.boolean() });

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

/** `GET /api/admin/events/settings` — чи ввімкнена сквозна деталізація. */
export async function handleEventSettingsRead(request: Request, env: Env): Promise<Response> {
  try {
    return json({ fullLogging: await readFullEventLogging(env) });
  } catch (error) {
    apiLog.error("events: налаштування журналу", error);
    return json({ error: "Не вдалось прочитати налаштування" }, 500);
  }
}

/** `POST /api/admin/events/settings` — перемкнути сквозну деталізацію. */
export async function handleEventSettingsWrite(request: Request, env: Env): Promise<Response> {
  const parsed = await readBody(request, loggingSchema);
  if (!parsed.ok) return parsed.response;

  try {
    await writeFullEventLogging(env, parsed.body.fullLogging);
    return json({ fullLogging: parsed.body.fullLogging });
  } catch (error) {
    apiLog.error("events: збереження налаштувань журналу", error);
    return json({ error: "Не вдалось зберегти налаштування" }, 500);
  }
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
 * `GET /api/admin/events/users` — люди з журналу для вибору в прибиранні.
 *
 * Список береться з **самих подій**, а не з `users`: у журналі вже є тільки
 * ті, хто щось робив, і їхні номери показувати є сенс.
 */
export async function handleEventUsers(request: Request, env: Env): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const requested = Number(query.get("limit") ?? 50);
  const limit = Number.isFinite(requested) ? Math.min(200, Math.max(1, Math.trunc(requested))) : 50;

  try {
    return json(await readEventUsers(env, query.get("search") ?? "", limit));
  } catch (error) {
    apiLog.error("events: люди журналу", error);
    return json({ error: "Не вдалось прочитати людей" }, 500);
  }
}

/**
 * `POST /api/admin/events/delete` — прибрати події за ознаками.
 *
 * `dryRun` повертає `matched` і нічого не чіпає: адмінка показує кількість
 * до підтвердження. Без жодної ознаки потрібне явне `all` — інакше 400.
 */
export async function handleEventCleanup(request: Request, env: Env): Promise<Response> {
  const parsed = await readBody(request, cleanupSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  const filter: EventCleanupFilter = {
    userId: body.userId ?? null,
    from: body.from ?? null,
    to: body.to ?? null,
    surface: body.surface ?? null,
    kind: body.kind ?? null,
  };
  const hasFilter = [filter.userId, filter.from, filter.to, filter.surface, filter.kind].some(
    (value) => value !== null,
  );
  if (!hasFilter && body.all !== true) {
    return json({ error: "Немає критеріїв" }, 400);
  }
  if (
    (filter.from && Number.isNaN(Date.parse(filter.from))) ||
    (filter.to && Number.isNaN(Date.parse(filter.to)))
  ) {
    return json({ error: "Некоректна дата" }, 400);
  }

  try {
    const count = await cleanupEvents(env, filter, body.dryRun === true);
    return json(body.dryRun === true ? { matched: count } : { deleted: count });
  } catch (error) {
    apiLog.error("events: прибирання", error);
    return json({ error: "Не вдалось прибрати журнал" }, 500);
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
