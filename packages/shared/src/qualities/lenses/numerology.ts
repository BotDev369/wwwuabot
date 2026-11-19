/**
 * Піфагорійська нумерологія: шість показників дати. Майстер-числа 11/22/33
 * лишаються, кармічні 13/14/16/19 фіксуються в ланцюгу. Число зрілості не
 * рахується — воно потребує імені.
 * Формули: `specs/analysis-core/07-systems.md`.
 *
 * @module @wwwuabot/shared/qualities/lenses/numerology
 */

import { makeClaim } from "../claims";
import type { LensDefinition, QualityClaim, QualityLevel } from "../types";
import { strongestPerQuality, type LensRule } from "./rule";

export const NUMEROLOGY: LensDefinition = {
  id: "numerology",
  name: "Нумерологія",
  version: "2",
  layer: "symbolic",
  inputs: ["date"],
  rule: "шість чисел дати: шлях, день, ставлення, рік, піки, виклики",
  about:
    "Піфагорійська нумерологія зводить дату до чисел і читає кожне як тему життя. " +
    "Важливі не лише суми: 11, 22 і 33 традиція лишає майстер-числами, а 13, 14, 16 і 19 — кармічними боргами.",
  gives: [
    "число життєвого шляху з ланцюгом згортання",
    "число дня народження",
    "число ставлення (день + місяць)",
    "особистий рік на поточний календарний рік",
    "чотири піки з віковими межами",
    "чотири виклики",
    "кармічний борг, якщо він є в ланцюгу",
  ],
  limits: [
    "число зрілості та числа імені — потрібне ім'я, якого ми не питаємо",
    "особистий рік залежить від поточного року, а не від дати народження",
    "жодних прогнозів: число описує тему, а не подію",
  ],
  source:
    "Піфагорійська школа в редакції Ганса Декоза й Метью Гудвіна: окремі згортки місяця, дня й року; майстер-числа 11/22/33; кармічні 13/14/16/19.",
};

/** Число життєвого шляху та ланцюг, яким воно вийшло. */
export interface NumerologyProfile {
  readonly date: string;
  readonly lifePath: number;
  /** Проміжні суми до фінального числа: «24 → 6». */
  readonly lifePathChain: readonly number[];
  readonly birthday: number;
  readonly attitude: number;
  readonly personalYear: number;
  /** Календарний рік, для якого порахований особистий рік. */
  readonly personalYearOf: number;
  readonly pinnacles: readonly [number, number, number, number];
  readonly challenges: readonly [number, number, number, number];
  /** Вік, з якого починається кожен пік; останній — до кінця життя. */
  readonly pinnacleAges: readonly [number, number, number, number];
  readonly karmicDebt: number | null;
  /** Де саме трапився кармічний борг. */
  readonly karmicWhere: string | null;
}

const BY_LIFE_PATH: Readonly<Record<number, readonly LensRule[]>> = {
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
  ],
  7: [
    { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
    { qualityId: "focus", level: 4, note: "глибока робота без нагадувань" },
    { qualityId: "abstraction", level: 4, note: "бачить схему за випадками" },
  ],
  8: [
    { qualityId: "leadership", level: 4, note: "веде за собою добровільно" },
    { qualityId: "planning", level: 4, note: "будує послідовність наперед" },
    { qualityId: "purposefulness", level: 4, note: "повертається до цілі після збою" },
  ],
  9: [
    { qualityId: "empathy", level: 4, note: "чує і те, що не сказано" },
    { qualityId: "care", level: 4, note: "тримає чужу потребу в полі зору" },
    { qualityId: "imagination", level: 4, note: "бачить варіанти поза наявним" },
  ],
  11: [
    { qualityId: "imagination", level: 5, note: "грає з обмеженнями" },
    { qualityId: "abstraction", level: 4, note: "бачить схему за випадками" },
    { qualityId: "empathy", level: 4, note: "чує несказане" },
  ],
  22: [
    { qualityId: "planning", level: 5, note: "бачить послідовність на місяці" },
    { qualityId: "leadership", level: 4, note: "тримає напрям і людей одночасно" },
    { qualityId: "organization", level: 4, note: "система звільняє час" },
  ],
  33: [
    { qualityId: "care", level: 5, note: "бере відповідальність за іншого" },
    { qualityId: "empathy", level: 5, note: "чує біль без слів" },
    { qualityId: "cooperation", level: 4, note: "збирає людей навколо справи" },
  ],
};

