/**
 * @wwwuabot/shared/themes — схеми теми: три кольори, шрифт і публічність.
 *
 * Один модуль на три входи в цю сутність: бібліотеку власних схем, спільну
 * бібліотеку й готові палітри. Правила (що можна зберегти) — тут, клієнт API
 * — тут, а вигляд і сторінки — в оболонці.
 *
 * **Застосування схеми тут не експортується навмисно.** Воно малює екран
 * (`document`, `localStorage`), а цей файл імпортує **сервер** (перевірка схеми
 * в `api-dev`) — і одне DOM-значення затягло б у збірку воркера всю клієнтську
 * половину. Тому воно живе за власним входом: `@wwwuabot/shared/themes/apply`.
 *
 * @module @wwwuabot/shared/themes
 */

export { createThemesApi } from "./api";
export type { ThemesApi, ThemesApiPaths, ThemesTransport } from "./api";
export {
  THEME_NAME_MAX_LENGTH,
  isThemeApplied,
  themeSchemeColors,
  validateThemeName,
  validateThemeScheme,
} from "./rules";
export type { ThemeValidation } from "./rules";
export type {
  ThemeDeleteResponse,
  ThemeListResponse,
  ThemeSaveResponse,
  ThemeScheme,
  ThemeSchemeInput,
} from "./types";
