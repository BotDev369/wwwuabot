/**
 * Логіка екрана «Розвиток»: що показувати в списку й що значить зміна.
 *
 * **Тут лише чисті функції.** Вони приймають масив результатів і віддають те,
 * що треба намалювати, без React, без запитів і без стану — тож напрям зміни
 * перевіряється тестом, а не очима на телефоні.
 *
 * **Одиниця — шкала.** «Тревожність і депресія» має дві шкали, тож тренд,
 * профіль і поріг рахуються для кожної окремо: порівняльний бал тривоги з
 * балом настрою — це різні речі, а не два записи однієї історії.
 *
 * **Напрям рахується від попереднього, а не від нуля.** Історія приходить
 * новачими спершу, тож «попередній» — це другий рядок, а не перший. І саме
 * він робить число зрозумілим: «52» не каже нічого, «48 → 52» каже все.
 *
 * @module web-platform-dev/src/pages/assessments/assessment-view
 */

import {
  exceedsAttention,
  impactText,
  impactValue,
  isSignificantChange,
  maxRawScore,
  profileOf,
  type AssessmentRecord,
  type AssessmentScale,
  type AssessmentTest,
} from "@wwwuabot/shared/assessments";

/** Три рядки, які людина читає про себе, а не про шкалу. */
export interface ProfileReading {
  /** Рядок про те, що тримає. */
  readonly strongest: string;
  /** Рядок про те, що просіло. */
  readonly weakest: string;
  /** Питання, з яким варто залишитися на хвилину — головне, заради чого все це. */
  readonly question: string | null;
}

/**
 * **Головний зміст результату — розкид, а не сума.** «20 з 25» однаково в
 * людини, яка спить добре але не має сили, і в тієї, хто має силу, але не
 * спить. Сума зливає два різні стани в одне число, розкид їх розрізняє.
 *
 * **Рівний профіль — теж трактування, а не відсутність такого.** Коли всі
 * сфери збіглися, розкиду немає і вибирати «найслабшу» — вигадка; тоді
 * розповідає вже **рівень**: людина, яка тримає все одразу на 4 з 5, і людина,
 * яка провалила все одразу, — це різні речі, і обидві варто назвати вголос.
 * Рівність не значить «нічого сказати».
 */
export function profileReading(
  test: AssessmentTest,
  scale: AssessmentScale,
  record: AssessmentRecord,
): ProfileReading {
  const { strongest, weakest, even } = profileOf(test, scale, record.answers);
  const at = (label: string, value: number, max: number): string => `${label} — ${value} з ${max}`;

  if (even) {
    const option = test.options.find((one) => one.value === strongest.value)?.label;
    const chosen = option ? `«${option}»` : `${strongest.value} з ${strongest.max}`;
    // **Напрямок шкали вирішує, чи це «добре» чи «важко».** Для благополуччя
    // все рівно — це про благополуччя; для шкал симптомів все рівно на
    // низькому балі — це «нічого не турбує», а не «важко скрізь». Без цієї
    // гілки людина з нулем тривоги читала б «важко не з однієї сторони».
    const worse = exceedsAttention(scale, record.raw);
    if (!worse && scale.severityDirection === "higher-is-worse") {
      return {
        strongest: `Ніщо не турбувало: на всі питання — ${chosen}.`,
        weakest: "Жодна сфера не піднялася вище нуля.",
        question: null,
      };
    }
    if (worse) {
      return {
        strongest: `Усі сфери на одному рівні: ${chosen}.`,
        weakest:
          scale.severityDirection === "higher-is-worse"
            ? "Піднялося не одне, а все одразу — так буває, коли важко не з однієї сторони."
            : "Просило не одне, а все одразу.",
        question: "Коли таке триває тиждень за тижнем — що заважає почати з одного кроку?",
      };
    }
    return {
      strongest: `Усі сфери тримаються рівно: ${chosen}.`,
      weakest: "Нічого окремо не просіло — і це рідко буває: зазвичай якась сфера тягне вниз.",
      question: "Що саме тебе тримає на цьому рівні?",
    };
  }

  return {
    strongest: `Міцніше: ${at(strongest.label, strongest.value, strongest.max)}.`,
    weakest: `Слабше: ${at(weakest.label, weakest.value, weakest.max)}.`,
    question: weakest.weakNote ?? null,
  };
}

