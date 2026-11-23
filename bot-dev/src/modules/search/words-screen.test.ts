import { describe, expect, it } from "vitest";
import type { SearchEntry } from "@wwwuabot/shared/search";
import { termsTree, wordsScreenHtml } from "./words-screen";

function page(slug: string, title: string, terms: string[]): SearchEntry {
  return { kind: "page", slug, title, terms, href: `/${slug}` };
}

function product(shopSlug: string, slug: string, title: string, terms: string[]): SearchEntry {
  return {
    kind: "product",
    slug,
    shopSlug,
    title,
    subtitle: "GalyaShop",
    terms,
    href: `/${shopSlug}/p/${slug}`,
  };
}

const INDEX = {
  builtAt: "2026-11-23T00:00:00.000Z",
  entries: [
    page("galyashop", "GalyaShop", ["галяшоп", "галя шоп"]),
    product("galyashop", "astrahal", "Астрагал", ["астрагал", "трава"]),
    page("viruvannia", "Дослідження: вірування", ["вірування"]),
    page("viruvannia/sto-vidsotkiv", "Сто відсотків", ["сто відсотків"]),
    page("viruvannia/sto-vidsotkiv/dzherela", "Джерела", ["джерела"]),
  ],
};

describe("termsTree", () => {
  it("товари магазину — діти сторінки магазину", () => {
    const roots = termsTree(INDEX.entries);
    const shop = roots.find((node) => node.key === "galyashop");

    expect(roots.map((node) => node.key)).toEqual(["galyashop", "viruvannia"]);
    expect(shop?.children.map((node) => node.title)).toEqual(["Астрагал"]);
  });

  it("підсторінки вкладаються за адресою, глибина не обмежена", () => {
    const roots = termsTree(INDEX.entries);
    const parent = roots.find((node) => node.key === "viruvannia");
    const child = parent?.children[0];

    expect(parent?.children.map((node) => node.key)).toEqual(["viruvannia/sto-vidsotkiv"]);
    expect(child?.children.map((node) => node.key)).toEqual(["viruvannia/sto-vidsotkiv/dzherela"]);
  });

  it("підсторінка без предка в індексі стає коренем, а не зникає", () => {
    const roots = termsTree([page("samotnia/history", "Історія", ["історія"])]);
    expect(roots.map((node) => node.key)).toEqual(["samotnia/history"]);
  });

  it("товар без сторінки магазину збирається в акордеон із підписом магазину", () => {
    const roots = termsTree([product("znyklyi", "rich", "Річ", ["річ"])]);
    expect(roots[0].title).toBe("GalyaShop");
    expect(roots[0].children[0].title).toBe("Річ");
  });
});

describe("wordsScreenHtml", () => {
  it("усі акордеони закриті, у кожному — свої слова", () => {
    const html = wordsScreenHtml(INDEX);

    expect(html).toContain("<details><summary>GalyaShop</summary>");
    expect(html).toContain("<p>галяшоп · галя шоп</p>");
    expect(html).toContain("<details><summary>Астрагал</summary>");
    expect(html).toContain("<p>астрагал · трава</p>");
    expect(html).not.toContain("<details open");
  });

  it("дерево рендериться вкладеними акордеонами", () => {
    const html = wordsScreenHtml(INDEX);
    const shop = html.indexOf("<summary>GalyaShop</summary>");
    const productAt = html.indexOf("<summary>Астрагал</summary>");

    expect(shop).toBeLessThan(productAt);
    expect(html.match(/<details>/g)).toHaveLength(5);
  });

  it("порожній індекс каже, що слів ще немає", () => {
    const html = wordsScreenHtml({ builtAt: "now", entries: [] });
    expect(html).toContain("Слова ще не зібрані");
    expect(html).not.toContain("<details");
  });

  it("екранує лапки й амперсанди в назві та словах", () => {
    const html = wordsScreenHtml({
      builtAt: "now",
      entries: [page("a", 'Сторінка "А" & B', ['слово "х" & y'])],
    });
    expect(html).toContain("&quot;А&quot; &amp; B");
    expect(html).toContain("слово &quot;х&quot; &amp; y");
  });
});
