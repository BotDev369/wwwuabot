/**
 * Таблиця лінзи: рядок правила й збирання свідчень. Доказ мусить називати
 * вихід системи, інакше рівень неможливо перевірити.
 *
 * @module @wwwuabot/shared/qualities/lenses/rule
 */

import { makeClaim } from "../claims";
import type { LensDefinition, QualityClaim, QualityLevel } from "../types";

/** Одне правило: якість, рівень традиції й чому саме так. */
export interface LensRule {
  readonly qualityId: string;
  readonly level: QualityLevel;
  readonly note: string;
}

/** Свідчення таблиці; префікс — вихід системи, з якого взято правило. */
export function claimsOf(
  lens: LensDefinition,
  evidencePrefix: string,
  rules: readonly LensRule[],
): readonly QualityClaim[] {
  return rules.map((rule) =>
    makeClaim({
      qualityId: rule.qualityId,
      level: rule.level,
      layer: "symbolic",
      sourceId: lens.id,
      sourceVersion: lens.version,
      method: "mapped",
      evidence: `${evidencePrefix}: ${rule.note}`,
    }),
  );
}
