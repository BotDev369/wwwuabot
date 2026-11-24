/**
 * Підпис верхівки — один короткий рядок під назвою екрана, для ВСІХ екранів:
 * назва з реєстру, підпис підсторінки — від розділу. Сторінки власних верхівок
 * не малюють (docs/PLATFORM.md). Тексти — у JSON поруч із реєстром екранів.
 *
 * @module web-platform-dev/src/layout/screen-lead
 */

import leads from "./screen-leads.json";

/** Підписи розділів: один рядок, без крапки в кінці думки — це підказка. */
const SECTION_LEADS = leads.sections as Readonly<Record<string, string>>;

/** Підписи підсторінок: уточнюють розділ, але не повторюють його назву. */
const SCREEN_LEADS = leads.screens as Readonly<Record<string, string>>;

/**
 * Підпис для ключа екрана. Немає власного — беремо розділ; немає й розділу —
 * `null`, і верхівка лишається тільки з назвою (порожній рядок не малюємо).
 */
export function screenLead(key: string | null | undefined): string | null {
  if (!key) return null;
  if (SCREEN_LEADS[key]) return SCREEN_LEADS[key];
  // Крок проходження (`analysis.test` усередині `analysis.tests`) успадковує
  // підпис свого розділу, а не губиться.
  const root = key.split(".")[0];
  if (SECTION_LEADS[key]) return SECTION_LEADS[key];
  if (SCREEN_LEADS[root]) return SCREEN_LEADS[root];
  return SECTION_LEADS[root] ?? null;
}
