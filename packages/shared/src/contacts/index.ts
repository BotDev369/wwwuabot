/**
 * @wwwuabot/shared/contacts — контакти людини: поля, код лінка й клієнт.
 *
 * Один домен на сервер і на оболонку:
 *
 * - `fields.ts` — правила полів власника (ім'я, примітки) і нормалізація хендла, який приносить бот;
 * - `code.ts` — код лінка й готовий діплінк (`inv-8f3k2q` → `t.me/<bot>?start=…`);
 * - `types.ts` — форма контакту й форми відповідей;
 * - `api.ts` — форма запиту, спільна для платформи й панелі.
 *
 * Хештеги не тут: правила тега одні на нотатку й контакт, тож живуть у
 * `@wwwuabot/shared/tags` — другий набір правил розійшовся б із першим тихо.
 *
 * Сховище — таблиця `contacts` (`@wwwuabot/shared/database/tables`). Запис
 * створює платформа, а факт приєднання за кодом закріплює бот — саме тому ці
 * правила мусять жити в спільному модулі, а не в одному з воркерів.
 *
 * @module @wwwuabot/shared/contacts
 */

export {
  INVITE_CODE_PREFIX,
  MAX_CONTACT_NAME,
  buildInviteLink,
  inviteCodeFromToken,
  isInviteCode,
  isInviteToken,
  sanitizeContactName,
} from "./code";
export type { InviteLinkReason, InviteLinkResult } from "./code";
export {
  MAX_CONTACT_NOTES,
  MAX_CONTACT_USERNAME,
  sanitizeContactNotes,
  sanitizeContactUsername,
} from "./fields";
export type {
  Contact,
  ContactDeleteResponse,
  ContactInput,
  ContactListResponse,
  ContactSaveResponse,
} from "./types";
export { createContactsApi } from "./api";
export type { ContactsApi, ContactsTransport } from "./api";
