/**
 * Публічна поверхня ядра: онтологія, свідчення, профіль, лінзи. Рахунку дати й
 * екранів тут немає: лінза приймає готовий знак, а не дату.
 *
 * @module @wwwuabot/shared/qualities
 */

export {
  QUALITY_LEVELS,
  levelLabel,
  type ClaimLayer,
  type ClaimMethod,
  type LensDefinition,
  type LensInput,
  type PairRule,
  type Quality,
  type QualityClaim,
  type QualityDomain,
  type QualityLevel,
  type QualitySensitivity,
  type QualityTemporal,
} from "./types";

export { QUALITIES, QUALITY_DOMAINS, getQuality, qualitiesOf } from "./domains";

export {
  LAYER_BASE,
  LAYER_CAP,
  confidenceOf,
  makeClaim,
  type ClaimDraft,
  type ConfidenceFactors,
} from "./claims";

export {
  accents,
  hasConflict,
  summarize,
  summarizeQuality,
  unknownQualities,
  type QualitySummary,
} from "./profile";

export {
  LAYER_PRIORITY,
  ROLES,
  ROLE_IDS,
  domainOfQuality,
  getRole,
  matchRole,
  parseRole,
  resolveQuality,
  type ResolvedQuality,
  type RoleDefinition,
  type RoleDomainView,
  type RoleId,
  type RoleMatch,
  type RoleNeed,
  type RolePersonReading,
  type RoleQualityView,
  type RoleSource,
  type RoleStatus,
} from "./roles";

export {
  comparePeople,
  type CompareCell,
  type CompareDomain,
  type CompareKind,
  type ComparePerson,
  type ComparePersonCoverage,
  type CompareQuality,
  type CompareResult,
  type CompareSystem,
} from "./compare";

export {
  anchorOf,
  claimSources,
  readDossier,
  readQuality,
  type DomainReading,
  type QualityReading,
} from "./reading";

export {
  MEASURED_FACTORS,
  MEASURED_NAME,
  MEASURED_QUALITIES,
  MEASURED_SOURCE,
  MEASURED_VERSION,
  measuredClaims,
  type MeasuredFactor,
} from "./measured";

export {
  CHINESE,
  CHINESE_ANIMALS,
  CHINESE_QUALITIES,
  LENSES,
  MAYAN,
  MAYAN_DAY_SIGNS,
  MAYAN_QUALITIES,
  NUMEROLOGY,
  NUMEROLOGY_NUMBERS,
  NUMEROLOGY_QUALITIES,
  SOLAR_MONTHS,
  WESTERN,
  WESTERN_QUALITIES,
  WESTERN_SIGNS,
  chainLabel,
  chineseBranch,
  chineseClaims,
  chineseStem,
  claimsOf,
  mayanClaims,
  mayanSeal,
  mayanTone,
  numerologyClaims,
  strongestPerQuality,
  sunInSign,
  westernClaims,
  type ChineseProfile,
  type LensRule,
  type MayanProfile,
  type NumerologyProfile,
  type Pillar,
  type WesternProfile,
} from "./lenses";

import {
  CHINESE_QUALITIES,
  MAYAN_QUALITIES,
  NUMEROLOGY_QUALITIES,
  WESTERN_QUALITIES,
} from "./lenses";

/** Які якості може назвати кожна лінза — зворотний покажчик для довідника. */
export const LENS_QUALITIES: Readonly<Record<string, readonly string[]>> = {
  western: WESTERN_QUALITIES,
  numerology: NUMEROLOGY_QUALITIES,
  chinese: CHINESE_QUALITIES,
  mayan: MAYAN_QUALITIES,
};
