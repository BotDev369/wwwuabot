/**
 * Підпис екрана аналізу: старий дефолт лишається в `page_data` рядків, створених
 * до зміни тексту, а міграцію в дев-базі запускає людина — тож нормалізація тут.
 *
 * @module packages/ui/src/blocks/date-analysis/title
 */

export const ANALYSIS_TITLE = "Аналіз дати";

/** Підписи, що лишились від старого дефолту, а не від людини. */
const LEGACY_TITLES = new Set(["Аналіз за датою народження"]);

export function analysisTitle(raw: string | undefined): string {
  const title = raw?.trim() ?? "";
  if (!title || LEGACY_TITLES.has(title)) return ANALYSIS_TITLE;
  return title;
}
