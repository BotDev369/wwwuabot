import { describe, expect, it } from "vitest";
import { LAYER_CAP, confidenceOf, makeClaim } from "./claims";
import type { ClaimDraft } from "./claims";
import type { QualityLevel } from "./types";

const draft = (over: Partial<ClaimDraft> = {}): ClaimDraft => ({
  qualityId: "initiative",
  level: 4,
  layer: "symbolic",
  sourceId: "western",
  sourceVersion: "1",
  evidence: "Сонце в Овні: початок без дозволу",
  ...over,
});

describe("впевненість свідчення", () => {
  it("символічний шар не піднімається вище стелі навіть без множників", () => {
    expect(confidenceOf("symbolic")).toBe(0.2);
    expect(confidenceOf("symbolic", { reliability: 1, freshness: 1, directness: 1 })).toBe(0.2);
    expect(LAYER_CAP.symbolic).toBeLessThan(LAYER_CAP.narrative);
    expect(LAYER_CAP.narrative).toBeLessThan(LAYER_CAP.measured);
  });

  it("виміряне пряме, відображене й похідне мають різну вагу", () => {
    expect(confidenceOf("measured", { directness: 1 })).toBe(0.9);
    expect(confidenceOf("measured", { directness: 0.8 })).toBe(0.72);
    expect(confidenceOf("measured", { directness: 0.6 })).toBe(0.54);
  });

  it("свіжість стану гасить впевненість до нуля", () => {
    expect(confidenceOf("measured", { directness: 1, freshness: 0 })).toBe(0);
  });
});

describe("збирання свідчення", () => {
  it("природу якості бере з онтології", () => {
    const claim = makeClaim(draft());
    expect(claim.temporal).toBe("trait");
    expect(claim.method).toBe("mapped");
    expect(claim.confidence).toBe(0.16);
  });

  it("невідома якість, рівень поза шкалою й порожній доказ кидають", () => {
    expect(() => makeClaim(draft({ qualityId: "нема-такої" }))).toThrow(/немає в ядрі/);
    expect(() => makeClaim(draft({ level: 0 as QualityLevel }))).toThrow(/поза шкалою/);
    expect(() => makeClaim(draft({ level: 6 as QualityLevel }))).toThrow(/поза шкалою/);
    expect(() => makeClaim(draft({ evidence: "   " }))).toThrow(/без доказу/);
  });

  it("свідчення не може змінити природу якості", () => {
    expect(() => makeClaim(draft({ qualityId: "anxiety", temporal: "trait" }))).toThrow(
      /природу якості/,
    );
    expect(makeClaim(draft({ qualityId: "anxiety", temporal: "state" })).temporal).toBe("state");
  });

  it("символічна лінза не може бути прямою", () => {
    expect(() => makeClaim(draft({ method: "direct" }))).toThrow(/не може бути прямою/);
  });

  it("впевненість вище стелі шару кидає, а не обрізається тихо", () => {
    expect(() => makeClaim(draft({ confidence: 0.9 }))).toThrow(/стеля/);
    expect(makeClaim(draft({ confidence: 0.35 })).confidence).toBe(0.35);
  });
});
