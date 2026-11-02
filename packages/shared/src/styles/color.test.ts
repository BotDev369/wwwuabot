/**
 * Кольорова арифметика: нею міряють контраст авторських тем, тож вона мусить
 * давати ті самі числа, що й `color-mix()` у CSS.
 *
 * @module packages/shared/src/styles/color.test
 */

import { describe, expect, it } from "vitest";
import { contrastRatio, hexToHsl, hexToRgb, hslToHex, mixHex, rgbToHex } from "./color";

describe("hex ↔ rgb", () => {
  it("читає шість цифр і скорочену форму", () => {
    expect(hexToRgb("#ff8800")).toEqual({ r: 255, g: 136, b: 0 });
    expect(hexToRgb("#f80")).toEqual({ r: 255, g: 136, b: 0 });
  });

  it("сміття — не колір", () => {
    expect(hexToRgb("не-колір")).toBeNull();
    expect(hexToRgb("#12345")).toBeNull();
  });

  it("пише шість цифр і затискає канали", () => {
    expect(rgbToHex({ r: 255, g: 136, b: 0 })).toBe("#ff8800");
    expect(rgbToHex({ r: -20, g: 300, b: 12.6 })).toBe("#00ff0d");
  });
});

describe("hex ↔ hsl", () => {
  it("відтінок, насиченість і світність читаються з кольору", () => {
    const hsl = hexToHsl("#ff0000");
    expect(hsl).not.toBeNull();
    expect(hsl?.h).toBeCloseTo(0, 0);
    expect(hsl?.s).toBeCloseTo(100, 0);
    expect(hsl?.l).toBeCloseTo(50, 0);
  });

  it("колір переживає подорож туди й назад — з точністю до каналу", () => {
    // Відтінок округлюється до градуса, тож один канал може зсунутись на 1.
    for (const color of ["#a0330f", "#6fd6e8", "#cde27a", "#241d14"]) {
      const start = hexToRgb(color)!;
      const back = hexToRgb(hslToHex(hexToHsl(color)!))!;
      expect(Math.abs(back.r - start.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - start.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - start.b)).toBeLessThanOrEqual(1);
    }
  });
});

describe("мішанина", () => {
  it("половина чорного й білого — сірий", () => {
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
  });

  it("крайні частки дають рівно один із двох кольорів", () => {
    // `weight` — частка `a`: 1 — сам `a`, 0 — сам `b`.
    expect(mixHex("#a0330f", "#ffffff", 1)).toBe("#a0330f");
    expect(mixHex("#a0330f", "#ffffff", 0)).toBe("#ffffff");
  });
});

describe("контраст", () => {
  it("чорне на білому — максимум", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });

  it("той самий колір — одиниця", () => {
    expect(contrastRatio("#6fd6e8", "#6fd6e8")).toBeCloseTo(1, 5);
  });

  it("порядок кольорів не має значення", () => {
    expect(contrastRatio("#0e0e11", "#e9e9ee")).toBeCloseTo(contrastRatio("#e9e9ee", "#0e0e11"), 5);
  });
});
