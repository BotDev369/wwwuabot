/**
 * Ім'я бота — правила, які потрібні і посиланням сторінки, і кодам запрошення.
 *
 * **Чому окремий файл, а не частина `link.ts`.** Ім'я бота читають два модулі:
 * `content/link` (посилання на сторінку) і `contacts/code` (посилання-запрошення).
 * Коли б обидва жили в одному файлі, той, хто читає обидва, мав би створити цикл
 * `link → contacts/code → link`: він працював би, але правило імені бота лежало б
 * у файлі, який про це не знає. Тут його власник один, а решта импортує звідси.
 *
 * @module @wwwuabot/shared/content/bot-username
 */

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
