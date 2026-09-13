/**
 * Посилання, яким діляться сторінкою: **третє подання тієї самої адреси**.
 *
 * Адреса — одна сутність (`slug`), а подань у неї три:
 *
 * | Подання | Вигляд | Хто будує |
 * |---|---|---|
 * | веб-шлях | `/mydate/1980-03-03/today` | `toWebPath()` |
 * | параметр бота | `mydate_1980-03-03_today` | `toBotPayload()` |
 * | **посилання** | `https://t.me/<bot>?start=mydate_1980-03-03_today` | `buildShareLinks()` |
 *
 * **Навіщо окремо.** Кнопка «Поділитись» мусить показати людині готовий текст, а
 * не «збери сам із трьох шматків». Найлегше тут помилитись тихо: Telegram
 * обрізає задовгий `?start=` **без помилки**, а ім'я бота з `@` на початку дає
 * посилання, яке не відкривається ніколи. Тому функція не просто клеїть рядок,
 * а повертає **причину**, чому посилання немає — щоб інтерфейс сказав це вголос,
 * а не показав порожнє поле.
 *
 * **Чому це в `shared`, а не в одній з оболонок.** Той самий ланцюжок потрібен і
 * платформі (кнопка «Поділитись» на сторінці), і адмінці (у картці рядка), і
 * боту (посилання на власну сторінку в повідомленні). Це чиста функція: вона не
 * ходить ні в базу, ні в Telegram — ім'я бота передає виклик.
 *
 * @module @wwwuabot/shared/content/link
 */

import { isDeepLinkable, isValidSlug, normalizeSlug, toBotPayload, toWebPath } from "./resolve";

/** Хост діплінків Telegram. Іншого бути не може: `?start=` розуміє лише він. */
export const TELEGRAM_ORIGIN = "https://t.me";

/**
 * Ім'я бота у вигляді, який приймає Telegram BotFather: латинська літера на
 * початку, далі літери, цифри й `_`, 5–32 символи.
 */
const BOT_USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,31}$/;

/** `@wwwuabot` і ` wwwuabot ` → `wwwuabot`. Порожнє лишається порожнім. */
export function normalizeBotUsername(raw?: string | null): string {
  return (raw ?? "").trim().replace(/^@+/, "");
}

/** Чи з цього імені взагалі вийде робоче посилання. */
export function isValidBotUsername(raw?: string | null): boolean {
  return BOT_USERNAME_RE.test(normalizeBotUsername(raw));
}

/** Чому діплінка немає. `ok` — посилання є. */
export type ShareLinkReason =
  /** Посилання зібрано. */
  | "ok"
  /** Адреса не пройшла `isValidSlug` (найчастіше — `_` усередині сегмента). */
  | "invalid_slug"
  /** Ім'я бота невідоме або не схоже на справжнє. */
  | "no_bot_username"
  /** Параметр довший за 64 символи — Telegram обріже його мовчки. */
  | "too_long";

export interface ShareLinksInput {
  /** Адреса рядка. Порожній рядок — головна сторінка. */
  slug: string;
  /** Хвіст адреси: дата, вигляд, фільтр. Дані, а не інші сторінки. */
  params?: readonly string[];
  /** Ім'я бота (`@` не обов'язковий). Немає — діплінка не буде. */
  botUsername?: string | null;
  /** База платформи, якщо виклик її знає: з неї вийде абсолютна веб-адреса. */
  webBase?: string | null;
}

export interface ShareLinks {
  /** Шлях вебу. Є завжди: головна дає `/`. */
  webPath: string;
  /** Абсолютна веб-адреса — лише якщо виклик передав `webBase`. */
  webUrl: string | null;
  /** Параметр `?start=` (порожній — головна, тобто `/start` без параметра). */
  payload: string;
  /** Готовий діплінк — або `null`, і тоді дивись `reason`. */
  deepLink: string | null;
  /** Причина, чому діплінка немає. */
  reason: ShareLinkReason;
}

/** База без хвостового слеша плюс шлях: `https://x.dev` + `/a` → `https://x.dev/a`. */
function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

/**
 * Збирає обидва посилання сторінки одним викликом.
 *
 * Порядок перевірок — від найдешевшої й найчастішої ознаки до рідкісної: спершу
 * адреса (вона може бути недіплінкованою взагалі), далі ім'я бота, і лише тоді
 * довжина. Так повідомлення людині буде про те, що вона справді може виправити.
 */
export function buildShareLinks(input: ShareLinksInput): ShareLinks {
  const params = input.params ?? [];
  const slug = normalizeSlug(input.slug);
  const payload = toBotPayload(slug, params);
  const webPath = toWebPath(slug, params);
  const webUrl = input.webBase ? joinUrl(input.webBase, webPath) : null;

  const reason: ShareLinkReason =
    !isValidSlug(slug) || params.some((param) => !isValidSlug(param))
      ? "invalid_slug"
      : !isValidBotUsername(input.botUsername)
        ? "no_bot_username"
        : !isDeepLinkable(slug, params)
          ? "too_long"
          : "ok";

  const username = normalizeBotUsername(input.botUsername);
  const deepLink =
    reason === "ok"
      ? payload === ""
        ? `${TELEGRAM_ORIGIN}/${username}`
        : `${TELEGRAM_ORIGIN}/${username}?start=${payload}`
      : null;

  return { webPath, webUrl, payload, deepLink, reason };
}
