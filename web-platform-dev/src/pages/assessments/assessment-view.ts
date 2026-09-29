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
  maxRawScore,
  profileOf,
  type AssessmentRecord,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";

/** Три рядки, які людина читає про себе, а не про шкалу. */
export interface ProfileReading {
  /** Рядок про те, що тримає. */
  readonly strongest: string;
  /** Рядок про те, що просіло. */
  readonly weakest: string;
  /** Питання до найслабшої сфери — головне, заради чого все це. */
  readonly question: string | null;
}

/**
 * **Головний зміст результату — розкид, а не сума.** «20 з 25» однаково в
 * людини, яка спить добре але не має сили, і в тієї, хто має силу, але не
 * спить. Різні профілі — різні висновки, а сума їх зливає в одне число.
 *
 * **Якщо всі сфери рівні, не вибираємо «найсильнішу» випадково** — кажемо
 * прямо, що виділятися нічому, бо випадковий вибір виглядає б як відкриття.
 */
export function profileReading(test: AssessmentTest, answers: readonly number[]): ProfileReading {
  const { strongest, weakest, even } = profileOf(test, answers);
  const at = (label: string, value: number, max: number): string => `${label} — ${value} з ${max}`;
  if (even) {
    return {
      strongest: `Усі сфери на одному рівні: ${strongest.value} з ${strongest.max}.`,
      weakest: "Окремої слабкої сторони тут немає — це рівномірний стан.",
      question: null,
    };
  }
  return {
    strongest: `Міцніше: ${at(strongest.label, strongest.value, strongest.max)}.`,
    weakest: `Слабше: ${at(weakest.label, weakest.value, weakest.max)}.`,
    question: weakest.weakNote ?? null,
  };
}

/**
 * Що означає число — **арифметикою, яку можна перевірити очима**.
 *
 * На картці стоїть два числа («19 з 25» і «76 зі 100»), і без цього рядка вони
 * виглядають як помилка: незрозуміло, звідки взявся другий і навіщо він
 * поруч. Тому кажемо вголос усе: сума, масштаб, поріг — і чи він пройдений.
 *
 * **Поріг перекладається в бали сирої шкали**, бо «12 з 25» зрозуміліше, ніж
 * «50 зі 100», коли мова йде про відповіді на конкретні питання.
 */
export function scaleReading(test: AssessmentTest, record: AssessmentRecord): string {
  const max = maxRawScore(test);
  const attentionRaw = Math.round((test.attentionBelow / 100) * max);
  const side = record.percent > test.attentionBelow ? "вище" : "нижче";
  return (
    `${record.raw} з ${max} — це ${record.percent} зі 100. ` +
    `Поріг уваги — ${test.attentionBelow} зі 100, тобто ${attentionRaw} з ${max}. ` +
    `Ти ${side} за порігом.`
  );
}

/** Останній результат кожного тесту — те, що видно в списку. */
export function latestByTest(results: readonly AssessmentRecord[]): Map<string, AssessmentRecord> {
  const latest = new Map<string, AssessmentRecord>();
  for (const record of results) {
    if (!latest.has(record.testKey)) latest.set(record.testKey, record);
  }
  return latest;
}

/**
 * Чому «далі» не спрацьовує — або `null`, коли можна рухатись далі.
 *
 * **Перевіряється поточне питання, а не весь тест.** `validateAnswers` вимагає
 * заповнених усіх п'яти, а питання показуються по одному: на першому кнопка
 * була б неактивною завжди, тобто пройти тест було б неможливо. Повну
 * перевірку все одно робить сервер надсилачем — тут лише те, що стосується
 * кнопки на екрані.
 *
 * **Повертає причину, а не `boolean`.** Кнопка без пояснення, чому вона
 * сіра, виглядає як зламана програма; людина просто натискає й нічого не
 * відбувається.
 */
export function blockedReason(
  test: AssessmentTest,
  answers: readonly number[],
  step: number,
): string | null {
  if (!test.items[step]) return "Цього питання немає в тесті.";
  const answer = answers[step];
  if (answer === undefined) return "Обери один із варіантів, щоб рухатись далі.";
  const allowed = new Set(test.options.map((option) => option.value));
  if (!allowed.has(answer)) return "Обраний варіант не належить цьому питанню.";
  return null;
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
