/**
 * @wwwuabot/shared/ads — оголошення: дошка, яку наповнюють самі люди.
 *
 * Один домен на клієнт і сервер:
 *
 * - `rules.ts` — види, межі й перевірка: за ними введене стає даними (ті самі
 *   межі тримає форма й `api-dev`, інакше поле дало б набрати те, що сервер
 *   потім обріже мовчки);
 * - `types.ts` — `Ad`, `AdDraft` і відповіді API;
 * - `api.ts` — форма запиту до **двох** поверхонь: своє (`/api/user/ads`) і
 *   дошка (`/api/space/ads`).
 *
 * Сховище — таблиця `ads` (`@wwwuabot/shared/database/tables`), господар
 * `api-dev`. Правила видимості — `docs/SPACE.md`.
 *
 * @module @wwwuabot/shared/ads
 */

export {
  AD_BODY_MAX,
  AD_KINDS,
  AD_KIND_LABELS,
  AD_PLACE_MAX,
  AD_PRICE_MAX,
  AD_TITLE_MAX,
  DEFAULT_AD_KIND,
  adKindLabel,
  isAdKind,
  sanitizeBody,
  sanitizeLine,
  validateAd,
} from "./rules";
export type { AdInput, AdKind, AdValidation } from "./rules";
export type {
  Ad,
  AdBoardResponse,
  AdDeleteResponse,
  AdDraft,
  AdListResponse,
  AdSaveResponse,
} from "./types";
export { createAdsApi } from "./api";
export type { AdsApi, AdsApiPaths, AdsTransport } from "./api";
