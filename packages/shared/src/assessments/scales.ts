/**
 * Питання → шкала: **єдине місце, де з'ясовується, кому належить питання.**
 *
 * Тест може мати кілька шкал («Тревожність і депресія» — дві), і кожне питання
 * належить рівно одній з них. Питання про вплив на життя належить **жодній**:
 * воно спільне для всього проходження, тож у нього немає ані смуг, ані порогу.
 *
 * Чому це окремий модуль, а не кілька рядків у `score.ts`: правило «питання
 * шукає свою шкалу за `item.scale`» потрібне і рахуванню, і прапорцям, і
 * екрану проходження, і картці результату. Розсипане по чотирьох файлах воно
 * рано чи пізно розійдеться, а помилка тут — це не « UI зламався», а бал
 * рахований не з тих питань.
 *
 * @module @wwwuabot/shared/assessments/scales
 */

import type { AssessmentItem, AssessmentScale, AssessmentTest } from "./types";

/** Питання разом із його місцем у масиві відповідей. */
export interface PlacedItem {
  readonly item: AssessmentItem;
  /** Індекс у `test.items`, тобто й індекс у масиві `answers`. */
  readonly index: number;
}

/** Шкала за ключем, або `null` — так ключ читається з рядка бази. */
export function scaleByKey(test: AssessmentTest, key: string): AssessmentScale | null {
  return test.scales.find((scale) => scale.key === key) ?? null;
}

/** Усі питання шкали — у порядку проходження, разом з індексами відповідей. */
export function placedItems(test: AssessmentTest, scale: AssessmentScale): PlacedItem[] {
  return test.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.scale === scale.key);
}

/**
 * Питання шкали, які **входять у суму**. Один список і для `raw`, і для
 * максимуму, щоб вони не могли розійтися: питання про вплив на життя бали не
 * нараховує, тому в сумі й у максимумі його бути не мусить.
 */
export function scoredItems(test: AssessmentTest, scale: AssessmentScale): PlacedItem[] {
  return placedItems(test, scale).filter(({ item }) => item.countsTowardScore !== false);
}

/**
 * Спільні питання тесту — ті, що не належать жодній шкалі.
 *
 * Зараз це одне питання про вплив на життя, але список, а не припущення
 * «останнє питання»: коли з'явиться друге спільне, воно теж мусить потрапити
 * сюди, а не в першу шкалу випадково.
 */
export function sharedItems(test: AssessmentTest): PlacedItem[] {
  return test.items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.scale === undefined);
}

/**
 * Чи починається на цьому питанні новий блок.
 *
 * Екран проходження показує один блок за раз, тож назва блока має з'явитися
 * **перед першим питанням** шкали, а не на кожному її питанні. Тому порівнюємо
 * з попереднім питанням, а не шукаємо «перший елемент шкали» — інакше правило
 * дублювалося б у двох місцях.
 */
export function startsScale(test: AssessmentTest, index: number): boolean {
  const scale = test.items[index]?.scale;
  return scale !== undefined && test.items[index - 1]?.scale !== scale;
}
