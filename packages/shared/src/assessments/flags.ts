/**
 * Прапорці: **що робити з результатом**, на відміну від `score.ts`, де рахований
 * бал.
 *
 * **Найважливіше тут — `safetyOf`.** Воно дивиться на відповідь на конкретне
 * питання, а не на суму. У «Тревожності і депресії» це питання про думки, що
 * краще було б померти, — і людина з двома балами з 27 мусить отримати блок
 * допомоги так само, як з двадцятьма. Тому прапор безпеки **не залежить від
 * смуги**: його не можна придушити низьким підсумком, і саме через це він живе
 * тут, а не в `AssessmentBand`.
 *
 * Усе — чисті функції без стану: їх можна перевірити тестом, а тести тут
 * найкритичніші в усьому розділі, бо мовчазний збій прапорця безпеки
 * коштує реальному здоров'ю.
 *
 * @module @wwwuabot/shared/assessments/flags
 */

import { placedItems } from "./scales";
import type { AssessmentRecord, AssessmentScale, AssessmentTest, ImpactQuestion } from "./types";

/**
 * Протокол безпеки за відповіддю на питання безпеки.
 *
 * `text` береться з `item.safetyTexts` за фактичним значенням відповіді:
 * специфікація (§8.3) вимагає **різного** тексту для «кілька днів» (м'який)
 * і для «більше половини днів» / «майже щодня» (прямий, з номером 112).
 */
export interface SafetyLevel {
  /** Чи треба показати блок допомоги. */
  readonly triggered: boolean;
  /** Значення відповіді на питання безпеки; 0 — не спрацювало. */
  readonly value: number;
  /** Текст протоколу, або `null`, якщо не спрацювало. */
  readonly text: string | null;
}

/**
 * Відповідь на питання безпеки; 0, якщо такого питання в тесті немає.
 *
 * Шукається **по всьому тесту**, а не по шкалі: питання безпеки живе в одній
 * шкалі, але протокол стосується всього проходження — тому людина, яка
 * відповіла на нього, мусить бачити блок однаково, з яким би блоком вона не
 * читалася.
 */
export function safetyValue(test: AssessmentTest, answers: readonly number[]): number {
  const index = test.items.findIndex((item) => item.safety === true);
  if (index === -1) return 0;
  const answer = answers[index];
  return typeof answer === "number" && answer > 0 ? answer : 0;
}

/**
 * Чи спрацював протокол безпеки.
 *
 * **Працює від відповідей, а не від збереженого результату** — тому старий
 * рядок у базі, збережений до появи цього правила, теж отримує блок допомоги.
 * Це і є причина не додавати окрему колонку в `assessment_results`.
 */
export function safetyOf(test: AssessmentTest, answers: readonly number[]): SafetyLevel {
  const value = safetyValue(test, answers);
  if (value === 0) return { triggered: false, value: 0, text: null };
  const item = test.items.find((candidate) => candidate.safety === true);
  const text = item?.safetyTexts?.[value] ?? null;
  return { triggered: true, value, text };
}

/** Питання, відповідь на які варто зрозуміти окремо. */
export interface ItemAlert {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly note: string;
}

/**
 * Персональні акценти (§6.4, §7.6, §7.7): кожне питання з відповіддю
 * **вище за свій поріг** показує свою ремарку.
 *
 * На відміну від `profileOf`, який добирає найслабшу сферу, тут спрацьовує
 * **кожне** перевищене питання: у шкалі настрою їх може бути п'ять, і кожне
 * має власне пояснення. Поріг заданий у даних (`alertAtLeast`), а не в коді —
 * інакше наступний інструмент переписав би правило згори.
 *
 * **Акценти належать шкалі**, а не тесту: пояснення «сон — 3 з 3» має стояти
 * під своєю шкалою, інакше список двох блоків злипається в одну стінку без
 * заголовків.
 */
export function itemAlerts(
  test: AssessmentTest,
  scale: AssessmentScale,
  answers: readonly number[],
): ItemAlert[] {
  const alerts: ItemAlert[] = [];
  placedItems(test, scale).forEach(({ item, index }) => {
    const answer = answers[index];
    if (item.alertAtLeast === undefined || item.alertNote === undefined) return;
    if (typeof answer !== "number" || answer < item.alertAtLeast) return;
    alerts.push({ id: item.id, label: item.label, value: answer, note: item.alertNote });
  });
  return alerts;
}

/** Кількість питань, що спрацювали вище за поріг §6.4 — «більшість симптомів». */
export function alertCount(
  test: AssessmentTest,
  scale: AssessmentScale,
  answers: readonly number[],
): number {
  return itemAlerts(test, scale, answers).length;
}

/** Відповідь на питання про вплив на життя, або `null` — його немає. */
export function impactValue(test: AssessmentTest, answers: readonly number[]): number | null {
  if (!test.impact) return null;
  const index = test.items.findIndex((item) => item.countsTowardScore === false);
  if (index === -1) return null;
  return typeof answers[index] === "number" ? answers[index] : null;
}

/** Текст наслідку за відповіддю про вплив, або `null`. */
export function impactText(
  impact: ImpactQuestion | undefined,
  value: number | null,
): string | null {
  if (!impact || value === null) return null;
  return impact.texts[value] ?? null;
}

/**
 * Чи два ключові питання шкали вже на рівні «більше половини днів» (§7.6).
 *
 * Беруться **перші два** питання шкали з порогом, а не перші два взагалі: у
 * WHO-5 порігів немає, тож перевіряти там нічого, а в тесті з трьома блоками
 * перші два питання другого блоку — зовсім інші симптоми, ніж перші два першого.
 */
export function isCoreMoodAlarmed(
  test: AssessmentTest,
  scale: AssessmentScale,
  answers: readonly number[],
): boolean {
  return placedItems(test, scale)
    .filter(({ item }) => item.safety !== true && item.alertAtLeast !== undefined)
    .slice(0, 2)
    .some(({ index }) => (answers[index] ?? 0) >= 2);
}

/** Останній результат конкретної шкали, якщо він є. */
export function latestOf(
  results: readonly AssessmentRecord[],
  testKey: string,
  scaleKey: string,
): AssessmentRecord | null {
  return results.find((one) => one.testKey === testKey && one.scaleKey === scaleKey) ?? null;
}
