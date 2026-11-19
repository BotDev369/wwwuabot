/**
 * Західна лінза: знак Сонця → свідчення. Знак дає калькулятор, таблицю — вона.
 * Знак без правила кидає: мовчазного «середнього» немає. Межі — `specs/analysis-core/03-sources.md`.
 *
 * @module @wwwuabot/shared/qualities/lenses/western
 */

import { makeClaim } from "../claims";
import type { LensDefinition, QualityClaim, QualityLevel } from "../types";

/** Лінза як дані: версія, шар, входи. */
export const WESTERN: LensDefinition = {
  id: "western",
  name: "Західна астрологія",
  version: "1",
  layer: "symbolic",
  inputs: ["date"],
};

interface SignRule {
  readonly qualityId: string;
  readonly level: QualityLevel;
  /** Чому саме так — частина доказу, а не прикраса. */
  readonly note: string;
}

/**
 * Таблиця відображення. Кожен знак дає 2–3 якості: більше — це вже переказ
 * гороскопу, менше — випадкове влучання.
 */
const BY_SIGN: Readonly<Record<string, readonly SignRule[]>> = {
  Овен: [
    { qualityId: "initiative", level: 4, note: "початок без дозволу" },
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

/** Усі знаки, для яких є відображення — рівно дванадцять. */
export const WESTERN_SIGNS: readonly string[] = Object.keys(BY_SIGN);

/**
 * Свідчення лінзи для знака Сонця.
 *
 * Усі свідчення — шар `symbolic` із впевненістю 0.16: це мова традиції, а не
 * вимірювання. Числа рівня тут — ставлення традиції, а не «точність».
 */
export function westernClaims(sign: string): readonly QualityClaim[] {
  const rules = BY_SIGN[sign];
  if (!rules) {
    throw new Error(`Знак «${sign}» відсутній у таблиці західної лінзи — мовчазного рівня немає.`);
  }
  return rules.map((rule) =>
    makeClaim({
      qualityId: rule.qualityId,
      level: rule.level,
      layer: "symbolic",
      sourceId: WESTERN.id,
      sourceVersion: WESTERN.version,
      method: "mapped",
      evidence: `Сонце в ${sign}: ${rule.note}`,
    }),
  );
}
