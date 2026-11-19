import { describe, expect, it } from "vitest";
import { getQuality } from "../domains";
import { LAYER_CAP } from "../claims";
import { WESTERN, WESTERN_SIGNS, sunInSign, westernClaims, type WesternProfile } from "./western";

function profile(sign: string, overrides: Partial<WesternProfile> = {}): WesternProfile {
  const index = WESTERN_SIGNS.indexOf(sign);
  return {
    date: "1980-03-03",
    sign,
    degree: 12.9,
    degreeLabel: "12°58′",
    sunLabel: "12°58′ Риб",
    at: "12:00 UTC",
    decan: 2,
    decanRuler: "Юпітер",
    boundLabel: "Венера, 0°–12°",
    boundRuler: "Венера",
    dwad: "Скорпіон",
    element: "Вода",
    modality: "Мутабельний",
    polarity: "Їнь",
    ruler: "Нептун",
    traditionalRuler: "Юпітер",
    ambiguous: [],
    ...overrides,
    ...(index < 0 ? {} : {}),
  };
}

describe("західна лінза", () => {
  it("покриває всі дванадцять знаків", () => {
    expect(WESTERN_SIGNS).toHaveLength(12);
    expect(new Set(WESTERN_SIGNS).size).toBe(12);
    expect(WESTERN.inputs).toEqual(["date"]);
    expect(WESTERN.layer).toBe("symbolic");
    expect(WESTERN.about).toBeTruthy();
    expect(WESTERN.limits?.length).toBeGreaterThan(0);
  });

  it("кожен знак дає дев'ять свідчень, і кожне має ланцюг розрахунку", () => {
    for (const sign of WESTERN_SIGNS) {
      const claims = westernClaims(profile(sign));
      expect(claims).toHaveLength(9);
      for (const claim of claims) {
        expect(getQuality(claim.qualityId), `${sign}: ${claim.qualityId}`).not.toBeNull();
        expect(claim.layer).toBe("symbolic");
        expect(claim.confidence).toBeGreaterThan(0);
        expect(claim.confidence).toBeLessThanOrEqual(LAYER_CAP.symbolic);
        expect(claim.details?.length).toBeGreaterThan(1);
        expect(claim.sourceId).toBe(WESTERN.id);
        expect(claim.sourceVersion).toBe(WESTERN.version);
      }
      expect(claims[0]?.evidence).toContain(`Сонце ${sunInSign(sign)}`);
    }
  });

  it("знак без правила кидає, а не отримує середній профіль", () => {
    expect(() => westernClaims(profile("Змієносець"))).toThrow(/немає|відсутній/);
  });

  it("той самий профіль дає той самий набір свідчень", () => {
    expect(westernClaims(profile("Козоріг"))).toEqual(westernClaims(profile("Козоріг")));
  });

  it("декан, межа й двадашамша додають власні показники, а не копію знака", () => {
    const base = westernClaims(profile("Риби"));
    const shifted = westernClaims(
      profile("Риби", { decan: 3, decanRuler: "Марс", boundRuler: "Сатурн", dwad: "Риби" }),
    );
    expect(base.map((one) => one.evidence)).not.toEqual(shifted.map((one) => one.evidence));
  });

  it("невизначеність доби потрапляє в ланцюг, а не ховається", () => {
    const [first] = westernClaims(profile("Овен", { ambiguous: ["знак: Овен → Телець"] }));
    expect(first?.details?.join(" ")).toContain("Овен → Телець");
  });
});
