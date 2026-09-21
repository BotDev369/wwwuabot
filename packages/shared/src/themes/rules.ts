/**
 * Правила схеми теми — одні на клієнт і сервер.
 *
 * Перевірка стоїть **перед** записом і на формі, і в контролері: поле, яке дає
 * набрати те, що сервер потім обріже мовчки, читається як поламана кнопка.
 * Тому тут чисті функції без стану — так само, як `shared/user/public-profile`.
 *
 * @module @wwwuabot/shared/themes
 */

import { isHexColor, normalizeHex } from "../styles/color";
import { isThemeFontId } from "../styles/fonts";
// Саме `…user-colors.types`, а не `…user-colors`: друге малює екран, а цей
// файл читає **сервер** (він не має ні `document`, ні `localStorage`).
import type { UserColors } from "../styles/user-colors.types";
import type { ThemeScheme, ThemeSchemeInput } from "./types";

/** Скільки символів уміщає назва схеми. Обмеження одне на клієнт і сервер. */
export const THEME_NAME_MAX_LENGTH = 40;

/** Результат перевірки: або те, що можна писати, або **причина** відмови. */
export type ThemeValidation =
  { ok: true; value: ThemeSchemeInput } | { ok: false; message: string };

/** Три кольори схеми — те, що `applyColors()` уміє застосувати. */
export function themeSchemeColors(scheme: Pick<ThemeScheme, "bg" | "text" | "accent">): UserColors {
  return { bg: scheme.bg, text: scheme.text, accent: scheme.accent };
}

/** Назва: порожня не має сенсу — схему шукають саме за нею. */
export function validateThemeName(
  raw: unknown,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== "string") return { ok: false, message: "Очікується назва" };
  const value = raw.trim();
  if (!value) return { ok: false, message: "Дайте схемі назву" };
  if (value.length > THEME_NAME_MAX_LENGTH) {
    return { ok: false, message: `Занадто довга назва: до ${THEME_NAME_MAX_LENGTH} символів` };
  }
  return { ok: true, value };
}

/** Один колір: `#aabbcc` у будь-якому регістрі — у канонічному вигляді. */
function readColor(
  raw: unknown,
  label: string,
): { ok: true; value: string } | { ok: false; message: string } {
  if (typeof raw !== "string" || !isHexColor(raw)) {
    return { ok: false, message: `Колір «${label}» має бути у вигляді #aabbcc` };
  }
  return { ok: true, value: normalizeHex(raw) ?? raw.toLowerCase() };
}

/** Шрифт: порожньо — «як у стилі», інакше — відомий ідентифікатор із набору. */
function readFont(raw: unknown): { ok: true; value: string } | { ok: false; message: string } {
  if (raw === null || raw === undefined || raw === "") return { ok: true, value: "" };
  if (!isThemeFontId(raw)) return { ok: false, message: "Такого шрифту в наборі немає" };
  return { ok: true, value: raw };
}

/**
 * Перевірка схеми. Невідомі ключі не переносяться: у базі мусить лежати рівно
 * те, що описує тип, інакше схема тягне за собою те, чого ми не читаємо.
 */
export function validateThemeScheme(raw: unknown): ThemeValidation {
  if (typeof raw !== "object" || raw === null) return { ok: false, message: "Очікується схема" };
  const source = raw as Record<string, unknown>;

  const name = validateThemeName(source.name);
  if (!name.ok) return name;

  const bg = readColor(source.bg, "Фон");
  if (!bg.ok) return bg;
  const text = readColor(source.text, "Основний");
  if (!text.ok) return text;
  const accent = readColor(source.accent, "Акцент");
  if (!accent.ok) return accent;

  const font = readFont(source.font);
  if (!font.ok) return font;

  const id = Number(source.id);
  return {
    ok: true,
    value: {
      ...(Number.isInteger(id) && id > 0 ? { id } : {}),
      name: name.value,
      bg: bg.value,
      text: text.value,
      accent: accent.value,
      font: font.value,
      isPublic: source.isPublic === true || source.isPublic === 1 || source.isPublic === "1",
    },
  };
}

/** Чи ця схема діє на екрані **просто зараз** (кольори й шрифт збігаються). */
export function isThemeApplied(
  scheme: Pick<ThemeScheme, "bg" | "text" | "accent" | "font">,
  colors: Partial<UserColors>,
  font: string,
): boolean {
  return (
    scheme.bg === colors.bg &&
    scheme.text === colors.text &&
    scheme.accent === colors.accent &&
    scheme.font === font
  );
}
