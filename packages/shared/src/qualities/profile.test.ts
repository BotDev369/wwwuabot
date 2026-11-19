import { describe, expect, it } from "vitest";
import { makeClaim } from "./claims";
import type { ClaimDraft } from "./claims";
import { accents, hasConflict, summarize, summarizeQuality, unknownQualities } from "./profile";
import { QUALITIES } from "./domains";

const claim = (over: Partial<ClaimDraft> = {}) =>
  makeClaim({
    qualityId: "analysis",
    level: 4,
    layer: "measured",
    sourceId: "ipip-neo",
    sourceVersion: "1",
    evidence: "грань 4 з 6",
    method: "direct",
    ...over,
  });

describe("профіль якості", () => {
  it("зберігає розподіл, а не середнє", () => {
    const summary = summarizeQuality(
      [
        claim({ level: 5 }),
        claim({ level: 2, layer: "symbolic", sourceId: "western", method: "mapped" }),
      ],
      "analysis",
    );
    expect(summary.claims).toBe(2);
    expect(summary.byLevel[5]).toBe(1);
    expect(summary.byLevel[2]).toBe(1);
    expect(summary.byLevel[3]).toBe(0);
    expect(summary.support).toBe(0.9);
    expect(summary.oppose).toBe(0.16);
  });

  it("суперечність видно, а не придушується", () => {
    const conflict = summarizeQuality(
      [
        claim({ level: 5 }),
        claim({ level: 1, sourceId: "western", layer: "symbolic", method: "mapped" }),
      ],
      "analysis",
    );
    const agreed = summarizeQuality([claim({ level: 5 }), claim({ level: 4 })], "analysis");
    expect(hasConflict(conflict)).toBe(true);
    expect(hasConflict(agreed)).toBe(false);
  });

  it("акценти — це показ, а не рейтинг: бере лише там, де є підтримка", () => {
    const claims = [
      claim({ qualityId: "analysis", level: 5 }),
      claim({
        qualityId: "discipline",
        level: 2,
        sourceId: "western",
        layer: "symbolic",
        method: "mapped",
      }),
    ];
    const list = accents(claims, 5);
    expect(list).toHaveLength(1);
    expect(list[0].qualityId).toBe("analysis");
  });

  it("якості без свідчень повертаються окремо — це «не знаємо»", () => {
    const unknown = unknownQualities([claim()]);
    expect(unknown).toHaveLength(QUALITIES.length - 1);
    expect(unknown.some((quality) => quality.id === "analysis")).toBe(false);
    expect(summarize([])).toEqual([]);
  });
});
