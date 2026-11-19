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
  MEASURED_SOURCE,
  MEASURED_VERSION,
  measuredClaims,
  type MeasuredFactor,
} from "./measured";

export {
  CHINESE,
  CHINESE_ANIMALS,
  LENSES,
  MAYAN,
  MAYAN_DAY_SIGNS,
  NUMEROLOGY,
  NUMEROLOGY_NUMBERS,
  SOLAR_MONTHS,
  WESTERN,
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