/**
 * Поріг уваги — **словами, без арифметики шкали**.
 *
 * «13 з 25» зрозуміліше, ніж «52 зі 100»: поріг рахується на тій самій шкалі,
 * на якій людина відповідала. Рядок потрібен у головному виводі — він пояснює,
 * що число не просто «високе», а **порівняно** з чимось.
 *
 * **Межа — в балах, як і смуги.** Раніше поріг переводився з відсотка
 * (`attentionBelow / 100 * max`), і для шкали тривоги з 21 бала це давало
 * «поріг 2 з 21» — число, яке нічого не значить для людину з нулем тривоги.
 */
export function thresholdLine(
  test: AssessmentTest,
  scale: AssessmentScale,
  record: AssessmentRecord,
): string {
  const max = maxRawScore(test, scale);
  const attention = scale.attentionRaw;
  // «Вище/нижче» — це просто те, де число стоїть відносно межі. Напрямок
  // шкали тут ні до чого: він уже спрацював у `exceedsAttention`, і підміняти
  // ним слова означало б читати «нижче за порогом» як проблему тоді, коли це
  // просто «менше, ніж 10 із 21».
  const side = record.raw > attention ? "вище" : "нижче";
  return `Поріг уваги — ${attention} із ${max}. Ти ${side} за ним.`;
}

/** Текст наслідку для життя — рахується з відповідей, а не зберігається. */
export function impactReading(test: AssessmentTest, record: AssessmentRecord): string | null {
  return impactText(test.impact, impactValue(test, record.answers));
}

/**
 * Чому «далі» не спрацьовує — або `null`, коли можна рухатись далі.
 *
 * **Перевіряється поточне питання, а не весь тест.** `validateAnswers` вимагає
 * заповнених усіх питань, а питання показуються по одному: на першому кнопка
 * була б неактивною завжди, тобто пройти тест було б неможливо. Повну
 * перевірку все одно робить сервер надсилачем — тут лише те, що стосується
 * кнопки на екрані.
 *
 * **Повертає причину, а не `boolean`.** Кнопка без пояснення, чому вона сіра,
 * виглядає як зламана програма: людина просто натискає й нічого не відбувається.
 */
export function blockedReason(
  test: AssessmentTest,
  answers: readonly number[],
  step: number,
): string | null {
  if (!test.items[step]) return "Цього питання немає в тесті.";
  const answer = answers[step];
  if (answer === undefined) return "Обери один із варіантів, щоб рухатись далі.";
  const item = test.items[step];
  const options = item.countsTowardScore === false ? test.impact?.options : test.options;
  const allowed = new Set((options ?? []).map((option) => option.value));
  if (!allowed.has(answer)) return "Обраний варіант не належить цьому питанню.";
  return null;
}

/** Останній результат кожної шкали — те, що видно в списку. */
export function latestByScale(results: readonly AssessmentRecord[]): Map<string, AssessmentRecord> {
  const latest = new Map<string, AssessmentRecord>();
  for (const record of results) {
    const key = `${record.testKey}:${record.scaleKey}`;
    if (!latest.has(key)) latest.set(key, record);
  }
  return latest;
}

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
 * Тренд однієї шкали: попередній результат проти поточного.
 *
 * Коли попереднього немає, повертаємо `hasPrevious: false`, а **не** нульовий
 * тренд: нуль на екрані читається як «не змінилось», а це неправда — це ще
 * невідомо.
 */
export function trendFrom(
  results: readonly AssessmentRecord[],
  test: AssessmentTest,
  scale: AssessmentScale,
): Trend {
  const same = results.filter(
    (record) => record.testKey === test.key && record.scaleKey === scale.key,
  );
  const [current, previous] = same;
  if (!current || !previous) {
    return { direction: "flat", delta: 0, significant: false, hasPrevious: false };
  }

  const delta = current.percent - previous.percent;
  const direction: TrendDirection = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  return {
    direction,
    delta,
    significant: isSignificantChange(previous.percent, current.percent, scale),
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
