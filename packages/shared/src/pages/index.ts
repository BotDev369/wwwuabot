/**
 * @wwwuabot/shared/pages — сторінки, які створює людина з готових шаблонів.
 *
 * Один домен на клієнт і сервер:
 *
 * - `templates.ts` — **два шаблони** («Візитка» і «Подія»): поля, з яких
 *   людина змінює лише текст, і чисті `buildPageConfig` / `readPageValues`,
 *   що переводять значення в `page_data` і назад;
 * - `address.ts` — адреса сторінки: переклад назви латиницею
 *   (`normalizePageSlug`), зайняті платформою сегменти (`RESERVED_PAGE_SLUGS`)
 *   і перевірка поля форми (`pageAddress`);
 * - `rules.ts` — межі полів і перевірка чернетки (`validatePageDraft`):
 *   обов'язкова лише назва, `isPublic` типово `false`;
 * - `bot.ts` — підпис для бота (`pageBotText`): назва й короткі поля
 *   шаблону, виведені з `page_data`;
 * - `types.ts` — `UserPage`, `PageDraft`, публічне подання `PublicPage`;
 * - `api.ts` — форма запиту до **двох** поверхонь: свої (`/api/user/pages`) і
 *   опубліковані (`/api/space/pages`).
 *
 * Сховище — той самий рядок `scenarios` (`@wwwuabot/shared/database/tables`),
 * господар `api-dev`. Чому не друга таблиця й що таке публічність —
 * `docs/CONTENT_MODEL.md` і `docs/SPACE.md`.
 *
 * @module @wwwuabot/shared/pages
 */

export {
  PAGE_SLUG_MAX,
  RESERVED_PAGE_SLUGS,
  isPageSlugTakenByPlatform,
  isReservedPageSlug,
  normalizePageSlug,
  pageAddress,
} from "./address";
export type { PageAddressResult } from "./address";
export { pageBotText } from "./bot";
export { cleanPageValue, pageDraft, sanitizePageValues, validatePageDraft } from "./rules";
export type { PageDraftInput, PageValidation } from "./rules";
export {
  DEFAULT_PAGE_TEMPLATE,
  PAGE_TEMPLATES,
  PAGE_TEMPLATE_KEYS,
  buildPageConfig,
  isPageTemplateKey,
  pageBlockId,
  pageTemplate,
  pageTitle,
  primaryField,
  readPageValues,
} from "./templates";
export type { PageField, PageFieldValues, PageTemplate, PageTemplateKey } from "./templates";
export { createPagesApi } from "./api";
export type { PagesApi, PagesApiPaths, PagesTransport } from "./api";
export type {
  PageDeleteResponse,
  PageDraft,
  PageListResponse,
  PageSaveResponse,
  PublicPage,
  PublicPageListResponse,
  UserPage,
} from "./types";
