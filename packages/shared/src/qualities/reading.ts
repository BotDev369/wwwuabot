/**
 * Читання досьє: свідчення → домени → рівень якості. Рівень тут — **провідний
 * рівень свідчень**, а не середнє: розбіжність лишається розбіжністю (`level`
 * порожній), а якість без свідчень — порожньою, не «серединою».
 *
 * @module @wwwuabot/shared/qualities/reading
 */

import { QUALITY_DOMAINS } from "./domains";
import { hasConflict, summarizeQuality, type QualitySummary } from "./profile";
import type { Quality, QualityClaim, QualityDomain, QualityLevel } from "./types";

/** Одна якість у досьє: її свідчення, розподіл і те, що показувати. */
export interface QualityReading {
  readonly quality: Quality;
  readonly claims: readonly QualityClaim[];
  readonly summary: QualitySummary;
  /** Провідний рівень; `null` — розбіжність або жодного свідчення. */
  readonly level: QualityLevel | null;
  /** Протилежні боки шкали: є і високий, і низький рівень. */
  readonly conflict: boolean;
  /** Будь-яка різниця рівнів між джерелами — її не усереднюємо. */
  readonly divergent: boolean;
}

/** Домен досьє разом із тим, скільки його якостей мають свідчення. */
export interface DomainReading {
  readonly domain: QualityDomain;
  readonly qualities: readonly QualityReading[];
  readonly known: number;
}

const LEVELS: readonly QualityLevel[] = [1, 2, 3, 4, 5];

/** Якість без свідчень: `level` порожній, розподіл нульовий. */
function emptySummary(qualityId: string): QualitySummary {
  return {
    qualityId,
    claims: 0,
    support: 0,
    oppose: 0,
    middle: 0,
    byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

/**
 * Провідний рівень — найвагоміший за сумою впевненостей. Рівність ваг
 * розв'язує вищий рівень: це вибір показу, а не оцінка, і він мусить бути
 * детермінованим.
 */
function leadingLevel(claims: readonly QualityClaim[]): QualityLevel | null {
  if (claims.length === 0) return null;
  const weight: Record<QualityLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const claim of claims) weight[claim.level] += claim.confidence;
  let best: QualityLevel | null = null;
  for (const level of LEVELS) {
    if (weight[level] > 0 && (best === null || weight[level] >= weight[best])) best = level;
  }
  return best;
}

/** Читання однієї якості за свідченнями всього досьє. */
export function readQuality(claims: readonly QualityClaim[], quality: Quality): QualityReading {
  const own = claims.filter((claim) => claim.qualityId === quality.id);
  if (own.length === 0) {
    return {
      quality,
      claims: [],
      summary: emptySummary(quality.id),
      level: null,
      conflict: false,
      divergent: false,
    };
  }
  const summary = summarizeQuality(claims, quality.id);
  const conflict = hasConflict(summary);
  const divergent = new Set(own.map((claim) => claim.level)).size > 1;
  return {
    quality,
    claims: own,
    summary,
    level: conflict || divergent ? null : leadingLevel(own),
    conflict,
    divergent,
  };
}

/** Усе досьє: кожен домен і кожна його якість — навіть без свідчень. */
export function readDossier(claims: readonly QualityClaim[]): readonly DomainReading[] {
  return QUALITY_DOMAINS.map((domain) => {
    const qualities = domain.qualities.map((quality) => readQuality(claims, quality));
    return {
      domain,
      qualities,
      known: qualities.filter((reading) => reading.claims.length > 0).length,
    };
  });
}

/** Джерела, які висловились, — без повторів і в порядку першої появи. */
export function claimSources(claims: readonly QualityClaim[]): readonly string[] {
  return [...new Set(claims.map((claim) => claim.sourceId))];
}

/** Якір рівня — поведінковий опис, а не число. */
export function anchorOf(quality: Quality, level: QualityLevel): string {
  return quality.anchors[level - 1] ?? quality.definition;
}
