/**
 * Єдина довірена ідентичність користувача.
 *
 * Джерело істини — **підписаний Telegram `initData`** (HMAC-SHA256 з `BOT_TOKEN`).
 * Ніщо інше не приймається:
 *
 * - `X-Telegram-User-Id` — голий заголовок, підробляється одним рядком.
 * - Cookie `user_id` — не підписана.
 *
 * Будь-який контролер, якому потрібен `user_id`, має брати його ТІЛЬКИ звідси.
 *
 * @module api-dev/src/shared/identity
 */

import type { Env } from "./types";
import { INIT_DATA_HEADER, verifyInitData } from "@wwwuabot/shared/security/telegram";

/** Результат визначення ідентичності. */
export type Identity = { ok: true; userId: number } | { ok: false; response: Response };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Ідентичність, якщо запит її має. Для публічних ендпоїнтів, які лише
 * збагачують відповідь для власника (напр. `GET /api/templates`).
 */
export async function tryResolveUserId(
  request: Request,
  env: Pick<Env, "BOT_TOKEN">,
): Promise<number | null> {
  const initData = request.headers.get(INIT_DATA_HEADER);
  if (!initData || !env.BOT_TOKEN) return null;
  return verifyInitData(initData, env.BOT_TOKEN);
}

/**
 * Ідентичність, обов'язкова для виконання дії.
 * Повертає готову відповідь 401/503, якщо її немає.
 */
export async function resolveUserId(
  request: Request,
  env: Pick<Env, "BOT_TOKEN">,
): Promise<Identity> {
  if (!env.BOT_TOKEN) {
    return {
      ok: false,
      response: json({ error: "Server auth not configured" }, 503),
    };
  }

  const initData = request.headers.get(INIT_DATA_HEADER);
  if (!initData) {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }

  const userId = await verifyInitData(initData, env.BOT_TOKEN);
  if (userId === null) {
    return { ok: false, response: json({ error: "Invalid initData" }, 401) };
  }

  return { ok: true, userId };
}
