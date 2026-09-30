/**
 * Рахування самооцінки: відповіді → бал у шкалі → смуга.
 *
 * **Усе тут — чисті функції.** Ні стану, ні таймерів, ні `fetch`: рахунок
 * мусить однаково вийти в браузері, в `api-dev` і в тесті. Тому результат
 * рахує сервер, а цей модуль не знає, звільки його покликали.
 *
 * **Одиниця рахунку — шкала, а не тест.** «Тревожність і депресія» — це
 * одне проходження з двома шкалами, кожна зі своїми смугами, порогом і
 * напрямком. Тому всі функції приймають шкалу: тест лише каже, **які** шкали
 * рахувати.
 *
 * **Немає мовчання.** Тест, у якому смуги не покривають увесь діапазон, або
 * відповідь не з тої шкали — це помилка в даних, і вона кидає помилку, а не
 * повертає нуль. Нуль у результаті про благополуччя — це твердження про людину,
 * і мовчати тут не можна.
 *
 * @module @wwwuabot/shared/assessments/score
 */

import { scoredItems } from "./scales";
import type { AssessmentBand, AssessmentScale, AssessmentTest } from "./types";

/** Найбільший бал шкали: скільки її питань, помножено на найбільший бал варіанта. */
export function maxRawScore(test: AssessmentTest, scale: AssessmentScale): number {
  const values = test.options.map((option) => option.value);
  return scoredItems(test, scale).length * Math.max(...values);
}

/** Найбільший бал одного варіанта відповіді — знаменник у профілі по сферах. */
export function maxOptionValue(test: AssessmentTest): number {
  return Math.max(...test.options.map((option) => option.value));
}

/** Результат однієї шкали: те, що показують людині й пишуть у базу. */
export interface ScaleResult {
  readonly scale: AssessmentScale;
  /** Сума відповідей, 0…`maxRawScore` — те, що показують дрібним шрифтом. */
  readonly raw: number;
  /** Відсоток 0…100: саме він порівнюється з порігом і з минулим результатом. */
  readonly percent: number;
  readonly band: AssessmentBand;
  /** Поріг із `attentionRaw`: за ним — варто обговорити з фахівцем. */
  readonly needsAttention: boolean;
}