/** Один акцент на число — для дня, ставлення й особистого року. */
const BY_THEME: Readonly<Record<number, LensRule>> = {
  1: { qualityId: "initiative", level: 3, note: "рік або тема початку" },
  2: { qualityId: "cooperation", level: 3, note: "тема партнерства" },
  3: { qualityId: "verbal", level: 3, note: "тема висловлювання" },
  4: { qualityId: "discipline", level: 3, note: "тема роботи й порядку" },
  5: { qualityId: "openness", level: 3, note: "тема змін і руху" },
  6: { qualityId: "care", level: 3, note: "тема дому й відповідальності" },
  7: { qualityId: "analysis", level: 3, note: "тема аналізу й тиші" },
  8: { qualityId: "leadership", level: 3, note: "тема результату й керма" },
  9: { qualityId: "empathy", level: 3, note: "тема завершення й віддачі" },
  11: { qualityId: "imagination", level: 4, note: "майстер-число інтуїції" },
  22: { qualityId: "planning", level: 4, note: "майстер-число будівництва" },
  33: { qualityId: "care", level: 4, note: "майстер-число турботи" },
};

/** Пік — тема періоду, а не риса характеру; рівень 3 це позначає. */
const BY_PINNACLE: Readonly<Record<number, LensRule>> = {
  1: { qualityId: "autonomy", level: 3, note: "пік самостійності" },
  2: { qualityId: "cooperation", level: 3, note: "пік партнерства" },
  3: { qualityId: "aesthetics", level: 3, note: "пік вираження" },
  4: { qualityId: "organization", level: 3, note: "пік структури" },
  5: { qualityId: "tempo", level: 3, note: "пік змін" },
  6: { qualityId: "closeness", level: 3, note: "пік близькості" },
  7: { qualityId: "focus", level: 3, note: "пік заглиблення" },
  8: { qualityId: "enterprise", level: 3, note: "пік масштабу" },
  9: { qualityId: "care", level: 3, note: "пік віддачі" },
  11: { qualityId: "imagination", level: 4, note: "майстер-пік інтуїції" },
  22: { qualityId: "planning", level: 4, note: "майстер-пік будівництва" },
  33: { qualityId: "empathy", level: 4, note: "майстер-пік турботи" },
};

/** Виклик — зона ризику, тому рівень 2: це не вирок, а місце роботи. */
const BY_CHALLENGE: Readonly<Record<number, LensRule>> = {
  0: { qualityId: "purposefulness", level: 2, note: "нуль виклику: всі теми одразу" },
  1: { qualityId: "autonomy", level: 2, note: "виклик самостійності" },
  2: { qualityId: "listening", level: 2, note: "виклик чутливості до іншого" },
  3: { qualityId: "discipline", level: 2, note: "виклик розкиданості" },
  4: { qualityId: "organization", level: 2, note: "виклик рутини" },
  5: { qualityId: "endurance", level: 2, note: "виклик свободи без опори" },
  6: { qualityId: "closeness", level: 2, note: "виклик надмірної турботи" },
  7: { qualityId: "openness", level: 2, note: "виклик ізоляції" },
  8: { qualityId: "honesty", level: 2, note: "виклик влади й грошей" },
};

/** Кармічний борг: не «прокляття», а тема, яку традиція просить відпрацювати. */
const BY_KARMIC: Readonly<Record<number, LensRule>> = {
  13: { qualityId: "discipline", level: 2, note: "13: робота замість ярлика" },
  14: { qualityId: "endurance", level: 2, note: "14: помірність і свобода без утечі" },
  16: { qualityId: "honesty", level: 2, note: "16: скромність після падіння" },
  19: { qualityId: "autonomy", level: 2, note: "19: самостійність, що приймає допомогу" },
};

export const NUMEROLOGY_NUMBERS: readonly number[] = Object.keys(BY_LIFE_PATH).map(Number);

