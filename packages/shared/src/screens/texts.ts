/**
 * Тексти екрана — блоки `text` у `page_data` його рядка `scenarios`.
 *
 * Ключ тексту — `id` блока, значення — `props.content`: екран не тримає
 * жодного слова в коді, а адмінка править їх як контент (AGENTS.md §7).
 *
 * @module @wwwuabot/shared/screens
 */

import { ALL_ZONES, parsePageConfig } from "../types/page-config";
import type { PageBlock, PageConfig } from "../types/page-config";

/** Тексти екрана: ключ блока → написане в ньому. */
export type ScreenTexts = Record<string, string>;

/**
 * Тексти з `page_data`. Читає лише блоки `text` із непорожнім `content`:
 * порожній рядок у базі означає «слова немає», а не «підпис без літер».
 * Бите або відсутнє `page_data` дає `{}` — екран тоді не показує тексту.
 */
export function readScreenTexts(pageData: string | PageConfig | null): ScreenTexts {
  const config = toConfig(pageData);
  const texts: ScreenTexts = {};
  if (!config) return texts;
  for (const zone of ALL_ZONES) collectTexts(config.zones[zone], texts);
  return texts;
}

/** Текст за ключем; немає — порожньо. Типового тексту в коді немає навмисно. */
export function screenText(texts: ScreenTexts, key: string): string {
  return texts[key] ?? "";
}

/** Ключі, яких у рядку немає: звіт для дампу й тестів, а не для екрана. */
export function missingScreenTexts(texts: ScreenTexts, keys: readonly string[]): string[] {
  return keys.filter((key) => screenText(texts, key) === "");
}

function toConfig(pageData: string | PageConfig | null): PageConfig | null {
  if (typeof pageData === "string") return parsePageConfig(pageData);
  if (pageData && typeof pageData === "object" && pageData.zones) return pageData;
  return null;
}

/** Рекурсія по дітях: текст усередині картки — теж текст екрана. */
function collectTexts(blocks: readonly PageBlock[], into: ScreenTexts): void {
  for (const block of blocks) {
    const content = block.type === "text" ? block.props.content : null;
    if (typeof content === "string" && content.trim() !== "") into[block.id] = content;
    if (block.children) collectTexts(block.children, into);
  }
}
