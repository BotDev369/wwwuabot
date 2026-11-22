import { describe, expect, it } from "vitest";
import type { SearchEntry, SearchIndex } from "./match";
import { SEARCH_RESULT_LIMIT, matchSearch } from "./match";

function entry(href: string, title: string, terms: string[]): SearchEntry {
  return { kind: "page", slug: href.slice(1), title, terms, href };
}

const index: SearchIndex = {
  builtAt: "2026-11-22T00:00:00.000Z",
  entries: [
    entry("/galyashop", "GalyaShop", ["галяшоп", "галя шоп", "galyashop", "трави"]),
    entry("/pageslay", "PageSlay", ["pageslay", "розмальовки"]),
    entry("/galyashop/p/astrahal-sherstystok", "Астрагал шерстистоквітковий", [
      "астрагал",
      "трава астрагал",
    ]),
  ],
};

describe("matchSearch", () => {
  it("знаходить магазин за кожним написанням", () => {
    for (const query of ["Галяшоп", "галяшоп", "Галя Шоп", "Galyashop", "GalyaShop"]) {
      expect(matchSearch(index, query)[0]?.entry.href).toBe("/galyashop");
    }
  });

  it("точне пошукове слово товару перемагає входження", () => {
    expect(matchSearch(index, "астрагал")[0]?.entry.href).toBe("/galyashop/p/astrahal-sherstystok");
  });

  it("невідомий запит дає порожній список, а не помилку", () => {
    expect(matchSearch(index, "абракадабра")).toEqual([]);
    expect(matchSearch(index, "")).toEqual([]);
    expect(matchSearch(null, "галяшоп")).toEqual([]);
  });

  it("показує не більше п'яти карток", () => {
    const many: SearchIndex = {
      builtAt: "",
      entries: Array.from({ length: 9 }, (_, i) => entry(`/p${i}`, `Трава ${i}`, ["трава"])),
    };
    const found = matchSearch(many, "трава");
    expect(found).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(found.length).toBe(5);
  });

  it("одруківка не робить «нічого не знайдено»", () => {
    expect(matchSearch(index, "астрагалл")[0]?.entry.href).toBe(
      "/galyashop/p/astrahal-sherstystok",
    );
  });
});