function claim(
  profile: NumerologyProfile,
  rule: LensRule,
  evidence: string,
  details: readonly string[],
): QualityClaim {
  return makeClaim({
    qualityId: rule.qualityId,
    level: rule.level as QualityLevel,
    layer: "symbolic",
    sourceId: NUMEROLOGY.id,
    sourceVersion: NUMEROLOGY.version,
    method: "mapped",
    evidence: `${evidence}: ${rule.note}`,
    details: [`Дата: ${profile.date}`, ...details],
  });
}

/** Читабельний ланцюг згортання: «24 → 6». */
export function chainLabel(chain: readonly number[]): string {
  return chain.join(" → ");
}

/**
 * Свідчення всіх шести показників. Одна якість — одне свідчення: якщо шлях і
 * день указують на ту саму якість, лишається сильніше, а не два однакові.
 */
export function numerologyClaims(profile: NumerologyProfile): readonly QualityClaim[] {
  const lifePath = BY_LIFE_PATH[profile.lifePath];
  if (!lifePath) {
    throw new Error(`Число ${profile.lifePath} відсутнє в таблиці нумерології.`);
  }
  const claims: QualityClaim[] = lifePath.map((rule) =>
    claim(profile, rule, `Життєвий шлях ${profile.lifePath}`, [
      `Ланцюг: ${chainLabel(profile.lifePathChain)}`,
      `Правило: ${profile.lifePath} дає «${rule.note}» → рівень ${rule.level}.`,
      profile.karmicDebt
        ? `У ланцюгу є кармічний борг ${profile.karmicDebt} (${profile.karmicWhere}) — це зона роботи, не вирок.`
        : "Кармічного боргу в ланцюгу немає.",
    ]),
  );

  const birthday = BY_THEME[profile.birthday];
  if (birthday) {
    claims.push(
      claim(profile, birthday, `Число дня ${profile.birthday}`, [
        `День народження: ${profile.birthday}.`,
        `Правило: ${profile.birthday} дає «${birthday.note}» → рівень ${birthday.level}.`,
      ]),
    );
  }

  const attitude = BY_THEME[profile.attitude];
  if (attitude) {
    claims.push(
      claim(profile, attitude, `Ставлення ${profile.attitude}`, [
        `Ставлення = місяць + день, згорнуто до ${profile.attitude}.`,
        `Правило: ${profile.attitude} дає «${attitude.note}» → рівень ${attitude.level}.`,
      ]),
    );
  }

  const yearTheme = BY_THEME[profile.personalYear];
  if (yearTheme) {
    claims.push(
      claim(profile, yearTheme, `Особистий рік ${profile.personalYear}`, [
        `Особистий рік = місяць + день + ${profile.personalYearOf}, згорнуто до ${profile.personalYear}.`,
        `Правило: ${profile.personalYear} дає «${yearTheme.note}» → рівень ${yearTheme.level}.`,
      ]),
    );
  }

  profile.pinnacles.forEach((value, index) => {
    const rule = BY_PINNACLE[value];
    if (!rule) return;
    const from = profile.pinnacleAges[index];
    const to = profile.pinnacleAges[index + 1];
    claims.push(
      claim(profile, rule, `Пік ${index + 1}: ${value}`, [
        `Вік: ${from}${to === undefined ? " і далі" : `–${to}`}.`,
        `Правило: пік ${value} дає «${rule.note}» → рівень ${rule.level}.`,
      ]),
    );
  });

  profile.challenges.forEach((value, index) => {
    const rule = BY_CHALLENGE[value];
    if (!rule) return;
    claims.push(
      claim(profile, rule, `Виклик ${index + 1}: ${value}`, [
        `Виклик ${index + 1} = ${value}.`,
        `Правило: ${value} дає «${rule.note}» → рівень ${rule.level}.`,
      ]),
    );
  });

  if (profile.karmicDebt !== null) {
    const rule = BY_KARMIC[profile.karmicDebt];
    if (rule) {
      claims.push(
        claim(profile, rule, `Кармічний борг ${profile.karmicDebt}`, [
          `Борг знайдено: ${profile.karmicWhere}.`,
          `Правило: ${profile.karmicDebt} дає «${rule.note}» → рівень ${rule.level}.`,
        ]),
      );
    }
  }

  return strongestPerQuality(claims);
}
