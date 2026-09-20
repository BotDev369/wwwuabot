/** Мітки полів, які Telegram віддає про людину. Невідомі ключі показуються як є. */
export const TELEGRAM_FIELD_LABELS: Record<string, string> = {
  id: "Telegram ID",
  first_name: "Ім'я",
  last_name: "Прізвище",
  username: "Telegram-хендл",
  language_code: "Мова інтерфейсу",
  is_premium: "Telegram Premium",
  added_to_menu: "Додано в меню",
  allows_write_to_pm: "Дозволяє писати в особисті",
  photo_url: "Фото профілю",
  is_bot: "Бот",
  is_inline: "Inline-бот",
  usernames: "Інші хендли",
};

/**
 * Значення Telegram → текст.
 *
 * Числа лишаються числами, `true`/`false` — це «Так»/«Ні». Невідоме значення
 * віддається рядком, а не ховається: профіль має показати все, що відомо, навіть
 * якщо ми не знаємо, як це підписати.
 *
 * Порожнє (`null`, `undefined`, `""`) — `undefined`: «немає значення». Показує
 * його рядок профілю (`FieldRow`), а не ця функція — щоб `...` стояло в одному
 * місці для всіх полів.
 */
function telegramText(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "boolean") return value ? "Так" : "Ні";

  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

/**
 * Значення поля для показу — з одним винятком на весь перелік.
 *
 * `photo_url` несе адресу картинки, а не дані про людину: людині вона нічого не
 * каже, і саме фото вже стоїть у шапці. Тож поле каже «Так» (Telegram дав фото)
 * або `...` (не дав) — так само, як решта полів, і без простирадла посилання
 * посеред картки.
 */
export function telegramFieldValue(key: string, value: unknown): string | undefined {
  const shown = telegramText(value);
  if (key !== "photo_url" || !shown) return shown;
  return "Так";
}
