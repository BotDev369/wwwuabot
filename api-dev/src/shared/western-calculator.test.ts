import { describe, expect, it } from "vitest";
import { sunLongitude, westernProfile } from "./western-calculator";

describe("довгота Сонця", () => {
  it("збігається з прикладом Meeus 25.a (1992-10-13, 0h TD)", () => {
    expect(sunLongitude("1992-10-13", 0)).toBeCloseTo(199.91, 1);
  });

  it("1980-03-03 дає Риби в середині знака", () => {
    const profile = westernProfile("1980-03-03");
    expect(profile.sign).toBe("Риби");
    expect(profile.degree).toBeGreaterThan(10);
    expect(profile.degree).toBeLessThan(16);
    expect(profile.decan).toBe(2);
    // Риби + 5 кроків по 2°30′ → двадашамша Лева.
    expect(profile.dwad).toBe("Лев");
    expect(profile.ambiguous).toEqual([]);
  });

  it("межа знака позначається, а не округлюється мовчки", () => {
    const profile = westernProfile("2000-03-20");
    expect(profile.ambiguous.join(" ")).toContain("знак");
  });

  it("нечитабельна дата — помилка, а не «сьогодні»", () => {
    expect(() => westernProfile("03.03.1980")).toThrow();
  });
});
