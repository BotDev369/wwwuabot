/**
 * Хештеги нотатки — чисті правила, без React і без стану.
 *
 * Хештег — це одна «щільна» одиниця без пробілів: саме так його читають і
 * Telegram, і будь-який пошук. Тому нормалізація тут не косметика, вона
 * вирішує, чи стане введене тегом — і чи знайдеться потім.
 *
 * @module @wwwuabot/ui/composer
 */

/** Стеля кількості: більше — це вже не мітки, а текст. */
export const MAX_NOTE_TAGS = 10;

/** Стеля довжини одного хештега. */
export const MAX_TAG_LENGTH = 32;

/** Усе, чим хештег бути не може: пробіли, коми й сам знак `#`. */
const NOT_TAG = /[\s,#]+/g;

/** Чим людина природно перелічує теги — і по чому поле їх розрізає. */
const SEPARATORS = /[\s,]+/;

/** Нормалізує введене до вигляду хештега: без `#`, без пробілів, нижній регістр. */
export function normalizeTag(raw: string): string {
  return raw.replace(NOT_TAG, "").slice(0, MAX_TAG_LENGTH).toLocaleLowerCase("uk-UA");
}

/** Розбирає введений рядок на хештеги (порожні частини відкидаються). */
export function parseTags(raw: string): string[] {
  return raw
    .split(SEPARATORS)
    .map(normalizeTag)
    .filter((tag) => tag.length > 0);
}

/**
 * Додає хештеги з рядка: без повторів і понад стелю.
 * Повертає **той самий** масив, якщо нічого не додалось, — щоб не смикати
 * перемальовування на кожен зайвий пробіл.
 */
export function addTags(tags: readonly string[], raw: string): readonly string[] {
  const next = [...tags];
  for (const tag of parseTags(raw)) {
    if (next.length >= MAX_NOTE_TAGS) break;
    if (!next.includes(tag)) next.push(tag);
  }
  return next.length === tags.length ? tags : next;
}

/** Прибирає хештег — порівняння після нормалізації, як у `addTags`. */
export function removeTag(tags: readonly string[], raw: string): readonly string[] {
  const tag = normalizeTag(raw);
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : tags;
}
