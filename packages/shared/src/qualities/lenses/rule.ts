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

/**
 * Одна якість — одне свідчення на систему. Різні показники тієї самої
 * системи часто ведуть до тієї ж якості; показуємо найсильніше, щоб
 * «скільки систем назвали» не рахувало одну систему двічі.
 */
export function strongestPerQuality(claims: readonly QualityClaim[]): readonly QualityClaim[] {
  const best = new Map<string, QualityClaim>();
  for (const claim of claims) {
    const previous = best.get(claim.qualityId);
    if (!previous) {
      best.set(claim.qualityId, claim);
      continue;
    }
    const stronger = claim.level > previous.level ? claim : previous;
    const merged = [...new Set([...(previous.details ?? []), ...(claim.details ?? [])])];
    best.set(claim.qualityId, merged.length > 0 ? { ...stronger, details: merged } : stronger);
  }
  return [...best.values()];
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
