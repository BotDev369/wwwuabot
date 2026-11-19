/**
 * Слова екрана портрет. Вони живуть тут, а не в ядрі: якір і визначення — дані
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

/** Коли системи розійшлися — факт, а не оцінка: обидві відповіді видно поруч. */
export const CONFLICT_LABEL = "Різні відповіді";
