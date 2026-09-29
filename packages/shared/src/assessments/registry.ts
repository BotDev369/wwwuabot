/**
 * Реєстр тестів самооцінки.
 *
 * **Один масив, а не зміна в коді рахунку.** Новий інструмент — це рядок
 * тут, тож `scoreAssessment`, екрани й хаб не знають про його існування і не
 * мусять змінюватись. Реєстр лише дані: жодної гілки, жодного стану.
 *
 * @module @wwwuabot/shared/assessments/registry
 */

import { WHO_5 } from "./who5";
import type { AssessmentTest } from "./types";

/** Порядок показу на екрані «Розвиток» — від коротших до довших. */
export const ASSESSMENTS: readonly AssessmentTest[] = [WHO_5];

/** Тест за ключем — єдиний спосіб дістати його на сервері й у браузері. */
export function getAssessment(key: string): AssessmentTest | null {
  return ASSESSMENTS.find((test) => test.key === key) ?? null;
}
