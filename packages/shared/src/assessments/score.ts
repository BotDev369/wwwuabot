/**
 * Рахування самооцінки: відповіді → бал → смуга.
 *
 * **Усе тут — чисті функції.** Ні стану, ні таймерів, ні `fetch`: рахунок
 * мусить однаково вийти в браузері, в `api-dev` і в тесті. Тому результат
 * рахує сервер, а цей модуль не знає, звільки його покликали.
 *
 * **Немає мовчання.** Тест, у якому смуги не покривають увесь діапазон, або
 * відповідь не з тої шкали — це помилка в даних, і вона кидає помилку, а не
 * повертає нуль. Нуль у результаті про благополуччя — це твердження про людину,
 * і мовчати тут не можна.
 *
 * @module @wwwuabot/shared/assessments/score
 */

import type { AssessmentBand, AssessmentItem, AssessmentTest } from "./types";

/** Найбільша можлива сума: скільки питань, помножено на найбільший бал шкали. */
export function maxRawScore(test: AssessmentTest): number {
  return scoredItems(test).length * Math.max(...test.options.map((option) => option.value));
}

/**
 * Питання, які **входять у суму**. Типово це всі, але питання про вплив на
 * життя бали не нараховує, тому воно поза сумою — і в сумі, і в максимумі.
 * Робимо це одним списком, щоб `raw` і `maxRaw` не могли розійтися.
 */
function scoredItems(test: AssessmentTest): readonly AssessmentItem[] {
  return test.items.filter((item) => item.countsTowardScore !== false);
}

export interface AssessmentResult {
  /** Сума відповідей, 0…`maxRawScore` — те, що показуємо дрібним шрифтом. */
  readonly raw: number;
  /** Відсоток 0…100: саме він порівнюється з порігом і з минулим результатом. */
  readonly percent: number;
  readonly band: AssessmentBand;
  /** Поріг із `attentionRaw`: за ним — варто обговорити з фахівцем. */
  readonly needsAttention: boolean;
}

/**
 * Чому відповідь не приймається — речення для людини, а не код помилки.
 *
 * `null` означає «усе добре». Порядок перевірок навмисний: спершу кількість,
 * бо найчастіша помилка — недописана форма, і тоді кажеш про неї, а не
 * «відповідь поза шкалою».
 */
export function validateAnswers(test: AssessmentTest, answers: readonly number[]): string | null {
  if (answers.length !== test.items.length) {
    return `Обери відповідь на кожне з ${test.items.length} запитань — зараз ${answers.length}.`;
  }
  // Шкала **кожного** питання своя: у PHQ-9 і GAD-7 питання про вплив на
  // життя має інші варіанти, ніж симптомні. Перевірка за спільною шкалою
  // пропустила б відповідь, яка не належить цьому питанню.
  for (const [index, item] of test.items.entries()) {
    const options = item.countsTowardScore === false ? test.impact?.options : test.options;
    const answer = answers[index];
    if (!options || !options.some((option) => option.value === answer)) {
      const allowed = [...new Set((options ?? []).map((option) => option.value))].join(", ");
      return `Відповідь на запитання ${index + 1} поза шкалою. Можливі значення: ${allowed}.`;
    }
  }
  return null;
}

/**
 * Чи результат перетнув межу уваги — **за балами, у бік гіршого**.
 *
 * Єдине місце, де напрямок шкали має значення. Раніше умова була
 * `raw <= attentionRaw`, тобто «нижче = увага» — правильно для
 * благополуччя, але для шкал симптомів це вмикало прапор на найкращому
 * результаті й змушувало людину з нулем тривоги читати «потрібна розмова».
 *
 * **Порівнюється `raw`, а не `percent`.** Межа — це сума з 21 чи з 27 балів,
 * і людина відповідала саме на тій шкалі; відсоток тут другорядний.
 */
export function exceedsAttention(test: AssessmentTest, raw: number): boolean {
  return test.severityDirection === "higher-is-worse"
    ? raw >= test.attentionRaw
    : raw <= test.attentionRaw;
}

