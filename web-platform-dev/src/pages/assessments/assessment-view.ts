/**
 * Логіка екрана «Розвиток»: що показувати в списку й що значить зміна.
 *
 * **Тут лише чисті функції.** Вони приймають масив результатів і віддають те,
 * що треба намалювати, без React, без запитів і без стану — тож напрям зміни
 * перевіряється тестом, а не очима на телефоні.
 *
 * **Напрям рахується від попереднього, а не від нуля.** Історія приходить
 * новачими сперху, тож «попередній» — це другий рядок, а не перший. І саме
 * він робить число зрозумілим: «52» не каже нічого, «48 → 52» каже все.
 *
 * @module web-platform-dev/src/pages/assessments/assessment-view
 */

import {
  isSignificantChange,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";

/** Останній результат кожного тесту — те, що видно в списку. */
export function latestByTest(results: readonly AssessmentRecord[]): Map<string, AssessmentRecord> {
  const latest = new Map<string, AssessmentRecord>();
  for (const record of results) {
    if (!latest.has(record.testKey)) latest.set(record.testKey, record);
  }
  return latest;
}

/**
 * Напрям зміни для людини.
 *
 * **«Вгору» — це добре**, бо бал wellbeing зростає з якістю стану. Назва
 * напряму, а не «плюс/мінус»: людині, яка дивиться на себе в тяжкий тиждень,
 * «плюс 4» не каже нічого, а «покращилося» каже все.
 */
export type TrendDirection = "up" | "down" | "flat";

export interface Trend {
  readonly direction: TrendDirection;
  /** Зміна в балах: знак має сенс тільки разом із напрямом. */
  readonly delta: number;
  /** Чи зміну вважають значущою (поріг з джерела), а не звичайним коливанням. */
  readonly significant: boolean;
  readonly hasPrevious: boolean;
}

/**
 * Тренд одного тесту: попередній результат проти поточного.
 *
 * Коли попереднього немає, повертаємо `hasPrevious: false`, а **не** нульовий
 * тренд: нуль на екрані читається як «не змінилось», а це неправда — це ще
 * невідомо.
 */
export function trendFrom(results: readonly AssessmentRecord[], test: AssessmentTest): Trend {
  const same = results.filter((record) => record.testKey === test.key);
  const [current, previous] = same;
  if (!current) {
    return { direction: "flat", delta: 0, significant: false, hasPrevious: false };
  }
  if (!previous) {
    return { direction: "flat", delta: 0, significant: false, hasPrevious: false };
  }

  const delta = current.percent - previous.percent;
  const direction: TrendDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    direction,
    delta,
    significant: isSignificantChange(previous.percent, current.percent, test),
    hasPrevious: true,
  };
}

/** Підпис напряму для людини. */
export function trendLabel(trend: Trend): string | null {
  if (!trend.hasPrevious) return null;
  if (trend.direction === "flat") return "без змін";
  const word = trend.direction === "up" ? "краще" : "гірше";
  return trend.significant ? `${word} (${Math.abs(trend.delta)})` : `${word} незначно`;
}
