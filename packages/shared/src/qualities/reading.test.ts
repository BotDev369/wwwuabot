/**
 * Читання досьє: порожнє — не середина, розбіжність — не середнє, рівень має
 * якір. Тест тримає саме ці три обіцянки.
 *
 * @module packages/shared/src/qualities/reading.test
 */

import { describe, expect, it } from "vitest";
import { makeClaim } from "./claims";
import { getQuality } from "./domains";
import { anchorOf, claimSources, readDossier, readQuality } from "./reading";
import type { QualityClaim, QualityLevel } from "./types";

function claim(qualityId: string, level: QualityLevel, sourceId = "test"): QualityClaim {
  return makeClaim({
    qualityId,
    level,
    layer: "symbolic",
    sourceId,
    sourceVersion: "1",
    evidence: `рівень ${level}`,
  });
}

const initiative = getQuality("initiative");
if (!initiative) throw new Error("initiative відсутня в онтології");

describe("readQuality", () => {
  it("без свідчень каже «не знаємо», а не середину", () => {
    const reading = readQuality([], initiative);
    expect(reading.level).toBeNull();
    expect(reading.claims).toEqual([]);
    expect(reading.summary.byLevel).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  });

  it("провідний рівень беруть свідчення, а не середнє", () => {
    const reading = readQuality(
      [claim("initiative", 4), claim("initiative", 5, "друге")],
      initiative,
    );
    expect(reading.conflict).toBe(false);
    // Ваги рівні — показуємо вищий, і це вибір показу, а не оцінка.
    expect(reading.level).toBe(5);
  });

  it("розбіжність лишається розбіжністю: рівня немає, розподіл є", () => {
    const reading = readQuality(
      [claim("initiative", 5), claim("initiative", 2, "друге")],
      initiative,
    );
    expect(reading.conflict).toBe(true);
    expect(reading.level).toBeNull();
    expect(reading.summary.byLevel[5]).toBe(1);
    expect(reading.summary.byLevel[2]).toBe(1);
  });
});

describe("readDossier", () => {
  it("показує всі домени й усі якості, навіть без свідчень", () => {
    const dossier = readDossier([claim("initiative", 4)]);
    expect(dossier).toHaveLength(12);
    expect(dossier.flatMap((domain) => domain.qualities)).toHaveLength(36);
    expect(
      dossier.flatMap((domain) => domain.qualities).filter((one) => one.level !== null),
    ).toHaveLength(1);
  });

  it("лічить відомі якості домену", () => {
    const dossier = readDossier([claim("initiative", 4)]);
    const will = dossier.find((domain) =>
      domain.qualities.some((one) => one.quality.id === "initiative"),
    );
    expect(will?.known).toBe(1);
  });

  it("джерела — без повторів", () => {
    expect(
      claimSources([claim("initiative", 4), claim("focus", 3), claim("focus", 2, "друге")]),
    ).toEqual(["test", "друге"]);
  });

  it("якір рівня — текст якості, а не число", () => {
    expect(anchorOf(initiative, 4)).toBe(initiative.anchors[3]);
  });
});
