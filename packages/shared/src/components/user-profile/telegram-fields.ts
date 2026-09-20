import type { UserProfileData } from "./types";

/**
 * Поля картки Telegram — **дані, а не розмітка**.
 *
 * Telegram віддає про людину десяток можливих полів і частину з них не
 * надсилає взагалі: `last_name` може прийти порожнім рядком, `is_premium` —
 * не прийти зовсім, коли підписки немає. Розмітка, що перебирає ключі «як є»,
 * тому показує і `Прізвище …`, і не показує преміум — залежно від того, що
 * сьогодні вирішив Telegram.
 *
 * Тут натомість **порядок і склад полів задані нами**, а payload лише наповнює
 * їх значеннями. Що з цього випливає:
 *
 * - **Порожні поля не показуються.** Рядок без значення не несе нічого: людина
 *   читає список як «що про мене відомо», і `Прізвище …` у ньому — шум.
 *   Виняток — прапорці (див. `ALWAYS_SHOWN`).
 * - **`is_premium` стоїть завжди.** Telegram не надсилає цей ключ, коли
 *   підписки немає, тож відсутність — це «ні», а не «невідомо»: без рядка
 *   людина шукала б у картці те, чого там і не мало бути, або не бачила б
 *   свого преміуму взагалі.
 * - **Фото списком не показується** (`photo_url`): воно вже стоїть у шапці
 *   картки, а адреса картинки в переліку не додає нічого.
 * - **Невідомі ключі лишаються** — внизу, зі своїм ім'ям. Telegram додає поля
 *   (`added_to_menu`, `usernames`, …), і вони мають з'являтись самі, без правки
 *   коду: краще побачити `foo_bar`, ніж не побачити нічого.
 *
 * @module packages/shared/src/components/user-profile/telegram-fields
 */

/** Одне поле картки: ключ (він же React-`key`), підпис і готове значення. */
export interface TelegramField {
  key: string;
  label: string;
  value: string;
}

/** Мітки полів. Невідомий ключ показується своїм ім'ям — як є. */
export const TELEGRAM_FIELD_LABELS: Record<string, string> = {
  id: "Telegram ID",
  username: "Юзернейм",
  first_name: "Ім'я",
  last_name: "Прізвище",
  language_code: "Мова інтерфейсу",
  is_premium: "Telegram Premium",
  added_to_menu: "Додано в меню",
  allows_write_to_pm: "Дозволяє писати в особисті",
  is_bot: "Бот",
  is_inline: "Inline-бот",
  usernames: "Інші юзернейми",
  photo_url: "Фото профілю",
};

/**
 * Порядок показу: спершу те, за чим людину впізнають, далі прапорці. Порядок
 * сталий і наш — інакше картка мінялась би від того, у якому порядку Telegram
 * сьогодні поклав ключі в payload.
 */
const FIELD_ORDER: readonly string[] = [
  "id",
  "username",
  "first_name",
  "last_name",
  "language_code",
  "is_premium",
  "allows_write_to_pm",
  "added_to_menu",
];

/** Прапорці, які показуються завжди: відсутність ключа = «ні», а не «невідомо». */
const ALWAYS_SHOWN = new Set<string>(["is_premium"]);

/** Поля, які картка не показує списком: фото вже стоїть у шапці. */
const HIDDEN_KEYS = new Set<string>(["photo_url"]);

/**
 * Поля **сеансу** Mini App, а не людини (`auth_date`, `chat_type`, `start_param`,
 * …). У `initData.user` вони не приходять — це параметри всього `initData`,
 * і жили тут тимчасово, для відловлювання багів. Якщо колись таки потраплять у
 * payload, картка їх не покаже: наш дамп — не профіль.
 */
const SESSION_KEYS = new Set<string>([
  "auth_date",
  "query_id",
  "chat_type",
  "chat_instance",
  "start_param",
  "hash",
  "signature",
]);

/**
 * Значення Telegram → текст. Числа лишаються числами, `true`/`false` — це
 * «Так»/«Ні»; порожнє (`null`, `undefined`, `""`) — `undefined`, «значення
 * немає»: такі рядки картка не показує.
 */
function telegramText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value ? "Так" : "Ні";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Значення поля для показу.
 *
 * Юзернейм — єдине поле, яке ми добираємо: Telegram віддає його без позначки, а
 * в продукті `@` належить **лише** Telegram-акаунту (AGENTS.md §2), тож саме тут
 * він і стоїть — на відміну від імені на платформі, яке йде з `#`.
 */
function displayValue(key: string, value: unknown): string | undefined {
  const shown = telegramText(value);
  if (key !== "username" || !shown) return shown;
  return shown.startsWith("@") ? shown : `@${shown}`;
}

/**
 * Поля картки Telegram — у сталому порядку, без порожніх і без фото.
 * Порожній/відсутній payload — порожній список (картка скаже про це сама).
 */
export function telegramFields(
  payload: Record<string, unknown> | null | undefined,
): TelegramField[] {
  // Порожній payload — це «нічого не відомо»: тоді картка не показує навіть
  // преміуму, бо про людину не сказано нічого (порожня картка — не картка).
  if (!payload || Object.keys(payload).length === 0) return [];

  const keys = Object.keys(payload).filter(
    (key) => !HIDDEN_KEYS.has(key) && !SESSION_KEYS.has(key),
  );
  const ordered = [
    ...FIELD_ORDER.filter((key) => keys.includes(key) || ALWAYS_SHOWN.has(key)),
    ...keys.filter((key) => !FIELD_ORDER.includes(key)),
  ];

  const fields: TelegramField[] = [];
  for (const key of ordered) {
    const raw = payload[key] ?? (ALWAYS_SHOWN.has(key) ? false : undefined);
    const value = displayValue(key, raw);
    if (!value) continue;
    fields.push({ key, label: TELEGRAM_FIELD_LABELS[key] ?? key, value });
  }
  return fields;
}

/** Чи є в людини що показати в картці Telegram. */
export function hasTelegramFields(user: UserProfileData | null | undefined): boolean {
  return telegramFields(user?.telegram ?? null).length > 0;
}
