/**
 * Кошик: правила кількості й те, що зниклий товар не лишається в кошику.
 *
 * Перевіряється рішення сервісу на живому наборі SQL-запитів (заглушка D1
 * тримає позиції в памʼяті), а не форма відповіді контролера.
 *
 * @module api-dev/src/services/shop/cart.service.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types";

const state = vi.hoisted(() => ({
  shop: true,
  active: true,
  rows: new Map<number, number>(),
}));

vi.mock("./shops", () => ({
  ensureShopSchema: async () => undefined,
  publicShopBySlug: async () =>
    state.shop
      ? { id: 382, slug: "galyashop", ownerId: 1, adminIds: [], title: "GalyaShop" }
      : null,
}));

const { ShopCartService } = await import("./cart.service");

function makeDb(): D1Database {
  const db = {
    prepare(sql: string) {
      const record = { args: [] as unknown[] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.args = args;
          return statement;
        },
        first: async () => {
          if (/FROM platform_pages s/.test(sql)) return { id: 382 };
          if (/FROM shop_products/.test(sql)) return state.active ? { id: record.args[0] } : null;
          return null;
        },
        all: async () => ({
          results: [...state.rows].map(([product_id, qty]) => ({ product_id, qty })),
        }),
        run: async () => {
          const productId = Number(record.args[2]);
          if (/INSERT INTO shop_carts/.test(sql)) {
            const value = Number(record.args[3]);
            const next = /shop_carts\.qty \+ excluded\.qty/.test(sql)
              ? Math.min(99, Math.max(0, (state.rows.get(productId) ?? 0) + value))
              : value;
            state.rows.set(productId, next);
          } else if (/DELETE FROM shop_carts WHERE user_id = \? AND shop_id = \?$/.test(sql)) {
            state.rows.clear();
          } else if (/DELETE FROM shop_carts/.test(sql) && !/NOT IN/.test(sql)) {
            if (!/qty < 1/.test(sql) || (state.rows.get(productId) ?? 0) < 1) {
              state.rows.delete(productId);
            }
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
  return db as unknown as D1Database;
}

function service(): InstanceType<typeof ShopCartService> {
  return new ShopCartService({ DB: makeDb() } as unknown as Env);
}

beforeEach(() => {
  state.shop = true;
  state.active = true;
  state.rows = new Map();
});

describe("ShopCartService", () => {
  it("порожній кошик — порожній список, а не помилка", async () => {
    expect(await service().read("galyashop", 777)).toEqual({ kind: "ok", lines: [] });
  });

  it("додати двічі — дві одиниці, а не заміна", async () => {
    const cart = service();
    await cart.change("galyashop", 777, { productId: 9, delta: 1 });
    const outcome = await cart.change("galyashop", 777, { productId: 9, delta: 1 });

    expect(outcome).toEqual({ kind: "ok", lines: [{ productId: 9, qty: 2 }] });
  });

  it("поставити кількість і прибрати нулем", async () => {
    const cart = service();
    await cart.change("galyashop", 777, { productId: 9, qty: 3 });
    expect(await cart.change("galyashop", 777, { productId: 9, qty: 0 })).toEqual({
      kind: "ok",
      lines: [],
    });
  });

  it("зниклий товар не додається, але прибрати його можна", async () => {
    state.rows.set(9, 2);
    state.active = false;

    expect(await service().change("galyashop", 777, { productId: 9, delta: 1 })).toEqual({
      kind: "rejected",
      message: "Товару більше немає в магазині",
    });
    expect(await service().change("galyashop", 777, { productId: 9, qty: 0 })).toEqual({
      kind: "ok",
      lines: [],
    });
  });

  it("закритий магазин — не наш випадок", async () => {
    state.shop = false;
    expect(await service().read("znyklyi", 777)).toEqual({ kind: "not_found" });
  });

  it("очищення прибирає всі позиції магазину", async () => {
    state.rows.set(1, 2);
    state.rows.set(2, 1);

    expect(await service().clear("galyashop", 777)).toEqual({ kind: "ok", lines: [] });
  });
});
