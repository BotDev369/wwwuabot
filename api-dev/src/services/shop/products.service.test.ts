import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductInput } from "@wwwuabot/shared/shop";
import type { Env } from "../../shared/types";
import type { ProductRow } from "./product-rows";

const state = vi.hoisted(() => ({
  managed: 382 as number | null,
  shop: { id: 382, slug: "galyashop", title: "GalyaShop" } as unknown,
  rows: [] as unknown[],
  inserted: null as unknown,
  slugOwners: [] as (number | null)[],
  changes: 1,
  insertedArgs: [] as unknown[],
}));

vi.mock("./shops", () => ({
  ensureShopSchema: async () => {},
  managedShopId: async () => state.managed,
  publicShopBySlug: async () => state.shop,
}));
vi.mock("./media.service", () => ({
  readShopMedia: async () => [{ id: 1 }],
}));

const { CATALOG_PAGE_SIZE, ShopProductsService, clampCatalogLimit } =
  await import("./products.service");

const row = (over: Partial<ProductRow> = {}): ProductRow => ({
  id: 9,
  shop_id: 382,
  slug: "astrahal",
  kind: "physical",
  title: "Астрагал",
  category: "",
  summary: "",
  description: "",
  price: "120 ₴",
  images: "[]",
  attributes: "[]",
  search_terms: '["астрагал"]',
  is_active: 1,
  created_at: "2026-11-22 00:00:00",
  updated_at: "2026-11-22 00:00:00",
  ...over,
});

function rowFromInsert(args: unknown[]): ProductRow {
  return row({
    id: 10,
    slug: String(args[1]),
    kind: String(args[2]),
    title: String(args[3]),
    images: String(args[8]),
    attributes: String(args[9]),
    search_terms: String(args[10]),
    is_active: Number(args[11]),
  });
}

function makeEnv() {
  const db = {
    prepare(sql: string) {
      const statement = {
        args: [] as unknown[],
        bind(...args: unknown[]) {
          statement.args = args;
          return statement;
        },
        async first() {
          if (sql.includes("WHERE id = ? AND shop_id = ?")) {
            const id = Number(statement.args[0]);
            if (state.inserted) {
              const inserted = state.inserted as ProductRow;
              return inserted.id === id ? inserted : null;
            }
            return (state.rows as ProductRow[]).find((entry) => entry.id === id) ?? null;
          }
          if (sql.includes("SELECT id FROM shop_products")) {
            const owner = state.slugOwners.length > 0 ? state.slugOwners.shift() : null;
            return owner === null || owner === undefined ? null : { id: owner };
          }
          return null;
        },
        async all() {
          return { results: state.rows };
        },
        async run() {
          if (sql.includes("INSERT INTO shop_products")) {
            state.insertedArgs = statement.args;
            state.inserted = rowFromInsert(statement.args);
            return { meta: { last_row_id: 10, changes: 1 } };
          }
          return { meta: { changes: state.changes } };
        },
      };
      return statement;
    },
  };
  return { env: { DB: db } as unknown as Env };
}

const input = (over: Partial<ProductInput> = {}): ProductInput => ({
  slug: "astrahal",
  kind: "physical",
  title: "Астрагал",
  category: "",
  summary: "",
  description: "",
  price: "120 ₴",
  images: [],
  attributes: [],
  isActive: true,
  ...over,
});

beforeEach(() => {
  state.managed = 382;
  state.shop = { id: 382, slug: "galyashop", title: "GalyaShop" };
  state.rows = [];
  state.inserted = null;
  state.slugOwners = [];
  state.changes = 1;
  state.insertedArgs = [];
});

describe("clampCatalogLimit", () => {
  it("сміття й перебір дають межі, а не помилку", () => {
    expect(clampCatalogLimit(undefined)).toBe(CATALOG_PAGE_SIZE);
    expect(clampCatalogLimit("abc")).toBe(CATALOG_PAGE_SIZE);
    expect(clampCatalogLimit(0)).toBe(CATALOG_PAGE_SIZE);
    expect(clampCatalogLimit(10)).toBe(10);
    expect(clampCatalogLimit(100500)).toBe(500);
  });
});

