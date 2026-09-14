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

/** Мітки полів сеансу Mini App (`initData`, не сам користувач). */
export const TELEGRAM_SESSION_LABELS: Record<string, string> = {
  auth_date: "Підпис видано",
  query_id: "ID запиту",
  chat_type: "Тип чату",
  chat_instance: "ID сеансу чату",
  start_param: "Параметр запуску",
  receiver: "Отримувач",
  can_send_after: "Можна надіслати після",
};

/**
 * Значення Telegram → текст.
 *
 * Числа лишаються числами, `true`/`false` — це «Так»/«Ні», дата підпису —
 * час (`auth_date` приходить у секундах Unix, і показувати його як 1789430400
 * означало б нічого не сказати). Невідоме значення віддається рядком, а не
 * ховається: профіль має показати все, що відомо, навіть якщо ми не знаємо,
 * як це підписати.
 */
export function formatTelegramValue(key: string, value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") return undefined;

  if (typeof value === "boolean") return value ? "Так" : "Ні";

  if (key === "auth_date" || key === "can_send_after") {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(seconds * 1000).toLocaleString("uk-UA");
    }
  }

  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}
