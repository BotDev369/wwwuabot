/**
 * Західна астрологія: профіль Сонця → якості. Тільки те, що виводиться з дати
 * без часу й місця (Місяць, асцендент і доми — ні). Кожен рівень несе ланцюг
 * «показник → правило → рівень» у `details`.
 * Канон: `specs/analysis-core/07-systems.md`.
 *
 * @module @wwwuabot/shared/qualities/lenses/western
 */

import { makeClaim } from "../claims";
import type { LensDefinition, QualityClaim, QualityLevel } from "../types";

export const WESTERN: LensDefinition = {
  id: "western",
  name: "Західна астрологія",
  version: "2",
  layer: "symbolic",
  inputs: ["date"],
  rule: "Сонце: знак, градус, декан, межа, двадашамша",
  about:
    "Тропічна астрологія читає положення Сонця на небі в день народження. " +
    "Знак — це 30° екліптики, а всередині знака традиція розрізняє декани, межі й двадашамші.",
  gives: [
    "знак Сонця і точний градус у знаку",
    "декан і його управителя",
    "єгипетська межа (терм) і її управитель",
    "двадашамша — дванадцята частина знака",
    "стихія, хрест, полярність, управитель знака",
  ],
  limits: [
    "Місяць, асцендент і доми — потрібен час і місце народження",
    "точні аспекти між планетами — тут рахується лише Сонце",
    "жодних прогнозів подій: це мова опису, а не пророцтво",
  ],
  source:
    "Птолемей, «Тетрабіблос»; єгипетські межі — за Птолемеєм; декани — халдейський порядок; довгота Сонця — Meeus, Astronomical Algorithms, розд. 25.",
};

/** Канонічний профіль Сонця на дату. Рахує сервер, таблиці — тут. */
export interface WesternProfile {
  readonly date: string;
  /** Знак Сонця українською. */
  readonly sign: string;
  /** Градус у знаку, 0…30. */
  readonly degree: number;
  /** «12°58′» — без знака. */
  readonly degreeLabel: string;
  /** «12°58′ Риб» — те, що показує екран розрахунків. */
  readonly sunLabel: string;
  /** Момент розрахунку: без часу народження беремо середину доби. */
  readonly at: string;
  readonly decan: 1 | 2 | 3;
  readonly decanRuler: string;
  /** «Венера, 0°–12°» — межа разом із її відрізком. */
  readonly boundLabel: string;
  readonly boundRuler: string;
  readonly dwad: string;
  readonly element: string;
  readonly modality: string;
  readonly polarity: string;
  readonly ruler: string;
  readonly traditionalRuler: string;
  /** Показники, які за добу встигають змінитися: це чесно сказано на екрані. */
  readonly ambiguous: readonly string[];
}

interface SignRule {
  readonly qualityId: string;
  readonly level: QualityLevel;
  readonly note: string;
}

/** Знак Сонця: три якості, які традиція називає найвиразніше. */
const BY_SIGN: Readonly<Record<string, readonly SignRule[]>> = {
  Овен: [
    { qualityId: "initiative", level: 4, note: "починає без дозволу" },
    { qualityId: "discipline", level: 2, note: "ритм тримає під зовнішньою вимогою" },
    { qualityId: "cooperation", level: 2, note: "кермо забирає собі" },
  ],
  Телець: [
    { qualityId: "discipline", level: 4, note: "тримає власний ритм" },
    { qualityId: "vitality", level: 4, note: "повільне, але стале відновлення" },
    { qualityId: "openness", level: 2, note: "перевірене краще за незнайоме" },
  ],
  Близнюки: [
    { qualityId: "verbal", level: 4, note: "слово дається легко" },
    { qualityId: "learning", level: 4, note: "нове засвоює з практики" },
    { qualityId: "focus", level: 2, note: "перемикається швидше, ніж доводить" },
  ],
  Рак: [
    { qualityId: "care", level: 4, note: "чужа потреба в полі зору" },
    { qualityId: "closeness", level: 4, note: "близькість як основа" },
    { qualityId: "stressResilience", level: 2, note: "збій забирає більше, ніж в інших" },
  ],
  Лев: [
    { qualityId: "leadership", level: 4, note: "точка опори для групи" },
    { qualityId: "aesthetics", level: 4, note: "форма як аргумент" },
    { qualityId: "listening", level: 2, note: "відповідає на власну думку" },
  ],
  Діва: [
    { qualityId: "precision", level: 4, note: "бачить невідповідність" },
    { qualityId: "analysis", level: 4, note: "перевіряє припущення" },
    { qualityId: "playfulness", level: 2, note: "проба без гарантії не дається" },
  ],
  Терези: [
    { qualityId: "empathy", level: 4, note: "стан іншого помічає без слів" },
    { qualityId: "cooperation", level: 4, note: "спільна робота легшає" },
    { qualityId: "persuasion", level: 3, note: "переконує м'яко, без наказу" },
  ],
  Скорпіон: [
    { qualityId: "focus", level: 4, note: "глибока робота без нагадувань" },
    { qualityId: "control", level: 4, note: "потреба знати, що відбувається" },
    { qualityId: "closeness", level: 3, note: "близькість після перевірки" },
  ],
  Стрілець: [
    { qualityId: "openness", level: 5, note: "незнайоме — причина йти" },
    { qualityId: "playfulness", level: 4, note: "гра як спосіб думати" },
    { qualityId: "planning", level: 2, note: "план з'являється після події" },
  ],
  Козоріг: [
    { qualityId: "discipline", level: 5, note: "робить потрібне без нагляду" },
    { qualityId: "planning", level: 4, note: "послідовність на місяці вперед" },
    { qualityId: "playfulness", level: 2, note: "проба без гарантії коштує дорого" },
  ],
  Водолій: [
    { qualityId: "abstraction", level: 4, note: "схема за конкретними випадками" },
    { qualityId: "autonomy", level: 4, note: "власний простір без пояснень" },
    { qualityId: "openness", level: 4, note: "шукає межі незнайомого" },
  ],
  Риби: [
    { qualityId: "empathy", level: 4, note: "чує і те, що не сказано" },
    { qualityId: "imagination", level: 4, note: "бачить варіанти поза наявним" },
    { qualityId: "precision", level: 2, note: "деталі губляться" },
  ],
};

