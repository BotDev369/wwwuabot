/**
 * Свідчення: стеля впевненості шару жорстка — згода джерел підвищує покриття, не точність.
 * Невідома якість, рівень поза шкалою й порожній доказ кидають. Межі — `specs/analysis-core/02-model.md`.
 *
 * @module @wwwuabot/shared/qualities/claims
 */

import { getQuality } from "./domains";
import type { ClaimLayer, ClaimMethod, QualityClaim, QualityLevel, QualityTemporal } from "./types";

/** Базова впевненість шару — стеля для символічного й старт для виміряного. */
export const LAYER_BASE: Readonly<Record<ClaimLayer, number>> = {
  measured: 0.9,
  narrative: 0.5,
  symbolic: 0.2,
};

/**
 * Стеля впевненості шару. Символічний шар не може перевищити 0.35 навіть
 * підтвердженням усіх традицій світу: це мова, а не прилад.
 */
export const LAYER_CAP: Readonly<Record<ClaimLayer, number>> = {
  measured: 1,
  narrative: 0.6,
  symbolic: 0.35,
};

/** Множники, які зменшують базову впевненість; усі за замовчуванням 1. */
export interface ConfidenceFactors {
  /** Надійність інструмента з психометрики (α, test-retest). */
  readonly reliability?: number;
  /** Свіжість для стану: 1 — щойно, 0 — поза вікном інструмента. */
  readonly freshness?: number;
  /** Прямота: 1 — питання про цю саму якість, 0.8 — відображення, 0.6 — похідне. */
  readonly directness?: number;
}

/** Впевненість свідчення: база шару × множники, не вище стелі шару. */
export function confidenceOf(layer: ClaimLayer, factors: ConfidenceFactors = {}): number {
  const raw =
    LAYER_BASE[layer] *
    (factors.reliability ?? 1) *
    (factors.freshness ?? 1) *
    (factors.directness ?? 1);
  const capped = Math.min(raw, LAYER_CAP[layer]);
  return Math.round(capped * 100) / 100;
}

/** Те, що адаптер знає; решту (впевненість, природу) добирає `makeClaim`. */
export interface ClaimDraft {
  readonly qualityId: string;
  readonly level: QualityLevel;
  readonly layer: ClaimLayer;
  readonly sourceId: string;
  readonly sourceVersion: string;
  readonly evidence: string;
  readonly method?: ClaimMethod;
  readonly temporal?: QualityTemporal;
  readonly confidence?: number;
  readonly details?: readonly string[];
}

const DIRECTNESS: Readonly<Record<ClaimMethod, number>> = {
  direct: 1,
  mapped: 0.8,
  derived: 0.6,
};

/**
 * Збирає свідчення й перевіряє його на сумісність з онтологією.
 *
 * `temporal` не можна змінити: якщо інструмент міряє **стан**, а якість — риса,
 * це помилка відображення, а не привід тихо переписати природу якості.
 */
export function makeClaim(draft: ClaimDraft): QualityClaim {
  const quality = getQuality(draft.qualityId);
  if (!quality) {
    throw new Error(`Якості «${draft.qualityId}» немає в ядрі — свідчення не має де жити.`);
  }
  if (!Number.isInteger(draft.level) || draft.level < 1 || draft.level > 5) {
    throw new Error(`Якість «${draft.qualityId}»: рівень ${draft.level} поза шкалою 1…5.`);
  }
  if (!draft.evidence.trim()) {
    throw new Error(`Якість «${draft.qualityId}»: свідчення без доказу не показується.`);
  }
  const temporal = draft.temporal ?? quality.temporal;
  if (temporal !== quality.temporal) {
    throw new Error(
      `Якість «${draft.qualityId}» — ${quality.temporal}, а свідчення — ${temporal}: природу якості не змінюють відображенням.`,
    );
  }
  const method = draft.method ?? "mapped";
  if (draft.layer === "symbolic" && method === "direct") {
    throw new Error(
      `Якість «${draft.qualityId}»: символічна лінза не може бути прямою — вона відображає, а не питає.`,
    );
  }
  const confidence =
    draft.confidence ?? confidenceOf(draft.layer, { directness: DIRECTNESS[method] });
  if (confidence < 0 || confidence > LAYER_CAP[draft.layer]) {
    throw new Error(
      `Якість «${draft.qualityId}»: впевненість ${confidence} поза межами шару ${draft.layer} (стеля ${LAYER_CAP[draft.layer]}).`,
    );
  }
  return {
    qualityId: draft.qualityId,
    level: draft.level,
    layer: draft.layer,
    sourceId: draft.sourceId,
    sourceVersion: draft.sourceVersion,
    evidence: draft.evidence,
    method,
    temporal,
    confidence,
    ...(draft.details && draft.details.length > 0 ? { details: draft.details } : {}),
  };
}