describe("читання", () => {
  it("свій список: без права — null, з правом — товари й файли", async () => {
    const { env } = makeEnv();
    const service = new ShopProductsService(env);
    state.managed = null;
    expect(await service.listOwn(382, 1)).toBeNull();

    state.managed = 382;
    state.rows = [row()];
    const data = await service.listOwn(382, 1);
    expect(data?.products[0].title).toBe("Астрагал");
    expect(data?.media).toEqual([{ id: 1 }]);
  });

  it("каталог закритого магазину — null, відкритого — активні товари", async () => {
    const { env } = makeEnv();
    const service = new ShopProductsService(env);
    state.shop = null;
    expect(await service.catalog("galyashop")).toBeNull();

    state.shop = { id: 382, slug: "galyashop", title: "GalyaShop" };
    state.rows = [row()];
    const data = await service.catalog("galyashop", 5);
    expect(data?.products).toHaveLength(1);
  });
});

describe("збереження", () => {
  it("чужий магазин не приймає товар", async () => {
    const { env } = makeEnv();
    state.managed = null;
    expect(await new ShopProductsService(env).save(382, 1, input())).toEqual({
      kind: "not_found",
    });
  });

  it("новий товар без слів отримує їх із назви", async () => {
    const { env } = makeEnv();
    const outcome = await new ShopProductsService(env).save(382, 1, input());
    expect(outcome.kind).toBe("saved");
    expect(state.insertedArgs[10]).toContain("Астрагал");
  });

  it("надіслані слова мають перевагу над автоматичними", async () => {
    const { env } = makeEnv();
    await new ShopProductsService(env).save(
      382,
      1,
      input({ title: "Астрагал", searchTerms: ["трава", "astragal"] }),
    );
    expect(state.insertedArgs[10]).toBe('["трава","astragal"]');
  });

  it("активний товар без назви, адреси й слів не зберігається", async () => {
    const { env } = makeEnv();
    const outcome = await new ShopProductsService(env).save(
      382,
      1,
      input({ title: "", slug: "", searchTerms: [] }),
    );
    expect(outcome).toEqual({ kind: "no_terms" });
  });

  it("правка без слів зберігає наявні", async () => {
    const { env } = makeEnv();
    state.rows = [row({ search_terms: '["ромашка","chamomile"]' })];
    const outcome = await new ShopProductsService(env).save(382, 1, input(), 9);
    expect(outcome.kind).toBe("saved");
    expect(state.inserted).toBeNull();
  });

  it("правка зі словами переписує список", async () => {
    const { env } = makeEnv();
    state.rows = [row()];
    const outcome = await new ShopProductsService(env).save(
      382,
      1,
      input({ searchTerms: ["трава"] }),
      9,
    );
    expect(outcome.kind).toBe("saved");
  });

  it("зайнята адреса при правці — відмова", async () => {
    const { env } = makeEnv();
    state.rows = [row()];
    state.slugOwners = [77];
    const outcome = await new ShopProductsService(env).save(382, 1, input({ slug: "inshyi" }), 9);
    expect(outcome).toEqual({ kind: "address_taken" });
  });

  it("правка неіснуючого товару — not_found", async () => {
    const { env } = makeEnv();
    const outcome = await new ShopProductsService(env).save(382, 1, input(), 404);
    expect(outcome).toEqual({ kind: "not_found" });
  });

  it("нова адреса отримує хвіст, доки зайнята", async () => {
    const { env } = makeEnv();
    state.slugOwners = [55];
    await new ShopProductsService(env).save(382, 1, input());
    expect(state.insertedArgs[1]).toBe("astrahal-2");
  });
});

describe("видалення", () => {
  it("без права — false; без змін — false; зі зміною — true", async () => {
    const { env } = makeEnv();
    const service = new ShopProductsService(env);
    state.managed = null;
    expect(await service.remove(382, 1, 9)).toBe(false);

    state.managed = 382;
    state.changes = 0;
    expect(await service.remove(382, 1, 9)).toBe(false);

    state.changes = 1;
    expect(await service.remove(382, 1, 9)).toBe(true);
  });
});