/** Місцевий відмінок знака: «Сонце в Овні», а не «Сонце в Овен». */
const IN_SIGN: Readonly<Record<string, string>> = {
  Овен: "в Овні",
  Телець: "у Тельці",
  Близнюки: "у Близнюках",
  Рак: "у Раку",
  Лев: "у Леві",
  Діва: "у Діві",
  Терези: "у Терезах",
  Скорпіон: "у Скорпіоні",
  Стрілець: "у Стрільці",
  Козоріг: "у Козорозі",
  Водолій: "у Водолії",
  Риби: "у Рибах",
};

/** «Сонце …» для знака; `null` — знака немає в таблиці. */
export function sunInSign(sign: string): string | null {
  return IN_SIGN[sign] ?? null;
}

export const WESTERN_SIGNS: readonly string[] = Object.keys(BY_SIGN);

/** Стихія: вогонь, земля, повітря, вода — по колу від Овна. */
const BY_ELEMENT: Readonly<Record<string, SignRule>> = {
  Вогонь: { qualityId: "purposefulness", level: 3, note: "стихія підсилює напрям" },
  Земля: { qualityId: "organization", level: 3, note: "стихія підсилює структуру" },
  Повітря: { qualityId: "abstraction", level: 3, note: "стихія підсилює схеми" },
  Вода: { qualityId: "imagination", level: 3, note: "стихія підсилює уяву" },
};

/** Хрест: кардинальний, фіксований, мутабельний. */
const BY_MODALITY: Readonly<Record<string, SignRule>> = {
  Кардинальний: { qualityId: "tempo", level: 3, note: "хрест задає темп" },
  Фіксований: { qualityId: "endurance", level: 3, note: "хрест задає витривалість" },
  Мутабельний: { qualityId: "learning", level: 3, note: "хрест задає здатність вчитися" },
};

/** Декан як фаза: перший — прояв, другий — робота, третій — перехід. */
const BY_DECAN: Readonly<Record<1 | 2 | 3, SignRule>> = {
  1: { qualityId: "initiative", level: 3, note: "перший декан — зовнішній прояв" },
  2: { qualityId: "focus", level: 3, note: "другий декан — внутрішня робота" },
  3: { qualityId: "cooperation", level: 3, note: "третій декан — перехід до іншого" },
};

/** Управитель декана: кожен планетарний управитель має власний акцент. */
const BY_DECAN_RULER: Readonly<Record<string, SignRule>> = {
  Сонце: { qualityId: "leadership", level: 3, note: "декан під Сонцем" },
  Місяць: { qualityId: "care", level: 3, note: "декан під Місяцем" },
  Меркурій: { qualityId: "analysis", level: 3, note: "декан під Меркурієм" },
  Венера: { qualityId: "aesthetics", level: 3, note: "декан під Венерою" },
  Марс: { qualityId: "enterprise", level: 3, note: "декан під Марсом" },
  Юпітер: { qualityId: "openness", level: 3, note: "декан під Юпітером" },
  Сатурн: { qualityId: "planning", level: 3, note: "декан під Сатурном" },
};

