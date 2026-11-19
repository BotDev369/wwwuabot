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
  anchorOf,
  claimSources,
  readDossier,
  readQuality,
  type DomainReading,
  type QualityReading,
} from "./reading";

export { LENSES, WESTERN, WESTERN_SIGNS, sunInSign, westernClaims } from "./lenses";
