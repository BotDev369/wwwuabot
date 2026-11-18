/**
 * @wwwuabot/shared/pages — шаблони сторінок і рядок сценарію, який веде людина.
 *
 * Один домен на клієнт і сервер:
 *
 * - `templates.ts` — **чотири шаблони** («Візитка», «Подія», «Магазин», «Стаття»): готовий каркас
 *   сторінки (`layout` — картки, щаблі заголовків, розділювач), поля, з яких
 *   людина змінює лише текст, і текст-приклад для перегляду (`preview`);
 * - `page-data.ts` — чисті `buildPageConfig` / `readPageValues` /
 *   `fieldPlacements`, що переводять значення в `page_data` і назад;
 * - `address.ts` — зайняті платформою сегменти (`RESERVED_PAGE_SLUGS`);
 * - `bot.ts` — підпис для бота (`pageBotText`): назва й короткі поля
 *   шаблону, виведені з `page_data`;
 * - `access.ts` — **хто веде й хто бачить**: власник і адміни
 *   (`scenarios.admin_ids`), роль людини (`pageRole`), ті, кому йдуть
 *   замовлення (`pageStaffIds`), і глядачі приватної сторінки
 *   (`scenarios.viewer_ids`, `pageVisibleTo`);
 * - `types.ts` — `ManagedScenario` і `PageStaff`: те, що клієнт **читає**;
 * - `api.ts` — форма одного запиту: сценарії, які веде людина
 *   (`/api/user/pages`).
 *
 * **Запису тут немає.** Сторінку створює й публікує платформа — кодом і
 * міграціями, а не форма в інтерфейсі. Тому ні чернетки, ні перевірки полів, ні
 * відповідей запису в домені не лишилось: дія, якої не існує, не має й типу.
 *
 * Сховище — той самий рядок `scenarios` (`@wwwuabot/shared/database/tables`),
 * господар `api-dev`. Чому не друга таблиця й що таке публічність —
 * `docs/CONTENT_MODEL.md` і `docs/VISIBILITY.md`.
 *
 * @module @wwwuabot/shared/pages
 */

export { RESERVED_PAGE_SLUGS } from "./address";
export { pageBotText } from "./bot";
export {
  PAGE_ADMINS_MAX,
  PAGE_VIEWERS_MAX,
  adminIdError,
  adminIdsJson,
  cleanAdminIds,
  cleanViewerIds,
  isPageManager,
  pageAdminIds,
  pageAdminsOf,
  pageRole,
  pageStaffIds,
  pageViewerIds,
  pageVisibleTo,
  viewerIdsJson,
} from "./access";
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
export type { ManagedScenario, PageListResponse, PageRole, PageStaff } from "./types";
