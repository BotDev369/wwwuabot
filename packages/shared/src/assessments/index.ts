/**
 * Самооцінка («Розвиток»): інструменти, типи й рахування.
 *
 * Публічна поверхня одна: `ASSESSMENTS` — реєстр тестів, `scoreAssessment` —
 * єдине місце, де рахується бал. Новий інструмент додається **файлом із
 * даними** рядком у `ASSESSMENTS`, а не гілкою в рахунку.
 *
 * @module @wwwuabot/shared/assessments
 */

export type {
  AssessmentBand,
  AssessmentItem,
  AssessmentRecord,
  AssessmentSource,
  AssessmentTest,
  HelpLine,
  ImpactQuestion,
  ScaleOption,
  SignificantChange,
} from "./types";
export {
  alertCount,
  combinedKeyOf,
  impactText,
  impactValue,
  isCoreMoodAlarmed,
  itemAlerts,
  itemById,
  latestOf,
  safetyOf,
  safetyValue,
  type CombinedKey,
  type ItemAlert,
  type SafetyLevel,
} from "./flags";
export {
  exceedsAttention,
  isSignificantChange,
  maxRawScore,
  profileOf,
  scoreAssessment,
  validateAnswers,
  type AssessmentResult,
  type ItemScore,
} from "./score";
export { WHO_5 } from "./who5";
export { PHQ_9 } from "./phq9";
export { GAD_7 } from "./gad7";
export { ASSESSMENTS, getAssessment } from "./registry";
