/**
 * Код контакту — чисті правила: код для `?start=`, готовий діплінк і ім'я.
 *
 * **Лінк — це поле контакту, а не окремий запис.** Так вирішив власник: контакт
 * заводять руками (ім'я, `@username`, Telegram-id, хештеги, примітки), а лінк —
 * те, чим цей контакт запрошують; він лежить у колонці `contacts.code`. Тому тут
 * немає ні «сутності лінка», ні його списку — є код і те, як його показати.
 *
 * **Код — це payload.** Окремого «коду» й «параметра» немає: `inv-8f3k2q` їде в
 * `?start=` як є. Формат тому підпорядкований правилам Telegram: латиниця,
 * цифри й дефіс (жодного `_` — це розділювач сегментів payload, див.
 * `content/resolve.ts`), і код проходить `isValidBotPayload` без окремого
 * винятку в роутері бота.
 *
 * @module @wwwuabot/shared/contacts
 */

import { TELEGRAM_ORIGIN, isValidBotUsername, normalizeBotUsername } from "../content/link";

/** Префікс коду — щоб код запрошення не збігся з адресою сторінки на око. */
export const INVITE_CODE_PREFIX = "inv-";

/** Стеля імені контакту: ім'я, а не адреса. */
export const MAX_CONTACT_NAME = 60;

/** Частина коду без префікса — те, що генерує сервер випадково. */
const TOKEN_RE = /^[a-z0-9]{6,16}$/;

/** Усе, чим ім'я бути не може: керувальні символи, переноси, зайві пробіли. */
const NOT_NAME = /[\p{C}]+/gu;

/**
 * Чи придатний токен для коду. Токен приходить із випадкових байтів, тож
 * перевірка тут — не довіра до нього, а межа: усе, що не пройшло, просто не
 * стає кодом.
 */
export function isInviteToken(raw: string): boolean {
  return TOKEN_RE.test(raw);
}

/** Код із токена. Токен, який не пройшов перевірку, коду не дає (`null`). */
export function inviteCodeFromToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const token = raw.trim().toLowerCase();
  return isInviteToken(token) ? `${INVITE_CODE_PREFIX}${token}` : null;
}

/** Чи це код запрошення (а не адреса сторінки). */
export function isInviteCode(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const code = value.trim().toLowerCase();
  if (!code.startsWith(INVITE_CODE_PREFIX)) return false;
  return isInviteToken(code.slice(INVITE_CODE_PREFIX.length));
}

/** Ім'я контакту з того, що ввела людина: один рядок, без керувальних знаків. */
export function sanitizeContactName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(NOT_NAME, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CONTACT_NAME);
}

/** Чому готового лінка немає. `ok` — лінк є. */
export type InviteLinkReason =
  /** Лінк зібрано. */
  | "ok"
  /** Код не пройшов перевірку — такий лінк не відкриється ніколи. */
  | "invalid_code"
  /** Ім'я бота невідоме (немає токена або Telegram не відповів). */
  | "no_bot_username";

export interface InviteLinkResult {
  /** Готовий діплінк у бота — або `null`, і тоді дивись `reason`. */
  deepLink: string | null;
  /** Причина, чому лінка немає: інтерфейс каже її вголос, а не показує пусте. */
  reason: InviteLinkReason;
}

/**
 * Збирає лінк запрошення. Ім'я бота передає виклик — тут немає ні бази, ні
 * звернень у Telegram.
 */
export function buildInviteLink(
  botUsername: string | null | undefined,
  code: string,
): InviteLinkResult {
  if (!isInviteCode(code)) return { deepLink: null, reason: "invalid_code" };
  if (!isValidBotUsername(botUsername)) return { deepLink: null, reason: "no_bot_username" };

  const username = normalizeBotUsername(botUsername);
  return {
    deepLink: `${TELEGRAM_ORIGIN}/${username}?start=${code.trim().toLowerCase()}`,
    reason: "ok",
  };
}
