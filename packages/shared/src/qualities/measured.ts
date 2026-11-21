/**
 * Виміряний шар: відповіді людини → свідчення про ті самі 36 якостей.
 * Другий вектор ядра: фактори стають рівнями з шаром `measured`, доказом
 * («18 з 20») і впевненістю, зменшеною надійністю інструмента. Фактор ширший
 * за якість, тож відображення — наше правило; високий нейротизм перевертає
 * рівень. Межі — `specs/analysis-core/01-core.md` §2.
 * @module @wwwuabot/shared/qualities/measured
 */

import { confidenceOf, makeClaim } from "./claims";
import type { QualityClaim, QualityLevel } from "./types";

/** Джерело виміряного шару: ключ інструмента в реєстрі тестів. */
export const MEASURED_SOURCE = "bigfive";

/** Назва джерела для людини: та сама, що в реєстрі тестів. */
export const MEASURED_NAME = "Велика п'ятірка";

/** Версія таблиці відображення: зміна правил — нова версія. */
export const MEASURED_VERSION = "1";

/**
 * Надійність короткої версії з публікації (внутрішня узгодженість факторів
 * близько .70). Вона зменшує впевненість свідчення: п'ять питань на фактор —
 * це не тридцять граней, і продукт не має вдавати інше.
 */
const RELIABILITY = 0.7;

/** Одне правило: яку якість описує фактор і чи рівень перевертається. */
interface FactorRule {
  readonly qualityId: string;
  readonly invert?: boolean;
}

/**
 * Фактор → якості: гіпотеза про поведінку, а не тотожність, тому метод
 * `mapped`, а не `direct`, і впевненість нижча за одиницю.
 */
const BY_FACTOR: Readonly<Record<string, readonly FactorRule[]>> = {
  extraversion: [
    { qualityId: "extraversion" },
    { qualityId: "initiative" },
    { qualityId: "vitality" },
  ],
  agreeableness: [{ qualityId: "empathy" }, { qualityId: "cooperation" }, { qualityId: "care" }],
  conscientiousness: [
    { qualityId: "discipline" },
    { qualityId: "organization" },
    { qualityId: "planning" },
    { qualityId: "precision" },
  ],
  neuroticism: [
    { qualityId: "stressResilience", invert: true },
    { qualityId: "endurance", invert: true },
  ],
  openness: [
    { qualityId: "openness" },
    { qualityId: "imagination" },
    { qualityId: "aesthetics" },
    { qualityId: "learning" },
  ],
};

/** Фактори, для яких є правило; порожній список — помилка даних. */
export const MEASURED_FACTORS: readonly string[] = Object.keys(BY_FACTOR);

/** Якості, які може назвати тест: для довідника «хто це визначає». */
export const MEASURED_QUALITIES: readonly string[] = [
  ...new Set(
    Object.values(BY_FACTOR)
      .flat()
      .map((rule) => rule.qualityId),
  ),
].sort();

/**
 * Фактор разом із його рівнем і доказом.
 *
 * `evidence` приходить готовим із джерела («Екстраверсія — 18 з 20, високий
 * рівень»): ядро не знає ані смуг, ані арифметики інструмента, і не має
 * вигадувати доказ, якого не бачило.
 */
export interface MeasuredFactor {
  readonly factor: string;
  readonly level: QualityLevel;
  readonly evidence: string;
}

/** Рівень у протилежний бік шкали 1…5. */
function inverted(level: QualityLevel): QualityLevel {
  return (6 - level) as QualityLevel;
}

/**
 * Свідчення виміряного шару. Невідомий фактор кидає: мовчазний пропуск
 * означав би, що частина відповідей людини зникла без сліду.
 */
export function measuredClaims(factors: readonly MeasuredFactor[]): readonly QualityClaim[] {
  const confidence = confidenceOf("measured", { reliability: RELIABILITY, directness: 0.8 });
  return factors.flatMap(({ factor, level, evidence }) => {
    const rules = BY_FACTOR[factor];
    if (!rules) {
      throw new Error(`Фактор «${factor}» не має правила в ядрі — свідчення не має де жити.`);
    }
    return rules.map((rule) =>
      makeClaim({
        qualityId: rule.qualityId,
        level: rule.invert ? inverted(level) : level,
        layer: "measured",
        sourceId: MEASURED_SOURCE,
        sourceVersion: MEASURED_VERSION,
        method: "mapped",
        evidence,
        confidence,
      }),
    );
  });
}
