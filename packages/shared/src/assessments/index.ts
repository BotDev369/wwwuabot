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
  ScaleOption,
} from "./types";
export {
  isSignificantChange,
  maxRawScore,
  scoreAssessment,
  validateAnswers,
  type AssessmentResult,
} from "./score";
export { WHO_5 } from "./who5";
export { ASSESSMENTS, getAssessment } from "./registry";
