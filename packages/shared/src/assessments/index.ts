/**
 * Самооцінка («Розвиток»): інструменти, типи й рахування.
 *
 * Публічна поверхня одна: `ASSESSMENTS` — реєстр тестів, `scoreAssessment` —
 * єдине місце, де рахується бал. Новий інструмент додається **файлом із
 * даними** рядком у `ASSESSMENTS`, а не гілкою в рахунку.
 *
 * **Тест ≠ шкала.** Тест — це проходження, шкала — це блок питань із власними
 * смугами. «Тревожність і депресія» — один тест і дві шкали, тому рахунок
 * повертає по рядку на шкалу, а всі функції приймають шкалу.
 *
 * @module @wwwuabot/shared/assessments
 */

export type {
  AssessmentBand,
  AssessmentItem,
  AssessmentRecord,
  AssessmentScale,
  AssessmentSource,
  AssessmentTest,
  HelpLine,
  ImpactQuestion,
  ScaleOption,
  SignificantChange,
} from "./types";
export {
  alertCount,
  impactText,
  impactValue,
  isCoreMoodAlarmed,
  itemAlerts,
  latestOf,
  safetyOf,
  safetyValue,
  type ItemAlert,
  type SafetyLevel,
} from "./flags";
export {
  bandOf,
  exceedsAttention,
  isSignificantChange,
  maxOptionValue,
  maxRawScore,
  profileOf,
  scoreAssessment,
  scoreScale,
  validateAnswers,
  type AssessmentResult,
  type ItemScore,
  type ScaleResult,
} from "./score";
export {
  placedItems,
  scaleByKey,
  scoredItems,
  sharedItems,
  startsScale,
  type PlacedItem,
} from "./scales";
export { combinedKeyOf, type CombinedKey } from "./combined";
export {
  PEER_SMALL_SAMPLE,
  peerSnapshot,
  type PeerBandShare,
  type PeerSnapshot,
  type PeerTally,
  type PeerTallies,
} from "./peer";
export { WHO_5 } from "./who5";
export { MOOD_ANXIETY } from "./mood_anxiety";
export { ASSESSMENTS, getAssessment } from "./registry";
