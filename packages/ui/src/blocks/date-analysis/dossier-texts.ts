/**
 * Слова екрана досьє. Вони живуть тут, а не в ядрі: якір і визначення — дані
 * якості, а «не знаємо» — слово екрана. Переїзд цих слів у рядок `scenarios`
 * лишається відкритою роботою (`docs/SCREEN_TEXTS.md`).
 *
 * @module packages/ui/src/blocks/date-analysis/dossier-texts
 */

import type { ClaimLayer } from "@wwwuabot/shared/qualities";

export const LAYER_LABELS: Readonly<Record<ClaimLayer, string>> = {
  measured: "Ваші відповіді",
  narrative: "Опис",
  symbolic: "Традиція",
};

/** Наскільки певно — словом, без відсотків: відсоток читався б як точність. */
export function confidenceWord(confidence: number): string {
  if (confidence >= 0.6) return "високо";
  if (confidence >= 0.35) return "помірно";
  return "низько";
}

export const UNKNOWN_LABEL = "Не знаємо";
export const CONFLICT_LABEL = "Системи не згодні";
