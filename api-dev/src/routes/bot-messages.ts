/**
 * Переписка людини з ботом — `/api/admin/users/:id/messages`.
 *
 * Префікс + хвіст замість регулярки: інвентар (`scripts/lib/api-routes.mjs`)
 * розпізнає точний шлях і префікс, тож регулярка випала б зі `docs/API.md`.
 *
 * @module api-dev/src/routes/bot-messages
 */

import type { Env } from "../shared/types";
import { handleUserMessages } from "../controllers/bot-messages.controller";

const USERS_PREFIX = "/api/admin/users/";
const MESSAGES_SUFFIX = "/messages";

/** `null` — хвіст не той або id не число: шлях не наш. */
function userIdFromPath(pathname: string): number | null {
  if (!pathname.endsWith(MESSAGES_SUFFIX)) return null;
  const raw = pathname.slice(USERS_PREFIX.length, -MESSAGES_SUFFIX.length);
  const userId = Number(raw);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

/** Обробити шлях переписки; `null` — це не він (роутер іде далі). */
export function matchBotMessagesRoute(
  request: Request,
  env: Env,
  pathname: string,
): Response | Promise<Response> | null {
  if (request.method === "GET" && pathname.startsWith("/api/admin/users/")) {
    const userId = userIdFromPath(pathname);
    if (userId === null) return null;
    return handleUserMessages(request, env, userId);
  }
  return null;
}