/** Управитель межі: той самий канон, інший акцент — щоб не рахувати двічі те саме. */
const BY_BOUND_RULER: Readonly<Record<string, SignRule>> = {
  Сонце: { qualityId: "purposefulness", level: 3, note: "межа під Сонцем" },
  Місяць: { qualityId: "empathy", level: 3, note: "межа під Місяцем" },
  Меркурій: { qualityId: "precision", level: 3, note: "межа під Меркурієм" },
  Венера: { qualityId: "persuasion", level: 3, note: "межа під Венерою" },
  Марс: { qualityId: "initiative", level: 3, note: "межа під Марсом" },
  Юпітер: { qualityId: "learning", level: 3, note: "межа під Юпітером" },
  Сатурн: { qualityId: "organization", level: 3, note: "межа під Сатурном" },
};

function claimOf(rule: SignRule, parameter: string, details: readonly string[]): QualityClaim {
  return makeClaim({
    qualityId: rule.qualityId,
    level: rule.level,
    layer: "symbolic",
    sourceId: WESTERN.id,
    sourceVersion: WESTERN.version,
    method: "mapped",
    evidence: `${parameter}: ${rule.note}`,
    details,
  });
}

/**
 * Свідчення західної системи. Кожне спирається на **свій** канонічний
 * показник, тому рівні не дублюють один одного під виглядом підтвердження.
 */
export function westernClaims(profile: WesternProfile): readonly QualityClaim[] {
  const signRules = BY_SIGN[profile.sign];
  const place = sunInSign(profile.sign);
  if (!signRules || !place) {
    throw new Error(`Знак «${profile.sign}» відсутній у таблиці західної лінзи.`);
  }

  const sun = `Сонце ${place}, ${profile.degreeLabel} (${profile.at})`;
  const range = profile.ambiguous.length
    ? [`За добу показник рухається: ${profile.ambiguous.join("; ")}.`]
    : [];

  const claims = signRules.map((rule) =>
    claimOf(rule, `Сонце ${place}`, [
      `Дата: ${profile.date}`,
      `${sun} — знак ${profile.sign}`,
      `Правило: ${profile.sign} дає «${rule.note}» → рівень ${rule.level} з 5.`,
      ...range,
    ]),
  );

  const element = BY_ELEMENT[profile.element];
  if (element) {
    claims.push(
      claimOf(element, `Стихія ${profile.element}`, [
        `${profile.sign} — стихія ${profile.element}.`,
        `Правило: ${element.note} → рівень ${element.level} з 5.`,
      ]),
    );
  }

  const modality = BY_MODALITY[profile.modality];
  if (modality) {
    claims.push(
      claimOf(modality, `Хрест ${profile.modality}`, [
        `${profile.sign} — ${profile.modality.toLowerCase()} хрест.`,
        `Правило: ${modality.note} → рівень ${modality.level} з 5.`,
      ]),
    );
  }

  claims.push(
    claimOf(BY_DECAN[profile.decan], `Декан ${profile.decan}-й`, [
      `Градус у знаку: ${profile.degreeLabel}.`,
      `Декан: ${profile.decan}-й (${(profile.decan - 1) * 10}°–${profile.decan * 10}°).`,
      `Правило: ${BY_DECAN[profile.decan].note} → рівень 3 з 5.`,
    ]),
  );

  const decanRuler = BY_DECAN_RULER[profile.decanRuler];
  if (decanRuler) {
    claims.push(
      claimOf(decanRuler, `Управитель декана ${profile.decanRuler}`, [
        `Декан ${profile.decan}-й під управителем ${profile.decanRuler} (халдейський порядок).`,
        `Правило: ${decanRuler.note} → рівень 3 з 5.`,
      ]),
    );
  }

  const boundRuler = BY_BOUND_RULER[profile.boundRuler];
  if (boundRuler) {
    claims.push(
      claimOf(boundRuler, `Межа ${profile.boundLabel}`, [
        `Градус ${profile.degreeLabel} лежить у межі ${profile.boundLabel} (єгипетські терми).`,
        `Правило: ${boundRuler.note} → рівень 3 з 5.`,
      ]),
    );
  }

  const dwadRules = BY_SIGN[profile.dwad];
  const dwadTone = dwadRules?.[0];
  if (dwadTone) {
    claims.push(
      claimOf(
        { ...dwadTone, level: 3, note: `відтінок ${profile.dwad}` },
        `Двадашамша ${profile.dwad}`,
        [
          `Дванадцята частина знака: ${profile.dwad} (крок 2°30′).`,
          `Правило: двадашамша додає відтінок «${dwadTone.note}» → рівень 3 з 5.`,
        ],
      ),
    );
  }

  return claims;
}
