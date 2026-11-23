/**
 * Екрани платформи як контент: адреса, назва й батько — у `registry.json`
 * (той самий рядок, що їде в `platform_screens`), слова — у `page_data`.
 * Правило й порядок — `docs/SCREEN_TEXTS.md`.
 *
 * @module @wwwuabot/shared/screens
 */

export {
  PLATFORM_SCREENS,
  SCREENS,
  SCREEN_RESERVED_SLUGS,
  isPlatformScreenKey,
  matchScreen,
  screenByKey,
  screenChain,
  screenHref,
  screenKeyOfPath,
  screenLabel,
  screenPath,
  screenRoot,
} from "./registry";
export type { ScreenDef, ScreenMatch, ScreenRow } from "./registry";

export { formatScreenText, missingScreenTexts, readScreenTexts, screenText } from "./texts";
export type { ScreenTexts } from "./texts";
