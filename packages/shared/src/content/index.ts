/**
 * Контент сторінок — один вхід для всіх, хто його читає.
 *
 * Модель, адаптери зі сховищ і правило «яка сторінка відповідає цій адресі».
 * Деталі кожного файла — у його власному заголовку; чому це взагалі
 * з'явилось — у `docs/CONTENT_MODEL.md`.
 *
 * @module @wwwuabot/shared/content
 */

export type { ContentPage, ContentSource, ScenarioContentRow } from "./types";
export { contentPageFromScenario, contentPageFromSitePage } from "./adapters";
export {
  TELEGRAM_ORIGIN,
  buildShareLinks,
  isValidBotUsername,
  normalizeBotUsername,
  type ShareLinkReason,
  type ShareLinks,
  type ShareLinksInput,
} from "./link";
export {
  BOT_SEPARATOR,
  HOME_SLUG,
  LEGACY_HOME_KEY,
  MAX_BOT_PAYLOAD,
  WEB_SEPARATOR,
  botPayloadSegments,
  isDeepLinkable,
  isValidSlug,
  normalizeSlug,
  pickContentPage,
  resolveBotPayload,
  resolveContentRoute,
  slugSegments,
  toBotPayload,
  toWebPath,
  type ContentRoute,
} from "./resolve";
