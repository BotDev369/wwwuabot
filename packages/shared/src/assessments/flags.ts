/**
 * Прапорці: **що робити з результатом**, на відміну від `score.ts`, де рахований
 * бал.
 *
 * **Найважливіше тут — `safetyOf`.** Воно дивиться на відповідь на конкретне
 * питання, а не на суму. У PHQ-9 це питання 9 — про думки, що краще було б
 * померти, — і людина з двома балами з 27 мусить отримати блок допомоги так
 * само, як з двадцятьма. Тому прапор безпеки **не залежить від смуги**: його
 * не можна придушити низьким підсумком, і саме через це він живе тут, а не
 * в `AssessmentBand`.
 *
 * Усе — чисті функції без стану: їх можна перевірити тестом, а тести тут
 * найкритичніші в усьому розділі, бо мовчазний збій прапорця безпеки
 * коштує реальному здоров'ю.
 *
 * @module @wwwuabot/shared/assessments/flags
 */

import type { AssessmentItem, AssessmentRecord, AssessmentTest, ImpactQuestion } from "./types";

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

/** Відповідь на питання безпеки; 0, якщо такого питання в тесті немає. */
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
 * **кожне** перевищене питання: в PHQ-9 їх може бути п'ять, і кожне має власне
 * пояснення. Поріг заданий у даних (`alertAtLeast`), а не в коді — інакше
 * наступний інструмент переписав би правило згори.
 */
export function itemAlerts(test: AssessmentTest, answers: readonly number[]): ItemAlert[] {
  const alerts: ItemAlert[] = [];
  test.items.forEach((item, index) => {
    const answer = answers[index];
    if (item.alertAtLeast === undefined || item.alertNote === undefined) return;
    if (typeof answer !== "number" || answer < item.alertAtLeast) return;
    alerts.push({ id: item.id, label: item.label, value: answer, note: item.alertNote });
  });
  return alerts;
}

/** Кількість питань, що спрацювали вище за поріг §6.4 — «більшість симптомів». */
export function alertCount(test: AssessmentTest, answers: readonly number[]): number {
  return itemAlerts(test, answers).length;
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

/** Умова, за якої «більшість симптомів» варто сказати людині вголос (§7.6). */
export function isCoreMoodAlarmed(test: AssessmentTest, answers: readonly number[]): boolean {
  return test.items
    .map((item, index) => ({ item, value: answers[index] ?? 0 }))
    .filter(({ item }) => item.safety !== true && item.alertAtLeast !== undefined)
    .slice(0, 2)
    .some(({ value }) => value >= 2);
}

/** Спільний висновок за двома шкалами (§7.5) — лише коли є обидва результати. */
export type CombinedKey =
  "comorbid" | "mood-dominant" | "anxiety-dominant" | "mild-both" | "low-both" | "border";

/**
 * Яка з шести комбінацій §7.5. **Порядок перевірки заданий специфікацією**
 * (зверху вниз, перша відповідність), тому сума ≥ 10 обох перевіряється перед
 * тим, як «легкі прояви обох станів» перехопили б випадок 12 і 11.
 */
export function combinedKeyOf(phq9Raw: number, gad7Raw: number): CombinedKey {
  const phq9Positive = phq9Raw >= 10;
  const gad7Positive = gad7Raw >= 10;
  if (phq9Positive && gad7Positive) return "comorbid";
  if (phq9Positive) return "mood-dominant";
  if (gad7Positive) return "anxiety-dominant";
  if (phq9Raw >= 5 && gad7Raw >= 5) return "mild-both";
  if (phq9Raw < 5 && gad7Raw < 5) return "low-both";
  return "border";
}

/** Останній результат конкретного тесту, якщо він є. */
export function latestOf(
  results: readonly AssessmentRecord[],
  testKey: string,
): AssessmentRecord | null {
  return results.find((record) => record.testKey === testKey) ?? null;
}

/** Сфера-джерело одного питання — для профілю й акцентів. */
export function itemById(test: AssessmentTest, id: string): AssessmentItem | undefined {
  return test.items.find((item) => item.id === id);
}
