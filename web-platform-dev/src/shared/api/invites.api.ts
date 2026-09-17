/**
 * Особисті лінки-запрошення в платформі.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/invites`): тут
 * лишається тільки шлях. Ідентичність додає `apiFetch` цієї оболонки —
 * підписаний `initData`; власника лінка з клієнта не передають ніколи.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createInvitesApi } from "@wwwuabot/shared/invites";
import { apiFetch } from "./client";

export const invitesApi = createInvitesApi(apiFetch, "/api/invites");
