/**
 * Дванадцять доменів v0 — по три якості. Домен тримає їх разом, щоб було видно
 * конфігурацію, а не плоский список. Межа розширення — `specs/analysis-core/01-core.md`.
 *
 * @module @wwwuabot/shared/qualities/domains
 */

import { BODY } from "./body";
import { CREATIVITY } from "./creativity";
import { EMOTIONS } from "./emotions";
import { ENERGY } from "./energy";
import { MIND } from "./mind";
import { ORDER } from "./order";
import { REALIZATION } from "./realization";
import { RELATIONS } from "./relations";
import { SOCIAL } from "./social";
import { SPEECH } from "./speech";
import { VALUES } from "./values";
import { WILL } from "./will";
import type { Quality, QualityDomain } from "../types";

/** Порядок доменів — це порядок показу в досьє. */
export const QUALITY_DOMAINS: readonly QualityDomain[] = [
  ENERGY,
  MIND,
  SPEECH,
  SOCIAL,
  WILL,
  ORDER,
  CREATIVITY,
  VALUES,
  EMOTIONS,
  BODY,
  RELATIONS,
  REALIZATION,
];

/** Усі якості одним списком — для перевірок повноти й для пошуку за ключем. */
export const QUALITIES: readonly Quality[] = QUALITY_DOMAINS.flatMap((domain) => domain.qualities);

const BY_ID = new Map(QUALITIES.map((quality) => [quality.id, quality]));

/** Якість за ключем; `null` — так ключ читається зі свідчення. */
export function getQuality(id: string): Quality | null {
  return BY_ID.get(id) ?? null;
}

/** Якості домену; порожній список — помилка даних, а не «домен без якостей». */
export function qualitiesOf(domainId: string): readonly Quality[] {
  const domain = QUALITY_DOMAINS.find((candidate) => candidate.id === domainId);
  if (!domain) throw new Error(`Домену «${domainId}» немає в ядрі.`);
  return domain.qualities;
}
