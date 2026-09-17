/**
 * Особистий лінк-запрошення — чисті правила: код, готовий діплінк, підпис.
 *
 * **Навіщо окремо від `notes`.** Лінк запрошення — це адреса, яку людина
 * надсилає іншій, і її подання одне: `https://t.me/<bot>?start=<code>`. Тут
 * вирішується, чи з коду взагалі вийде payload (Telegram мовчки обрізає
 * задовгий `?start=`), чи є ім'я бота, і як назвати контакт, коли той
 * приєднався. Цією ж функцією користується і сервер (він збирає лінк), і
 * клієнт (він показує його готовим) — дві копії тут розійшлись би тихо, як і в
 * `content/link.ts`.
 *
 * **Код — це payload.** Окремого «коду» й «параметра» немає: `inv-8f3k2q` їде
 * в `?start=` як є. Формат тому підпорядкований правилам Telegram: латиниця,
 * цифри й дефіс (жодного `_` — це розділювач сегментів payload, див.
 * `content/resolve.ts`), і код проходить `isValidBotPayload` без окремого
 * винятку в роутері бота.
 *
 * @module @wwwuabot/shared/invites
 */

import { TELEGRAM_ORIGIN, isValidBotUsername, normalizeBotUsername } from "../content/link";

/** Префікс коду — щоб код запрошення не збігся з адресою сторінки на око. */
export const INVITE_CODE_PREFIX = "inv-";

/** Стеля підпису контакту: ім'я, а не адреса. */
export const MAX_INVITE_LABEL = 60;

/** Частина коду без префікса — те, що генерує сервер випадково. */
const TOKEN_RE = /^[a-z0-9]{6,16}$/;

/** Усе, чим підпис бути не може: керувальні символи, переноси, зайві пробіли. */
const NOT_LABEL = /[\p{C}]+/gu;

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

/** Підпис контакту з того, що ввела людина: один рядок, без керувальних знаків. */
export function sanitizeInviteLabel(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.replace(NOT_LABEL, " ").replace(/\s+/g, " ").trim().slice(0, MAX_INVITE_LABEL);
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

/** Те, що про контакт знає `users` — рівно стільки, скільки треба для підпису. */
export interface ContactNameFields {
  platformUsername?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
}

/**
 * Ім'я контакту — одним рядком.
 *
 * Порядок **навмисний**: спершу `platform_username` (ім'я в нашому продукті —
 * його людина обрала сама), далі Telegram-ім'я, і лише потім `@handle`. Це та
 * сама ієрархія, що в профілі (`users`: `username` — те, що дав Telegram,
 * `platform_username` — те, що обрала людина), і саме тому вона описана тут
 * один раз: у списку контактів і в картці профілю вона мусить бути одна.
 */
export function contactDisplayName(fields: ContactNameFields): string {
  const platform = (fields.platformUsername ?? "").trim();
  if (platform) return platform;

  const full = [fields.firstName, fields.lastName]
    .map((part) => (part ?? "").trim())
    .filter((part) => part !== "" && part !== "...")
    .join(" ");
  if (full) return full;

  const handle = (fields.username ?? "").trim();
  return handle && handle !== "..." ? `@${handle}` : "Без імені";
}
