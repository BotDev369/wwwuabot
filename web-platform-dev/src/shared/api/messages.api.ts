/**
 * Повідомлення в платформі.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/messages`): тут
 * лишається тільки шлях. Ідентичність додає `apiFetch` цієї оболонки —
 * підписаний `initData`; автора з клієнта не передають ніколи.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createMessagesApi } from "@wwwuabot/shared/messages";
import { apiFetch } from "./client";

export const messagesApi = createMessagesApi(apiFetch, "/api/messages");
