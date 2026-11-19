/**
 * Профіль: розподіл свідчень, а не середнє. «Виміряне 4, символічне 2» — це
 * суперечність, яку видно, а не «3». Якість без свідчень — окремо, не середина.
 *
 * @module @wwwuabot/shared/qualities/profile
 */

import { QUALITIES } from "./domains";
import type { Quality, QualityClaim, QualityLevel } from "./types";

/** Підсумок однієї якості: розподіл, а не оцінка. */
export interface QualitySummary {
  readonly qualityId: string;
  readonly claims: number;
  /** Сума впевненостей свідчень рівня 4–5. */
  readonly support: number;
  /** Сума впевненостей свідчень рівня 1–2. */
  readonly oppose: number;
  /** Сума впевненостей рівня 3. */
  readonly middle: number;
  readonly byLevel: Readonly<Record<QualityLevel, number>>;
}

const EMPTY_LEVELS: Record<QualityLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/** Підсумок однієї якості за її свідченнями. */
export function summarizeQuality(
  claims: readonly QualityClaim[],
  qualityId: string,
): QualitySummary {
  const own = claims.filter((claim) => claim.qualityId === qualityId);
  const byLevel: Record<QualityLevel, number> = { ...EMPTY_LEVELS };
  let support = 0;
  let oppose = 0;
  let middle = 0;

  for (const claim of own) {
    byLevel[claim.level] += 1;
    if (claim.level >= 4) support += claim.confidence;
    else if (claim.level <= 2) oppose += claim.confidence;
    else middle += claim.confidence;
  }

  return {
    qualityId,
    claims: own.length,
    support: round(support),
    oppose: round(oppose),
    middle: round(middle),
    byLevel,
  };
}

/** Усі підсумки для набору свідчень — по рядку на кожну згадану якість. */
export function summarize(claims: readonly QualityClaim[]): QualitySummary[] {
  const ids = [...new Set(claims.map((claim) => claim.qualityId))];
  return ids.map((id) => summarizeQuality(claims, id));
}

/** Суперечність: є свідчення і за високий, і за низький рівень. Це зміст, не баг. */
export function hasConflict(summary: QualitySummary): boolean {
  return summary.support > 0 && summary.oppose > 0;
}

/**
 * Акценти — якості, де джерела кажуть «високо» й майже не сперечаються.
 * Сортування для показу, а не рейтинг людини: число назовні не йде.
 */
export function accents(claims: readonly QualityClaim[], limit = 5): QualitySummary[] {
  return summarize(claims)
    .filter((summary) => summary.support > 0)
    .sort((a, b) => b.support - b.oppose - (a.support - a.oppose))
    .slice(0, limit);
}

/** Якості, про які не сказано нічого: чесне «не знаємо», а не середина. */
export function unknownQualities(claims: readonly QualityClaim[]): readonly Quality[] {
  const known = new Set(claims.map((claim) => claim.qualityId));
  return QUALITIES.filter((quality) => !known.has(quality.id));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
