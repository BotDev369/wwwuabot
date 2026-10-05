/**
 * Повідомлення в платформі.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/messages`): тут лишаються
 * тільки шляхи й транспорт. Ідентичність додає `apiFetch` цієї оболонки.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createMessagesApi } from "@wwwuabot/shared/messages";
import { apiFetch, apiUpload } from "./client";

export const messagesApi = createMessagesApi(apiFetch, "/api/messages", apiUpload);
