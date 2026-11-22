import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types";

vi.mock("@wwwuabot/shared/database/ensure-tables", () => ({
  ensureTables: async () => {},
}));

const { buildSearchIndex, rebuildSearchIndex } = await import("./index");

interface Query {
  sql: string;
  args: unknown[];
}

function makeEnv(pages: unknown[], products: unknown[], media: unknown[] = []) {
  const queries: Query[] = [];
  const db = {
    prepare(sql: string) {
      const query: Query = { sql, args: [] };
      queries.push(query);
      const statement = {
        bind: (...args: unknown[]) => {
          query.args = args;
          return statement;
        },
        all: async () => {
          if (sql.includes("FROM platform_pages p")) return { results: pages };
          if (sql.includes("JOIN platform_pages s")) return { results: products };
          if (sql.includes("FROM shop_media")) return { results: media };
          return { results: [] };
        },
      };
      return statement;
    },
  };
  const put = vi.fn(async () => {});
  return {
    env: { DB: db, CONTENT_KV: { put } } as unknown as Env,
    queries,
    put,
  };
}

const page = (over: Record<string, unknown> = {}) => ({
  slug: "galyashop",
  title: "GalyaShop",
  photo_url: "https://api.test/api/shop/media/shop/382/cover.jpg",
  template_key: "shop",
  search_terms: '["галяшоп","galyashop"]',
  ...over,
});

const product = (over: Record<string, unknown> = {}) => ({
  id: 9,
  slug: "astrahal",
  title: "Астрагал",
  summary: "Трава",
  price: "120 ₴",
  images: "[7]",
  search_terms: '["астрагал","astragal"]',
  shop_slug: "galyashop",
  shop_title: "GalyaShop",
  ...over,
});

describe("buildSearchIndex", () => {
  it("сторінка: фото зі шлюзу, підпис шаблону й слова з колонки", async () => {
    const { env, queries } = makeEnv([page()], []);
    const index = await buildSearchIndex(env, "https://api.test/");

    expect(index.entries[0]).toMatchObject({
      kind: "page",
      title: "GalyaShop",
      subtitle: "Магазин",
      href: "/galyashop",
      terms: ["галяшоп", "galyashop"],
      photo: "https://api.test/api/shop/media/shop/382/cover.jpg",
    });
    // Авторська сторінка — `is_public = 1`, сторінка платформи — `NULL`.
    expect(queries[0].sql).toContain("COALESCE(p.is_public, 0) = 1");
    expect(queries[0].sql).toContain("p.owner_id IS NULL");
  });

  it("сторінка без свого фото отримує заглушку з R2, а не чужий URL", async () => {
    const { env } = makeEnv(
      [
        page({ photo_url: "https://cdn.example/cover.jpg" }),
        page({ slug: "home", photo_url: null }),
      ],
      [],
    );
    const index = await buildSearchIndex(env, "https://api.test");
    for (const entry of index.entries) {
      expect(entry.photo).toBe("https://api.test/api/shop/media/shop/defaults/page.webp");
    }
  });

  it("биті або порожні слова сторінки рятує назва й адреса", async () => {
    const { env } = makeEnv([page({ search_terms: "[не json" })], []);
    const index = await buildSearchIndex(env, "https://api.test");
    expect(index.entries[0].terms).toContain("GalyaShop");
    expect(index.entries[0].terms).toHaveLength(1);
  });

  it("товар: магазин, ціна, фото з shop_media і шлях товару", async () => {
    const { env } = makeEnv([], [product()], [{ id: 7, r2_key: "shop/382/x.jpg" }]);
    const index = await buildSearchIndex(env, "https://api.test");
    expect(index.entries[0]).toMatchObject({
      kind: "product",
      subtitle: "GalyaShop",
      price: "120 ₴",
      href: "/galyashop/p/astrahal",
      photo: "https://api.test/api/shop/media/shop/382/x.jpg",
    });
  });

  it("товар без фото отримує товарну заглушку; порожні слова — з назви", async () => {
    const { env } = makeEnv([], [product({ images: "[]", search_terms: "[]" })]);
    const index = await buildSearchIndex(env, "https://api.test");
    expect(index.entries[0].photo).toBe(
      "https://api.test/api/shop/media/shop/defaults/product.webp",
    );
    expect(index.entries[0].terms).toContain("Астрагал");
  });

  it("товар без ключа файлу падає на заглушку, а не на бите посилання", async () => {
    const { env } = makeEnv([], [product()], []);
    const index = await buildSearchIndex(env, "https://api.test");
    expect(index.entries[0].photo).toContain("product.webp");
  });
});

describe("rebuildSearchIndex", () => {
  it("пише один ключ і рахує сторінки й товари", async () => {
    const { env, put } = makeEnv([page()], [product()], [{ id: 7, r2_key: "shop/382/x.jpg" }]);
    const result = await rebuildSearchIndex(env, "https://api.test");

    expect(result).toMatchObject({ pages: 1, products: 1 });
    expect(put).toHaveBeenCalledTimes(1);
    const [key, json] = put.mock.calls[0] as unknown as [string, string];
    expect(key).toBe("search:v1");
    expect(JSON.parse(json).entries).toHaveLength(2);
  });
});
