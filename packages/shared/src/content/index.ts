/**
 * Контент сторінок — один вхід для всіх, хто його читає.
 *
 * Модель, адаптери зі сховищ і правило вибору сторінки за URL. Деталі кожного
 * файла — у його власному заголовку; чому це взагалі з'явилось — у
 * `docs/CONTENT_MODEL.md`.
 *
 * @module @wwwuabot/shared/content
 */

export type { ContentPage, ContentSource, ScenarioContentRow } from "./types";
export { contentPageFromScenario, contentPageFromSitePage } from "./adapters";
export { HOME_KEY, contentKeyFromPath, pickContentPage } from "./resolve";