/** Результат проходження: по рядку на кожну шкалу тесту. */
export interface AssessmentResult {
  readonly scales: readonly ScaleResult[];
  /**
   * Прапор уваги на **проходження**, а не на шкалу. Людина, яка набрала 12
   * з тривоги й 2 за настрій, мусить бачити попередження один раз, а не
   * двічі й не нуль разів.
   */
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
  // Шкала **кожного** питання своя: у тестів із симптомами питання про вплив на
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
export function exceedsAttention(scale: AssessmentScale, raw: number): boolean {
  return scale.severityDirection === "higher-is-worse"
    ? raw >= scale.attentionRaw
    : raw <= scale.attentionRaw;
}

/**
 * Смуга, до якої потрапляє сума, — **або `null`, якщо жодна не підійшла.**
 *
 * Розподіл між людьми (`peer.ts`) і список результатів мають право показати
 * «смуги не покривають цю суму» як відсутність своєї смуги, а не як
 * виняток на екрані. Тому два доступи до одного правило: `bandOf` — тихий
 * для читання, `bandFor` — такий, що кидає, бо рахунок без смуги не має
 * права зберегтися мовчки.
 */
export function bandOf(scale: AssessmentScale, raw: number): AssessmentBand | null {
  return scale.bands.find((candidate) => raw >= candidate.min && raw <= candidate.max) ?? null;
}

/** Смуга, до якої потрапляє сума. Кидає, якщо смуги не покривають шкалу. */
function bandFor(test: AssessmentTest, scale: AssessmentScale, raw: number): AssessmentBand {
  const band = bandOf(scale, raw);
  if (!band) {
    throw new Error(
      `Тест «${test.key}», шкала «${scale.key}»: смуги не покривають ${raw}. Межі — це дані, і прогалина в них не має права мовчати.`,
    );
  }
  return band;
}

/**
 * Рахує **одну шкалу**. Відповіді мають бути валідними — викликає
 * `validateAnswers` на рівні проходження (`scoreAssessment`).
 */
export function scoreScale(
  test: AssessmentTest,
  scale: AssessmentScale,
  answers: readonly number[],
): ScaleResult {
  const raw = scoredItems(test, scale).reduce((sum, { index }) => sum + (answers[index] ?? 0), 0);
  return {
    scale,
    raw,
    percent: Math.round((raw / maxRawScore(test, scale)) * 100),
    band: bandFor(test, scale, raw),
    needsAttention: exceedsAttention(scale, raw),
  };
}

/** Рахує все проходження: по рядку на кожну шкалу тесту. */
export function scoreAssessment(
  test: AssessmentTest,
  answers: readonly number[],
): AssessmentResult {
  const problem = validateAnswers(test, answers);
  if (problem) throw new Error(`Тест «${test.key}»: ${problem}`);

  const scales = test.scales.map((scale) => scoreScale(test, scale, answers));
  return { scales, needsAttention: scales.some((one) => one.needsAttention) };
}

/**
 * Чи це значуща зміна від минулого результату.
 *
 * **Порівнюємо відсотки, а не суми.** Різні шкали мають різну кількість
 * питань, тож «набрав менше» між шкалами нічого не значить — а ось
 * «змінилося на 10%» значить однаково всюди. Поріг — з джерела, а не «на око».
 */
export function isSignificantChange(
  previousPercent: number,
  currentPercent: number,
  scale: AssessmentScale,
): boolean {
  const change = scale.significantChange;
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
 * **Де саме людина сильна, а де слабка** — усередині однієї шкали.
 *
 * Найцінніше в багатовимірному тесті — не сума, а розкид: одна й та сама сума
 * з «відпочинок 0, інтерес 5» і з «усе по 3» — це дві різні людини, і лише
 * розкид це показує. Профіль рахується **по шкалі**, а не по всьому тесту:
 * порівнювати «сон» із «розслабленням» без спільної шкали — це порівняння
 * тепло з довжиною.
 *
 * **Найсильніша приховується, якщо всі сфери рівні.** «Найсильніше — енергія:
 * 3» насправді значить «нічого не виділяється», і це краще сказати вголос,
 * ніж показати випадкову «найсильнішу» сферу.
 */
export function profileOf(
  test: AssessmentTest,
  scale: AssessmentScale,
  answers: readonly number[],
): { strongest: ItemScore; weakest: ItemScore; even: boolean } {
  // **Неповні відповіді кидають, а не мовчать.** Без перевірки `answers[index]`
  // тихо перетворюється на нуль, і профіль людини, яка відповіла на половину,
  // виглядав би як профіль із відповідями «зовсім ні» — тобто розповідь про
  // найслабшу сферу вигадалася б на місці, де її немає.
  const problem = validateAnswers(test, answers);
  if (problem) throw new Error(`Тест «${test.key}»: ${problem}`);

  const max = maxOptionValue(test);
  // **Питання про вплив на життя — не сфера.** Воно міряє наслідок, а не
  // симптом, тому в профілі йому не місце: інакше людина, яка відповіла
  // «нічого не ускладнило», бачила б його як «найслабшу ланку».
  const scores: ItemScore[] = scoredItems(test, scale)
    .map(({ item, index }) => ({ item, value: answers[index] }))
    .map(({ item, value }) => ({
      id: item.id,
      label: item.label,
      value: value ?? 0,
      max,
      weakNote: item.weakNote,
    }));
  if (scores.length === 0) {
    throw new Error(`Шкала «${scale.key}»: у профілі не залишилося жодної сфери.`);
  }
  const byValue = [...scores].sort((a, b) => a.value - b.value);
  const weakest = byValue[0];
  const strongest = byValue[byValue.length - 1];
  // Коли все рівно, віддаємо **те саме** в обох полях: інакше виклик, що
  // забув перевірити `even`, показав би випадкову сферу як «найсильнішу».
  if (weakest.value === strongest.value) return { strongest: weakest, weakest, even: true };
  return { strongest, weakest, even: false };
}
