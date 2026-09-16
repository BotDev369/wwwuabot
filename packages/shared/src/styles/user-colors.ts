/**
 * ═══════════════════════════════════════════════════════════════════════════
 * USER COLORS — три кольори користувача (фон / основний / акцент)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Одна філософія замість «світла / темна»: людина задає **три** кольори, і все
 * інше продукт виводить із них сам (`user-colors.css`, `color-mix()`).
 *
 *   1. Фон      — тло екрана та нативного хрому Telegram;
 *   2. Основний — текст, межі й поверхні (картки, поля);
 *   3. Акцент   — кнопки, посилання, вибране.
 *
 * Правило одне і воно жорстке: **порожніх не буває**. Двох кольорів замало —
 * без третього не видно ні тексту, ні дії, тож збереження чекає, доки будуть
 * усі три (`missingSlots` каже, яких саме).
 *
 * Сховище — `localStorage` (`wwwuabot-colors`), той самий підхід і ключі, що й
 * у бренду (`initTheme`): вибір переживає перезавантаження і застосовується до
 * першого рендера, без мигання.
 *
 * @module packages/shared/src/styles/user-colors
 */

import { contrastRatio, isDarkColor, isHexColor, normalizeHex } from "./color";

/** Роль кольору. Порядок — той, у якому його читає людина: тло → текст → акцент. */
export type ColorSlot = "bg" | "text" | "accent";

/** Три кольори — усі обов'язкові. */
export type UserColors = Record<ColorSlot, string>;

/** Незавершений вибір: щонайменше один слот порожній. */
export type ColorDraft = Partial<UserColors>;

/** Схема, яку з трьох кольорів рахує сам продукт (`data-colors-mode`). */
export type ColorsMode = "light" | "dark";

export interface ColorSlotDefinition {
  id: ColorSlot;
  labelUk: string;
  hintUk: string;
}

export const COLOR_SLOTS: readonly ColorSlotDefinition[] = [
  { id: "bg", labelUk: "Фон", hintUk: "Тло екрана, карток і шапки Telegram" },
  { id: "text", labelUk: "Основний", hintUk: "Текст, межі та поверхні" },
  { id: "accent", labelUk: "Акцент", hintUk: "Кнопки, посилання й вибране" },
];

export const USER_COLORS_KEY = "wwwuabot-colors";
/** DOM-атрибут на `<html>`: без нього працює брендова базова палітра. */
export const COLORS_ATTR = "data-colors";
/** Схема, виведена з фону: нею CSS вибирає напрям тіней і `color-scheme`. */
export const COLORS_MODE_ATTR = "data-colors-mode";

/** CSS-змінна сідового кольору на `<html>` (їх читає `user-colors.css`). */
export function seedVariable(slot: ColorSlot): string {
  return `--user-${slot}`;
}

/** Порожні слоти — рівно те, чого бракує, щоб зберегти. */
export function missingSlots(draft: ColorDraft): ColorSlot[] {
  return COLOR_SLOTS.map((slot) => slot.id).filter((slot) => !draft[slot]);
}

/** Усі три на місці — аж тепер вибір можна зберегти. */
export function isCompleteColors(draft: ColorDraft): draft is UserColors {
  return missingSlots(draft).length === 0;
}

/** Підпис відсутніх кольорів для рядка-підказки. */
export function missingLabels(draft: ColorDraft): string[] {
  return missingSlots(draft).map(
    (slot) => COLOR_SLOTS.find((definition) => definition.id === slot)?.labelUk ?? slot,
  );
}

/** Схема палітри: світлий фон — світла схема. Рахується з фону, а не вибирається. */
export function colorsMode(bg: string): ColorsMode {
  return isDarkColor(bg) ? "dark" : "light";
}

/**
 * Колір підпису на акцентній плашці: виграє той, хто далі від акценту.
 * Це і є `--text-inverse` — без нього напис на акцентній кнопці міг би злитися.
 */
export function onAccentColor(colors: UserColors): string {
  return contrastRatio(colors.accent, colors.bg) >= contrastRatio(colors.accent, colors.text)
    ? colors.bg
    : colors.text;
}

/**
 * Чесне попередження про нечитабельний вибір — або `null`, коли все гаразд.
 * Це не заборона (людина має право на будь-який вибір), а те, що інакше
 * довелось би побачити вже на екрані.
 */
export function contrastWarning(colors: UserColors): string | null {
  if (contrastRatio(colors.bg, colors.text) < 4.5) {
    return "Основний колір замало відрізняється від фону — текст буде важко читати.";
  }
  if (contrastRatio(colors.bg, colors.accent) < 1.6) {
    return "Акцент майже зливається з фоном — кнопок і посилань не буде видно.";
  }
  return null;
}

/** Рядок із локальної пам'яті → три кольори. Будь-що стороннє — `null`. */
export function parseStoredColors(raw: string | null): UserColors | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;

  const stored = data as Record<string, unknown>;
  const draft: ColorDraft = {};
  for (const { id } of COLOR_SLOTS) {
    const value = stored[id];
    draft[id] = typeof value === "string" ? (normalizeHex(value) ?? value) : "";
  }
  return isCompleteColors(draft) ? draft : null;
}

/** Читання з `localStorage` (поза браузером і при смітті — `null`). */
export function readStoredColors(): UserColors | null {
  try {
    return parseStoredColors(localStorage.getItem(USER_COLORS_KEY));
  } catch {
    return null;
  }
}

/** Запис вибору. Порожній вибір не пишеться ніколи: його немає за побудовою. */
export function saveStoredColors(colors: UserColors): void {
  try {
    localStorage.setItem(USER_COLORS_KEY, JSON.stringify(colors));
  } catch {
    /* приватний режим — вибір просто не переживе перезавантаження */
  }
}

/** Забути вибір: продукт вертається до брендової базової палітри. */
export function clearStoredColors(): void {
  try {
    localStorage.removeItem(USER_COLORS_KEY);
  } catch {
    /* нічого не втрачено */
  }
}

/**
 * Застосувати вибір до документа (або зняти його — `null`).
 *
 * Значення летять у CSS-змінні на `<html>`, а всю решту палітри виводить
 * `user-colors.css`. Тому тут три кольори і дві похідні — і нічого більше:
 * друга таблиця «слот → токен» у TS розійшлася б із CSS на першій же правці.
 */
export function applyColors(colors: UserColors | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;

  if (!colors) {
    root.removeAttribute(COLORS_ATTR);
    root.removeAttribute(COLORS_MODE_ATTR);
    for (const { id } of COLOR_SLOTS) root.style.removeProperty(seedVariable(id));
    root.style.removeProperty("--user-on-accent");
    return;
  }

  root.setAttribute(COLORS_ATTR, "custom");
  root.setAttribute(COLORS_MODE_ATTR, colorsMode(colors.bg));
  root.style.setProperty(seedVariable("bg"), colors.bg);
  root.style.setProperty(seedVariable("text"), colors.text);
  root.style.setProperty(seedVariable("accent"), colors.accent);
  root.style.setProperty("--user-on-accent", onAccentColor(colors));
}

/** Чи два вибори — це той самий вибір (щоб не малювати «незбережене» даремно). */
export function isSameColors(a: ColorDraft, b: ColorDraft): boolean {
  return COLOR_SLOTS.every(({ id }) => (a[id] ?? "") === (b[id] ?? ""));
}

/** Зрозуміле подання кольору для рядка в панелі: `#aabbcc` або «порожньо». */
export function displayColor(value: string | undefined): string {
  if (!value) return "порожньо";
  return normalizeHex(value) ?? value;
}

export { isHexColor };