/** Смуга, до якої потрапляє сума. Кидає, якщо смуги не покривають шкалу. */
function bandFor(raw: number, test: AssessmentTest): AssessmentBand {
  const band = test.bands.find((candidate) => raw >= candidate.min && raw <= candidate.max);
  if (!band) {
    throw new Error(
      `Тест «${test.key}»: смуги не покривають ${raw}. Межі — це дані, і прогалина в них не має права мовчати.`,
    );
  }
  return band;
}

/** Рахує результат. Вимакає `validateAnswers` — на вході мають бути валідні відповіді. */
export function scoreAssessment(
  test: AssessmentTest,
  answers: readonly number[],
): AssessmentResult {
  const problem = validateAnswers(test, answers);
  if (problem) throw new Error(`Тест «${test.key}»: ${problem}`);

  const raw = scoredItems(test).reduce((sum, _, index) => sum + answers[index], 0);
  const percent = Math.round((raw / maxRawScore(test)) * 100);
  return {
    raw,
    percent,
    band: bandFor(raw, test),
    needsAttention: exceedsAttention(test, raw),
  };
}

/**
 * Чи це значуща зміна від минулого результату.
 *
 * **Порівнюємо відсотки, а не суми.** Різні тести мають різну кількість
 * питань, тож «набрав менше» між тестами нічого не значить — а ось «змінилося
 * на 10%» значить однаково всюди. Поріг — з джерела, а не «на око».
 */
export function isSignificantChange(
  previousPercent: number,
  currentPercent: number,
  test: AssessmentTest,
): boolean {
  const change = test.significantChange;
  const delta = Math.abs(currentPercent - previousPercent);
  if (change.kind === "points") {
    return delta >= change.value;
  }
  const baseline = Math.max(1, Math.abs(previousPercent));
  return (delta / baseline) * 100 >= change.value;
}

/** Бал однієї сфери: що вона означає і наскільки сильна. */
export interface ItemScore {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly weakNote?: string;
}

/**
 * **Де саме людина сильна, а де слабка.** Найцінніше в багатовимірному
 * тесті — не сума, а розкид: одна й та сама сума з «відпочинок 0, інтерес 5»
 * і з «усе по 3» — це дві різні людини, і лише розкид це показує.
 *
 * **Найсильніша приховується, якщо всі сфери рівні.** «Найсильніше — енергія:
 * 3» насправді значить «нічого не виділяється», і це краще сказати вголос,
 * ніж показати випадкову «найсильнішу» сферу.
 */
export function profileOf(
  test: AssessmentTest,
  answers: readonly number[],
): { strongest: ItemScore; weakest: ItemScore; even: boolean } {
  if (test.items.length === 0 || answers.length !== test.items.length) {
    throw new Error(`Тест «${test.key}»: профіль рахується з повними відповідями.`);
  }
  const max = Math.max(...test.options.map((option) => option.value));
  // **Питання про вплив на життя — не сфера.** Воно міряє наслідок, а не
  // симптом, тому в профілі йому не місце: інакше людина, яка відповіла
  // «нічого не ускладнило», бачила б його як «найслабшу ланку».
  const scores: ItemScore[] = test.items
    .map((item, index) => ({ item, value: answers[index] }))
    .filter(({ item }) => item.countsTowardScore !== false)
    .map(({ item, value }) => ({
      id: item.id,
      label: item.label,
      value,
      max,
      weakNote: item.weakNote,
    }));
  if (scores.length === 0) {
    throw new Error(`Тест «${test.key}»: у профілі не залишилося жодної сфери.`);
  }
  const byValue = [...scores].sort((a, b) => a.value - b.value);
  const weakest = byValue[0];
  const strongest = byValue[byValue.length - 1];
  // Коли все рівно, віддаємо **те саме** в обох полях: інакше виклик, що
  // забув перевірити `even`, показав би випадкову сферу як «найсильнішу».
  if (weakest.value === strongest.value) return { strongest: weakest, weakest, even: true };
  return { strongest, weakest, even: false };
}
