/**
 * Нумерологія: число життєвого шляху → свідчення. Рахує дату сервер, таблицю
 * тримає лінза. Числа 11 і 22 лишаються майстер-числами, а не згортаються.
 *
 * @module @wwwuabot/shared/qualities/lenses/numerology
 */

import { claimsOf, type LensRule } from "./rule";
import type { LensDefinition, QualityClaim } from "../types";

/** Лінза як дані: версія, шар, входи. */
export const NUMEROLOGY: LensDefinition = {
  id: "numerology",
  name: "Нумерологія",
  version: "1",
  layer: "symbolic",
  inputs: ["date"],
  rule: "число життєвого шляху",
  about:
    "Нумерологія зводить цифри повної дати до одного числа — життєвого шляху. " +
    "Це не сума «на удачу»: 11 і 22 традиція лишає майстер-числами й не згортає.",
  gives: ["число життєвого шляху", "збережені майстер-числа 11 і 22"],
  limits: [
    "числа імені та прізвища — потрібне ім'я, якого ми не питаємо",
    "жодних прогнозів: число описує схильність, а не подію",
  ],
  source: "Західна піфагорейська традиція редукції дати; майстер-числа — загальноприйняте правило.",
};

/**
 * Таблиця чисел. Кожне число дає 3–4 якості з різних доменів; рівень 2
 * позначає слабке місце традиції, а не «погану людину».
 */
const BY_NUMBER: Readonly<Record<number, readonly LensRule[]>> = {
  1: [
    { qualityId: "initiative", level: 4, note: "починає без дозволу" },
    { qualityId: "purposefulness", level: 4, note: "тримає напрям, коли стає важко" },
    { qualityId: "leadership", level: 4, note: "бере кермо без посади" },
    { qualityId: "cooperation", level: 2, note: "кермо забирає собі" },
  ],
  2: [
    { qualityId: "cooperation", level: 4, note: "домовляється про ролі" },
    { qualityId: "empathy", level: 4, note: "помічає стан без слів" },
    { qualityId: "listening", level: 4, note: "переказує почуте так, що впізнають" },
    { qualityId: "initiative", level: 2, note: "чекає, поки покличуть" },
  ],
  3: [
    { qualityId: "verbal", level: 4, note: "слово дається легко" },
    { qualityId: "playfulness", level: 4, note: "проба без гарантії" },
    { qualityId: "imagination", level: 4, note: "бачить варіанти поза наявним" },
    { qualityId: "discipline", level: 2, note: "ритм тримає під настрій" },
  ],
  4: [
    { qualityId: "discipline", level: 4, note: "робить потрібне без нагляду" },
    { qualityId: "organization", level: 4, note: "система працює без нагадувань" },
    { qualityId: "planning", level: 4, note: "бачить послідовність на місяці" },
    { qualityId: "playfulness", level: 2, note: "проба без гарантії коштує дорого" },
  ],
  5: [
    { qualityId: "openness", level: 4, note: "незнайоме — причина йти" },
    { qualityId: "enterprise", level: 4, note: "бере ризик і доводить спробу" },
    { qualityId: "tempo", level: 4, note: "перемикається швидко" },
    { qualityId: "discipline", level: 2, note: "ритм тримає під зовнішньою вимогою" },
  ],
  6: [
    { qualityId: "care", level: 4, note: "чужа потреба в полі зору" },
    { qualityId: "cooperation", level: 4, note: "спільна робота легшає" },
    { qualityId: "empathy", level: 3, note: "помічає зміну настрою" },
    { qualityId: "discipline", level: 3, note: "тримає план, коли є дедлайн" },
  ],
  7: [
    { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
    { qualityId: "focus", level: 4, note: "глибока робота без нагадувань" },
    { qualityId: "abstraction", level: 4, note: "бачить схему за випадками" },
    { qualityId: "precision", level: 3, note: "ловить невідповідність" },
  ],
  8: [
    { qualityId: "leadership", level: 4, note: "веде за собою добровільно" },
    { qualityId: "planning", level: 4, note: "будує послідовність наперед" },
    { qualityId: "purposefulness", level: 4, note: "повертається до цілі після збою" },
    { qualityId: "care", level: 2, note: "допомагає, коли просять" },
  ],
  9: [
    { qualityId: "empathy", level: 4, note: "чує і те, що не сказано" },
    { qualityId: "care", level: 4, note: "тримає чужу потребу в полі зору" },
    { qualityId: "imagination", level: 4, note: "бачить варіанти поза наявним" },
    { qualityId: "analysis", level: 3, note: "розкладає задачу на частини" },
  ],
  11: [
    { qualityId: "imagination", level: 5, note: "грає з обмеженнями" },
    { qualityId: "abstraction", level: 4, note: "бачить схему за випадками" },
    { qualityId: "empathy", level: 4, note: "чує несказане" },
    { qualityId: "analysis", level: 3, note: "перевіряє припущення" },
  ],
  22: [
    { qualityId: "planning", level: 5, note: "бачить послідовність на місяці" },
    { qualityId: "leadership", level: 4, note: "тримає напрям і людей одночасно" },
    { qualityId: "organization", level: 4, note: "система звільняє час" },
    { qualityId: "analysis", level: 4, note: "називає ціну помилки" },
  ],
};

/** Усі числа, для яких є таблиця. */
export const NUMEROLOGY_NUMBERS: readonly number[] = Object.keys(BY_NUMBER).map(Number);

/** Свідчення для числа життєвого шляху; невідоме число — помилка, не «середнє». */
export function numerologyClaims(lifePath: number): readonly QualityClaim[] {
  const rules = BY_NUMBER[lifePath];
  if (!rules) {
    throw new Error(`Число ${lifePath} відсутнє в таблиці нумерології — мовчазного рівня немає.`);
  }
  return claimsOf(NUMEROLOGY, `Число життєвого шляху ${lifePath}`, rules);
}
