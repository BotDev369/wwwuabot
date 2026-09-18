/**
 * Поля контакту — правила, спільні для картки, сервера й бота.
 *
 * **Чому окремо від коду.** Код (`code.ts`) — це адреса запрошення, а тут —
 * те, що власник про людину знає: ім'я, `@username`, Telegram-id, примітки й
 * хештеги. Це різні речі, і змішуються вони лише в одному рядку таблиці.
 *
 * Нормалізація вирішує, що саме ляже в базу: поле в картці показує, як воно
 * виглядатиме, а сервер **не дає записати більше** за стелю — інакше браузер
 * показував би одне, а в базі лежало друге (та сама межа, що в нотатках).
 * Довіри тут немає нікому: вхід приходить із клієнта, тож усе, що не є рядком
 * потрібної форми, стає порожнім значенням, а не помилкою.
 *
 * **Нічого конфіденційного.** Це власний довідник людини, а не сховище
 * секретів: тут немає ні паролів, ні ключів, ні адрес, і саме тому картка
 * показує ці поля відкрито.
 *
 * @module @wwwuabot/shared/contacts
 */

/** Стеля `@username` — рівно та, що дозволяє Telegram. */
export const MAX_CONTACT_USERNAME = 32;

/** Стеля приміток: примітка, а не документ (у нотатки своя, більша). */
export const MAX_CONTACT_NOTES = 2_000;

/** Усе, чим `@username` бути не може: `@`, пробіли й будь-що поза алфавітом. */
const NOT_USERNAME = /[^a-z0-9_]/g;

/**
 * `@username` із того, що ввели: без `@`, у нижньому регістрі, лише `a-z0-9_`.
 *
 * Регістр знижуємо, бо Telegram-хендли регістронезалежні: `@Karas` і `@karas` —
 * та сама людина, і два різні рядки в базі змушували б шукати її двічі.
 * Порожній результат — `null`, а не `""`: «не знаю хендла» це відсутність
 * значення, і в базі вона мусить бути `NULL`, а не порожнім рядком.
 */
export function sanitizeContactUsername(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const handle = input.trim().replace(/^@+/, "").toLowerCase().replace(NOT_USERNAME, "");
  return handle.slice(0, MAX_CONTACT_USERNAME) || null;
}

/**
 * Telegram-id із того, що ввели: ціле додатне число або `null`.
 *
 * Приймаємо і число, і рядок із цифрами (поле вводу завжди віддає рядок), але
 * не приймаємо ні дробових, ні нульових, ні від'ємних: id у Telegram завжди
 * ціле й додатне, і зберігати «майже id» означало б мати в базі значення, за
 * яким нікого не знайти.
 */
export function sanitizeTelegramId(input: unknown): number | null {
  const raw =
    typeof input === "number" ? String(input) : typeof input === "string" ? input.trim() : "";
  if (!/^\d{1,15}$/.test(raw)) return null;

  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Примітки: краї обрізаємо, всередині лишаємо як написано. */
export function sanitizeContactNotes(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, MAX_CONTACT_NOTES);
}
