/**
 * Застосування схеми — одна дія на три кольори **і** шрифт.
 *
 * Живе тут, а не в сторінці, бо «взяти схему собі» мусить означати одне й те
 * саме в усіх входах: у списку моїх схем, у спільній бібліотеці, у Просторі й
 * на готовій палітрі. Дві копії цієї послідовності розійшлися б — і десь
 * схема застосувала б колір, а шрифт лишила старий.
 *
 * @module @wwwuabot/shared/themes
 */

import { applyFont, saveStoredFont } from "../styles/font-dom";
import { applyColors, saveStoredColors } from "../styles/user-colors";
import { themeSchemeColors } from "./rules";
import type { ThemeScheme } from "./types";

/** Те, що мусить мати схема, щоб її можна було застосувати. */
export type ApplicableScheme = Pick<ThemeScheme, "bg" | "text" | "accent" | "font">;

/**
 * Взяти схему собі: три кольори й шрифт — у пам'ять пристрою **і** на екран.
 *
 * Запис передує застосуванню: якщо застосування чогось не дістане, у пам'яті
 * вже лежить ціла схема, і перезавантаження покаже саме її, а не половину.
 */
export function applyThemeScheme(scheme: ApplicableScheme): void {
  const colors = themeSchemeColors(scheme);
  saveStoredColors(colors);
  applyColors(colors);
  saveStoredFont(scheme.font);
  applyFont(scheme.font);
}
