/**
 * @wwwuabot/shared/pages — сторінки, які створює людина з готових шаблонів.
 *
 * Один домен на клієнт і сервер:
 *
 * - `templates.ts` — **три шаблони** («Візитка», «Подія», «Магазин»): готовий каркас
 *   сторінки (`layout` — картки, щаблі заголовків, розділювач), поля, з яких
 *   людина змінює лише текст, і текст-приклад для перегляду (`preview`);
 * - `page-data.ts` — чисті `buildPageConfig` / `readPageValues` /
 *   `fieldPlacements`, що переводять значення в `page_data` і назад;
 * - `address.ts` — адреса сторінки: переклад назви латиницею
 *   (`normalizePageSlug`), зайняті платформою сегменти (`RESERVED_PAGE_SLUGS`)
 *   і перевірка поля форми (`pageAddress`);
 * - `rules.ts` — межі полів і перевірка чернетки (`validatePageDraft`):
 *   обов'язкова лише назва, `isPublic` типово `false`;
 * - `bot.ts` — підпис для бота (`pageBotText`): назва й короткі поля
 *   шаблону, виведені з `page_data`;
 * - `access.ts` — **хто веде сторінку**: власник і адміни
 *   (`scenarios.admin_ids`), роль людини (`pageRole`) і ті, кому йдуть
 *   замовлення та повідомлення (`pageStaffIds`);
 * - `types.ts` — `UserPage`, `PageDraft`, `PageStaff`, публічне подання `PublicPage`;
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
export {
  PAGE_ADMINS_MAX,
  adminIdError,
  adminIdsJson,
  cleanAdminIds,
  isPageManager,
  pageAdminIds,
  pageAdminsOf,
  pageRole,
  pageStaffIds,
} from "./access";
export { cleanPageValue, pageDraft, sanitizePageValues, validatePageDraft } from "./rules";
export type { PageDraftInput, PageValidation } from "./rules";
export {
  DEFAULT_PAGE_TEMPLATE,
  PAGE_TEMPLATES,
  PAGE_TEMPLATE_KEYS,
  isPageTemplateKey,
  pageBlockId,
  pageTemplate,
  pageTitle,
  primaryField,
} from "./templates";
export type {
  PageBlockSpec,
  PageField,
  PageFieldLook,
  PageFieldPlacement,
  PageFieldValues,
  PageTemplate,
  PageTemplateKey,
} from "./templates";
export { buildPageConfig, fieldPlacements, readPageValues } from "./page-data";
export { createPagesApi } from "./api";
export type { PagesApi, PagesApiPaths, PagesTransport } from "./api";
export type {
  PageDeleteResponse,
  PageDraft,
  PageListResponse,
  PageRole,
  PageSaveResponse,
  PageStaff,
  PublicPage,
  PublicPageListResponse,
  UserPage,
} from "./types";
