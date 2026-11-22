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
import {
  handleDeleteUserMessage,
  handleEditUserMessage,
} from "../controllers/bot-messages-actions.controller";

const USERS_PREFIX = "/api/admin/users/";
const MESSAGES_SUFFIX = "/messages";

/** `null` — хвіст не той або id не число: шлях не наш. */
function userIdFromPath(pathname: string): number | null {
  if (!pathname.endsWith(MESSAGES_SUFFIX)) return null;
  const raw = pathname.slice(USERS_PREFIX.length, -MESSAGES_SUFFIX.length);
  const userId = Number(raw);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
}

/** Пара `користувач + повідомлення` з `/users/<id>/messages/<mid>`; `null` — не він. */
function messageTarget(pathname: string): { userId: number; messageId: number } | null {
  if (!pathname.startsWith(USERS_PREFIX)) return null;
  const parts = pathname.slice(USERS_PREFIX.length).split("/");
  if (parts.length !== 3 || parts[1] !== "messages") return null;
  const userId = Number(parts[0]);
  const messageId = Number(parts[2]);
  if (!Number.isInteger(userId) || userId <= 0) return null;
  if (!Number.isInteger(messageId) || messageId <= 0) return null;
  return { userId, messageId };
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
  if (request.method === "PATCH" && pathname.startsWith("/api/admin/users/")) {
    const target = messageTarget(pathname);
    if (!target) return null;
    return handleEditUserMessage(request, env, target.userId, target.messageId);
  }
  if (request.method === "DELETE" && pathname.startsWith("/api/admin/users/")) {
    const target = messageTarget(pathname);
    if (!target) return null;
    return handleDeleteUserMessage(request, env, target.userId, target.messageId);
  }
  return null;
}
