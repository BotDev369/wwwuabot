/**
 * Виміряний шар у ядрі: фактор → якості, з інверсією вразливості.
 * **Головне, що стережеться.** Свідчення мусить жити в ядрі (невідома якість
 * кидає), мати шар `measured`, а не `symbolic`, і не підвищувати впевненості
 * понад надійність короткого інструмента. Окремо — нейротизм: високий рівень
 * тут означає **нижчу** стійкість, і це єдина інверсія в таблиці.
 * @module @wwwuabot/shared/qualities/measured.test
 */

import { describe, expect, it } from "vitest";
import { MEASURED_FACTORS, MEASURED_SOURCE, measuredClaims } from "./measured";
import { getQuality } from "./domains";
import { readQuality } from "./reading";

const FACTOR_LEVELS: Record<string, 1 | 2 | 3 | 4 | 5> = {
  extraversion: 4,
  agreeableness: 3,
  conscientiousness: 5,
  neuroticism: 5,
  openness: 2,
};

function allFactors() {
  return MEASURED_FACTORS.map((factor) => ({
    factor,
    level: FACTOR_LEVELS[factor] ?? 3,
    evidence: `${factor} — 18 з 20`,
  }));
}

describe("measuredClaims", () => {
  it("усі п'ять факторів дають свідчення про існуючі якості", () => {
    const claims = measuredClaims(allFactors());

    expect(claims).toHaveLength(16);
    for (const claim of claims) {
      expect(getQuality(claim.qualityId), claim.qualityId).not.toBeNull();
      expect(claim.layer).toBe("measured");
      expect(claim.sourceId).toBe(MEASURED_SOURCE);
      expect(claim.evidence).toContain("18 з 20");
    }
  });

  it("шар виміряний, а впевненість нижча за одиницю — через надійність короткої версії", () => {
    const [claim] = measuredClaims(allFactors());
    if (!claim) throw new Error("Свідчень немає.");

    // 0.9 (база шару) × 0.7 (надійність) × 0.8 (відображення) = 0.5
    expect(claim.confidence).toBe(0.5);
  });

  it("високий нейротизм означає нижчу стійкість до стресу", () => {
    const claims = measuredClaims([
      { factor: "neuroticism", level: 5, evidence: "Емоційна вразливість — 19 з 20" },
    ]);
    const stress = claims.find((claim) => claim.qualityId === "stressResilience");

    expect(stress?.level).toBe(1);
    expect(claims.find((claim) => claim.qualityId === "endurance")?.level).toBe(1);
  });

  it("низький нейротизм піднімає стійкість, а не лишає на місці", () => {
    const claims = measuredClaims([
      { factor: "neuroticism", level: 1, evidence: "Емоційна вразливість — 4 з 20" },
    ]);

    expect(claims.find((claim) => claim.qualityId === "stressResilience")?.level).toBe(5);
  });

  it("невідомий фактор — помилка, а не тихий пропуск", () => {
    expect(() => measuredClaims([{ factor: "магія", level: 3, evidence: "щось" }])).toThrow(
      /не має правила/,
    );
  });

  it("два джерела про ту саму якість дають розбіжність, а не середнє", () => {
    const measured = measuredClaims([
      { factor: "extraversion", level: 5, evidence: "Екстраверсія — 20 з 20" },
    ]).find((claim) => claim.qualityId === "extraversion");
    const symbolic = {
      qualityId: "extraversion",
      level: 2 as const,
      layer: "symbolic" as const,
      sourceId: "western",
      sourceVersion: "1",
      evidence: "Сонце в Діві: тримається осторонь",
      method: "mapped" as const,
      temporal: "trait" as const,
      confidence: 0.16,
    };
    const quality = getQuality("extraversion");
    if (!measured || !quality) throw new Error("Немає свідчення або якості.");

    const reading = readQuality([measured, symbolic], quality);
    expect(reading.divergent).toBe(true);
    expect(reading.level).toBeNull();
  });
});
