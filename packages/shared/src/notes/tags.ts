/**
 * Хештеги нотатки — чисті правила, без React і без стану.
 *
 * **Чому в спільному, а не біля композера.** Хештег — одна «щільна» одиниця без
 * пробілів: саме так його читають і Telegram, і будь-який пошук. Тому
 * нормалізація вирішує, чи стане введене тегом — і чи знайдеться нотатка потім.
 * Правила, які вирішують долю даних, мусять бути в одному місці: та сама
 * функція вживається і в браузері (чипи в композері), і на сервері (що саме
 * ляже в `notes.tags`). Дві копії тут розійшлись би тихо — і «#Київ» з одного
 * боку не знайшовся б «#київ» з другого.
 *
 * @module @wwwuabot/shared/notes
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

/**
 * Хештеги з того, що прийшло **ззовні**: клієнта або колонки `notes.tags`.
 *
 * Довіри тут немає нікому: вхід може бути не масивом, масивом не рядків чи
 * JSON-ом зі старішого правила. Те, що не стає хештегом, просто не потрапляє
 * у результат — це єдина політика, якої тут можна дотриматись.
 */
export function sanitizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  const tags: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const tag = normalizeTag(item);
    if (!tag || tags.includes(tag)) continue;
    tags.push(tag);
    if (tags.length >= MAX_NOTE_TAGS) break;
  }
  return tags;
}

/** Хештеги з колонки `tags` (JSON-масив). Зіпсований JSON — це порожній список. */
export function parseTagsJson(raw: unknown): string[] {
  if (Array.isArray(raw)) return sanitizeTags(raw);
  if (typeof raw !== "string" || raw.trim() === "") return [];
  try {
    return sanitizeTags(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Хештеги для запису в колонку: те саме, що читає `parseTagsJson`. */
export function tagsToJson(tags: unknown): string {
  return JSON.stringify(sanitizeTags(tags));
}
