/**
 * Три кольори користувача — **самі типи**, без роботи з екраном.
 *
 * Виділено з `./user-colors` навмисно: перевірка схеми теми живе на сервері
 * (`api-dev`), а сервер не має ні `document`, ні `localStorage`. Одне
 * значення з DOM затягло б у збірку воркера всю клієнтську половину — тому
 * «що таке слот» і «як його застосувати» тепер у різних файлах, а
 * `./user-colors` реекспортує ці імена, щоб наявні імпорти не мінялись.
 *
 * @module packages/shared/src/styles/user-colors.types
 */

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
