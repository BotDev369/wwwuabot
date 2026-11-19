/**
 * Слова екрана досьє. Вони живуть тут, а не в ядрі: якір і визначення — дані
 * якості, а «не знаємо» — слово екрана. Переїзд цих слів у рядок `scenarios`
 * лишається відкритою роботою (`docs/SCREEN_TEXTS.md`).
 *
 * @module packages/ui/src/blocks/date-analysis/dossier-texts
 */

import type { ClaimLayer } from "@wwwuabot/shared/qualities";

export const LAYER_LABELS: Readonly<Record<ClaimLayer, string>> = {
  measured: "Виміряне",
  narrative: "Наративне",
  symbolic: "Символічне",
};

/** Шар джерела — це межа доказовості, тож підпис каже її, а не «тип». */
export function confidenceWord(confidence: number): string {
  if (confidence >= 0.6) return "висока";
  if (confidence >= 0.35) return "помірна";
  return "низька";
}

export const UNKNOWN_LABEL = "Не знаємо";
export const CONFLICT_LABEL = "Розбіжність";
