import { describe, expect, it } from "vitest";
import type { ProductRow } from "./product-rows";
import { PRODUCT_COLUMNS, activeProductsByIds, ownProductsByIds, toProduct } from "./product-rows";

const row = (over: Partial<ProductRow> = {}): ProductRow => ({
  id: 9,
  shop_id: 382,
  slug: "astrahal",
  kind: "goods",
  title: "Астрагал",
  category: null,
  summary: null,
  description: null,
  price: "120 ₴",
  images: "[7,8]",
  attributes: '[{"name":"Вага","value":"50 г"}]',
  search_terms: '["астрагал","astragal"]',
  is_active: 1,
  created_at: "2026-11-22 00:00:00",
  updated_at: "2026-11-22 00:00:00",
  ...over,
});

describe("PRODUCT_COLUMNS", () => {
  it("читає search_terms разом із рештою колонок", () => {
    expect(PRODUCT_COLUMNS.split(",").map((part) => part.trim())).toContain("search_terms");
  });
});

describe("toProduct", () => {
  it("перекладає рядок у товар разом зі словами", () => {
    const product = toProduct(row());
    expect(product).toMatchObject({
      id: 9,
      shopId: 382,
      title: "Астрагал",
      price: "120 ₴",
      images: [7, 8],
      searchTerms: ["астрагал", "astragal"],
      isActive: true,
    });
    expect(product.attributes).toEqual([{ name: "Вага", value: "50 г" }]);
  });

  it("старі рядки з NULL читаються як порожні, а не падають", () => {
    const product = toProduct(
      row({
        title: null,
        category: null,
        images: null,
        attributes: null,
        search_terms: null,
        is_active: null,
      }),
    );
    expect(product.title).toBe("");
    expect(product.images).toEqual([]);
    expect(product.searchTerms).toEqual([]);
    expect(product.isActive).toBe(true);
  });

  it("битий JSON слів — це порожній список, а не виняток", () => {
    expect(toProduct(row({ search_terms: "[не json" })).searchTerms).toEqual([]);
    expect(toProduct(row({ search_terms: '{"a":1}' })).searchTerms).toEqual([]);
  });

  it("слова з порожніми й не-рядковими елементами відкидаються", () => {
    expect(toProduct(row({ search_terms: '["астрагал","  ",5,""]' })).searchTerms).toEqual([
      "астрагал",
    ]);
  });

  it("чернетка лишається чернеткою", () => {
    expect(toProduct(row({ is_active: 0 })).isActive).toBe(false);
  });
});

describe("добір за номерами", () => {
  function db(rows: ProductRow[]) {
    const seen: { sql: string; args: unknown[] }[] = [];
    const database = {
      prepare(sql: string) {
        const query = { sql, args: [] as unknown[] };
        seen.push(query);
        const statement = {
          bind: (...args: unknown[]) => {
            query.args = args;
            return statement;
          },
          all: async () => ({ results: rows }),
        };
        return statement;
      },
    };
    return { database: database as unknown as D1Database, seen };
  }

  it("порожній список номерів не робить запиту", async () => {
    const { database, seen } = db([]);
    expect(await activeProductsByIds(database, 382, [])).toEqual([]);
    expect(seen).toHaveLength(0);
  });

  it("покупець бачить лише активні, продавець — і чернетки", async () => {
    const active = db([row()]);
    await activeProductsByIds(active.database, 382, [9]);
    expect(active.seen[0].sql).toContain("is_active = 1");
    expect(active.seen[0].args).toEqual([382, 9]);

    const own = db([row({ is_active: 0 })]);
    const products = await ownProductsByIds(own.database, 382, [9]);
    expect(own.seen[0].sql).not.toContain("is_active = 1");
    expect(products[0].isActive).toBe(false);
  });
});
