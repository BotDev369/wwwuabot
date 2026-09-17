/**
 * @wwwuabot/shared/invites — особисті лінки-запрошення: код, діплінк, клієнт.
 *
 * Один домен на сервер і на оболонку:
 *
 * - `code.ts` — правила коду й підпису (чи відкриється лінк, і як звати контакт);
 * - `types.ts` — форма лінка й контакту;
 * - `api.ts` — форма запиту, спільна для платформи й панелі.
 *
 * Сховище — таблиця `invites` (`@wwwuabot/shared/database/tables`). Лінк
 * створює платформа, а факт приєднання закріплює бот — саме тому ці правила
 * мусять жити в спільному модулі, а не в одному з воркерів.
 *
 * @module @wwwuabot/shared/invites
 */

export {
  INVITE_CODE_PREFIX,
  MAX_INVITE_LABEL,
  buildInviteLink,
  contactDisplayName,
  inviteCodeFromToken,
  isInviteCode,
  isInviteToken,
  sanitizeInviteLabel,
} from "./code";
export type { ContactNameFields, InviteLinkReason, InviteLinkResult } from "./code";
export type {
  InviteContact,
  InviteDeleteResponse,
  InviteLink,
  InviteListResponse,
  InviteSaveResponse,
} from "./types";
export { createInvitesApi } from "./api";
export type { InvitesApi, InvitesTransport } from "./api";
