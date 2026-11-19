/**
 * Ядро якостей: типи. Якість — власник, джерело — свідок; рівень без якоря — декорація.
 * Правила шарів і межі — `specs/analysis-core/01-core.md`.
 *
 * @module @wwwuabot/shared/qualities/types
 */

/** Смуга рівня: 1 — дуже низький, 5 — дуже високий. */
export type QualityLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Що саме описує якість.
 *
 * `trait` — стабільне ядро, `state` — поточний стан із терміном придатності,
 * `role` — те, що проявляється у стосунках і ролях. Стан ніколи не змішується
 * з рисою: інакше тижневий епізод тривоги стає «рисою характеру».
 */
export type QualityTemporal = "trait" | "state" | "role";

/** Чутливі якості (здоров'я, тіло, стосунки) показуються лише зі згодою. */
export type QualitySensitivity = "normal" | "sensitive";

/** Як якість поводиться в парі — правило, а не «відсоток сумісності». */
export type PairRule = "complementary" | "collision" | "risk-if-both-low" | "amplifier" | "neutral";

/**
 * Шар доказів. `measured` — валідований інструмент, `narrative` — мова
 * типології без валідованого підґрунту, `symbolic` — детермінований
 * розрахунок від дати. Шари не змішуються в одне число.
 */
export type ClaimLayer = "measured" | "narrative" | "symbolic";

/** Як із виходу джерела вийшов рівень. */
export type ClaimMethod = "direct" | "mapped" | "derived";

/** Що джерело приймає на вході. */
export type LensInput = "date" | "date-time-place" | "answers" | "user-result";

/** Одна якість онтології. */
export interface Quality {
  readonly id: string;
  readonly name: string;
  /** Одне речення: що високий рівень означає **поведінково**. */
  readonly definition: string;
  readonly temporal: QualityTemporal;
  readonly sensitivity: QualitySensitivity;
  readonly pairRule: PairRule;
  /** П'ять якорів: індекс 0 — рівень 1, індекс 4 — рівень 5. */
  readonly anchors: readonly [string, string, string, string, string];
}

/** Домен ядра разом зі своїми якостями. */
export interface QualityDomain {
  readonly id: string;
  readonly name: string;
  readonly qualities: readonly Quality[];
}

/** Свідчення джерела про якість. Одне свідчення — одне джерело. */
export interface QualityClaim {
  readonly qualityId: string;
  readonly level: QualityLevel;
  readonly layer: ClaimLayer;
  readonly sourceId: string;
  readonly sourceVersion: string;
  /** Дослівний доказ у одиницях джерела: «Сонце в Овні», «грань 4 з 6». */
  readonly evidence: string;
  readonly method: ClaimMethod;
  readonly temporal: QualityTemporal;
  /** 0…1; стеля шару задана в `claims.ts`, а не в адаптері. */
  readonly confidence: number;
}

/** Джерело аналізу як адаптер, а не окремий екран. */
export interface LensDefinition {
  readonly id: string;
  readonly name: string;
  /** Версія таблиці відображення: зміна правил — нова версія. */
  readonly version: string;
  readonly layer: ClaimLayer;
  readonly inputs: readonly LensInput[];
}

/** Підписи смуг — єдині для всього продукту. */
export const QUALITY_LEVELS: readonly { readonly value: QualityLevel; readonly label: string }[] = [
  { value: 1, label: "Дуже низький" },
  { value: 2, label: "Низький" },
  { value: 3, label: "Середній" },
  { value: 4, label: "Високий" },
  { value: 5, label: "Дуже високий" },
];

/** Підпис рівня; невідоме значення — помилка даних, а не «середній». */
export function levelLabel(level: QualityLevel): string {
  const found = QUALITY_LEVELS.find((candidate) => candidate.value === level);
  if (!found) throw new Error(`Рівень ${level} поза шкалою 1…5.`);
  return found.label;
}
