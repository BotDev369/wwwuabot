import { describe, expect, it } from "vitest";
import { getQuality } from "../domains";
import { LAYER_CAP } from "../claims";
import { WESTERN, WESTERN_SIGNS, sunInSign, westernClaims } from "./western";

describe("західна лінза", () => {
  it("покриває всі дванадцять знаків", () => {
    expect(WESTERN_SIGNS).toHaveLength(12);
    expect(new Set(WESTERN_SIGNS).size).toBe(12);
    expect(WESTERN.inputs).toEqual(["date"]);
    expect(WESTERN.layer).toBe("symbolic");
  });

  it("кожен знак дає 2–3 свідчення про наявні якості", () => {
    for (const sign of WESTERN_SIGNS) {
      const claims = westernClaims(sign);
      expect(claims.length, sign).toBeGreaterThanOrEqual(2);
      expect(claims.length, sign).toBeLessThanOrEqual(3);
      for (const claim of claims) {
        expect(getQuality(claim.qualityId), `${sign}: ${claim.qualityId}`).not.toBeNull();
        expect(claim.layer).toBe("symbolic");
        expect(claim.confidence).toBeGreaterThan(0);
        expect(claim.confidence).toBeLessThanOrEqual(LAYER_CAP.symbolic);
        expect(claim.evidence).toContain(`Сонце ${sunInSign(sign)}`);
        expect(sunInSign(sign), sign).not.toBeNull();
        expect(claim.sourceId).toBe(WESTERN.id);
        expect(claim.sourceVersion).toBe(WESTERN.version);
      }
    }
  });

  it("знак без правила кидає, а не отримує середній профіль", () => {
    expect(() => westernClaims("Змієносець")).toThrow(/немає|відсутній/);
  });

  it("той самий знак дає той самий набір свідчень", () => {
    expect(westernClaims("Козоріг")).toEqual(westernClaims("Козоріг"));
  });
});
