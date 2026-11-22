import { describe, expect, it } from "vitest";
import { editDistance, normalizeSearchKey, searchTokens } from "./normalize";

describe("normalizeSearchKey", () => {
  it("зводить усі написання «Галя Шоп» до одного ключа", () => {
    const expected = "galyashop";
    for (const value of ["Галяшоп", "галяшоп", "Галя Шоп", "Galyashop", "GalyaShop"]) {
      expect(normalizeSearchKey(value)).toBe(expected);
    }
  });

  it("прибирає апострофи й дефіси", () => {
    expect(normalizeSearchKey("м'ята")).toBe(normalizeSearchKey("мʼята"));
    expect(normalizeSearchKey("іван-чай")).toBe(normalizeSearchKey("іван чай"));
  });

  it("шукає слова навіть тоді, коли їх написали разом", () => {
    expect(searchTokens("Галя Шоп")).toEqual(["galya", "shop"]);
    expect(normalizeSearchKey("Галя Шоп")).toBe("galyashop");
  });

  it("порожнє й пунктуація дають порожній ключ", () => {
    expect(normalizeSearchKey("   ")).toBe("");
    expect(normalizeSearchKey("!!!")).toBe("");
  });
});

describe("editDistance", () => {
  it("одна одруківка — відстань 1", () => {
    expect(editDistance("astragal", "astragall", 1)).toBe(1);
  });

  it("ранній вихід не рахує далеке слово", () => {
    expect(editDistance("astragal", "romashka", 1)).toBeGreaterThan(1);
  });
});
