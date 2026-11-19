/**
 * Співставлення: спільне, різні опори й покритість. Головне, що стережеться:
 * непокрита якість не стає «розбіжністю», а розбіжність усередині людини не
 * стає числом.
 *
 * @module packages/shared/src/qualities/compare.test
 */

import { describe, expect, it } from "vitest";
import { comparePeople } from "./compare";
import type { QualityClaim, QualityLevel } from "./types";

function claim(qualityId: string, level: QualityLevel, sourceId = "western"): QualityClaim {
  return {
    qualityId,
    level,
    layer: "symbolic",
    sourceId,
    sourceVersion: "1",
    evidence: `${qualityId}: ${level}`,
    method: "mapped",
    temporal: "trait",
    confidence: 0.8,
  };
}

const ANNA = {
  label: "Анна",
  claims: [claim("initiative", 5), claim("empathy", 5), claim("discipline", 3, "numerology")],
};

const BOHDAN = {
  label: "Богдан",
  claims: [claim("initiative", 5), claim("empathy", 3)],
};

describe("співставлення людей", () => {
  const result = comparePeople([ANNA, BOHDAN]);

  it("спільна сила — тільки коли рівень є в усіх і він високий", () => {
    expect(result.shared.map((one) => one.quality.id)).toEqual(["initiative"]);
    const initiative = result.shared[0];
    expect(initiative.cells.map((cell) => cell.level)).toEqual([5, 5]);
  });

  it("різниця у два рівні — зона різних опор, а не «краще/гірше»", () => {
    expect(result.tension.map((one) => one.quality.id)).toEqual(["empathy"]);
    expect(result.tension[0].spread).toBe(2);
  });

  it("якість одного не стає розбіжністю, а чекає на дані другого", () => {
    expect(result.partial.map((one) => one.quality.id)).toEqual(["discipline"]);
    const discipline = result.partial[0];
    expect(discipline.coverage).toBe(1);
    expect(discipline.cells[1].state).toBe("missing");
    expect(result.shared.concat(result.tension).map((one) => one.quality.id)).not.toContain(
      "discipline",
    );
  });

  it("порожня якість лежить окремо й не рахується", () => {
    expect(result.missing.length).toBeGreaterThan(0);
    expect(result.missing.every((one) => one.coverage === 0)).toBe(true);
  });

  it("домени зі збігом — лише там, де є що порівнювати", () => {
    expect(result.domains.every((domain) => domain.compared > 0)).toBe(true);
    expect(result.domains[0].agreement).toBeGreaterThan(0);
    expect(result.compared).toBe(2);
  });

  it("покритість і внесок систем видно по кожному", () => {
    expect(result.people.map((one) => one.known)).toEqual([3, 2]);
    expect(result.people[0].systems).toEqual([
      { sourceId: "western", qualities: 2 },
      { sourceId: "numerology", qualities: 1 },
    ]);
  });

  it("розбіжність усередині людини лишає якість без рівня", () => {
    const split = comparePeople([
      {
        label: "Іван",
        claims: [claim("empathy", 5), claim("empathy", 2, "numerology")],
      },
      BOHDAN,
    ]);
    const empathy = split.partial.find((one) => one.quality.id === "empathy");
    expect(empathy?.cells[0]).toMatchObject({ state: "unsettled", level: null });
    expect(split.tension.map((one) => one.quality.id)).not.toContain("empathy");
  });

  it("без людей — порожній результат, а не помилка", () => {
    const empty = comparePeople([]);
    expect(empty.compared).toBe(0);
    expect(empty.domains).toEqual([]);
    expect(empty.people).toEqual([]);
  });
});
