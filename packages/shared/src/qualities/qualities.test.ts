import { describe, expect, it } from "vitest";
import { QUALITIES, QUALITY_DOMAINS, getQuality, qualitiesOf } from "./domains";
import { levelLabel } from "./types";
import type { PairRule, QualityLevel, QualitySensitivity, QualityTemporal } from "./types";

const PAIR_RULES: readonly PairRule[] = [
  "complementary",
  "collision",
  "risk-if-both-low",
  "amplifier",
  "neutral",
];
const TEMPORAL: readonly QualityTemporal[] = ["trait", "state", "role"];
const SENSITIVITY: readonly QualitySensitivity[] = ["normal", "sensitive"];

describe("онтологія ядра", () => {
  it("дванадцять доменів по три якості", () => {
    expect(QUALITY_DOMAINS).toHaveLength(12);
    for (const domain of QUALITY_DOMAINS) {
      expect(domain.qualities).toHaveLength(3);
      expect(domain.name.trim()).not.toBe("");
      expect(domain.id.trim()).not.toBe("");
    }
    expect(QUALITIES).toHaveLength(36);
  });

  it("ключі доменів і якостей унікальні", () => {
    expect(new Set(QUALITY_DOMAINS.map((domain) => domain.id)).size).toBe(QUALITY_DOMAINS.length);
    expect(new Set(QUALITIES.map((quality) => quality.id)).size).toBe(QUALITIES.length);
    expect(new Set(QUALITIES.map((quality) => quality.name)).size).toBe(QUALITIES.length);
  });

  it("у кожної якості п'ять непорожніх і різних якорів", () => {
    for (const quality of QUALITIES) {
      expect(quality.anchors, quality.id).toHaveLength(5);
      for (const anchor of quality.anchors) {
        expect(anchor.trim().length, `${quality.id}: порожній якір`).toBeGreaterThan(10);
      }
      expect(new Set(quality.anchors).size, `${quality.id}: якорі повторюються`).toBe(5);
      expect(quality.definition.trim().length, `${quality.id}: немає визначення`).toBeGreaterThan(
        20,
      );
    }
  });

  it("кожна якість має відомі правила, природу й чутливість", () => {
    for (const quality of QUALITIES) {
      expect(PAIR_RULES, quality.id).toContain(quality.pairRule);
      expect(TEMPORAL, quality.id).toContain(quality.temporal);
      expect(SENSITIVITY, quality.id).toContain(quality.sensitivity);
    }
  });

  it("пошук за ключем повертає якість або null, а не мовчазний середній", () => {
    expect(getQuality("discipline")?.name).toBe("Дисципліна");
    expect(getQuality("нема-такої")).toBeNull();
    expect(() => qualitiesOf("нема-такого")).toThrow(/немає в ядрі/);
  });

  it("підпис рівня існує лише для 1…5", () => {
    expect(levelLabel(1)).toBe("Дуже низький");
    expect(levelLabel(5)).toBe("Дуже високий");
    expect(() => levelLabel(0 as QualityLevel)).toThrow(/поза шкалою/);
    expect(() => levelLabel(6 as QualityLevel)).toThrow(/поза шкалою/);
  });
});
