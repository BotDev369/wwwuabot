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

import type { AssessmentBand, AssessmentTest } from "./types";

/** Найбільша можлива сума: скільки питань, помножено на найбільший бал шкали. */
export function maxRawScore(test: AssessmentTest): number {
  return test.items.length * Math.max(...test.options.map((option) => option.value));
}

export interface AssessmentResult {
  /** Сума відповідей, 0…`maxRawScore` — те, що показуємо дрібним шрифтом. */
  readonly raw: number;
  /** Відсоток 0…100: саме він порівнюється з порігом і з минулим результатом. */
  readonly percent: number;
  readonly band: AssessmentBand;
  /** Поріг із `attentionBelow`: нижче — варто обговорити з фахівцем. */
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
  const allowed = new Set(test.options.map((option) => option.value));
  const broken = answers.findIndex((answer) => !Number.isInteger(answer) || !allowed.has(answer));
  if (broken !== -1) {
    const allowedLabel = [...allowed].sort((a, b) => a - b).join(", ");
    return `Відповідь на запитання ${broken + 1} поза шкалою. Можливі значення: ${allowedLabel}.`;
  }
  return null;
}

/** Смуга, до якої потрапляє відсоток. Кидає, якщо смуги не покривають шкалу. */
function bandFor(percent: number, test: AssessmentTest): AssessmentBand {
  const band = test.bands.find((candidate) => percent >= candidate.min && percent <= candidate.max);
  if (!band) {
    throw new Error(
      `Тест «${test.key}»: смуги не покривають ${percent}. Межі — це дані, і прогалина в них не має права мовчати.`,
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

  const raw = answers.reduce((sum, answer) => sum + answer, 0);
  const percent = Math.round((raw / maxRawScore(test)) * 100);
  return {
    raw,
    percent,
    band: bandFor(percent, test),
    needsAttention: percent <= test.attentionBelow,
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
  const baseline = Math.max(1, Math.abs(previousPercent));
  return (
    (Math.abs(currentPercent - previousPercent) / baseline) * 100 >= test.significantChangePercent
  );
}
