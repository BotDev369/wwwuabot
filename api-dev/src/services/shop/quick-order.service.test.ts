/**
 * Швидке замовлення: межі й знімок покупця.
 *
 * Перевіряються рішення сервісу, а не SQLite: добовий ліміт, одне активне
 * замовлення й те, що в рядок їде **профіль із Telegram**, а не порожня анкета.
 *
 * @module api-dev/src/services/shop/quick-order.service.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ShopOrder } from "@wwwuabot/shared/shop";
import type { Env } from "../../shared/types";

const state = vi.hoisted(() => ({
  daily: 0,
  active: [] as string[],
  inserted: [] as { sql: string; binds: unknown[] }[],
  notified: 0,
}));

const ORDER: ShopOrder = {
  id: 55,
  shopId: 381,
  buyerId: 777,
  status: "new",
  contact: {},
  buyerProfile: {
    name: "Олена Тест",
    username: "olena",
    language: "uk",
    photo: "/api/shop/media/shop/avatars/777-aa.jpg",
    quick: true,
  },
  note: "",
  sellerNote: "",
  items: [{ productId: 9, title: "Ромашка", price: "120 ₴", kind: "physical", qty: 1 }],
  createdAt: "2026-11-22 10:00:00",
  updatedAt: "2026-11-22 10:00:00",
};

vi.mock("./shops", () => ({
  ensureShopSchema: async () => undefined,
  publicShopBySlug: async () => ({
    id: 381,
    slug: "galyashop",
    ownerId: 1,
    adminIds: [],
    title: "GalyaShop",
  }),
}));
vi.mock("./product-rows", () => ({
  activeProductsByIds: async () => [{ id: 9, title: "Ромашка", price: "120 ₴", kind: "physical" }],
}));
vi.mock("./orders-notice", () => ({
  notifyOrder: async () => {
    state.notified += 1;
  },
}));
vi.mock("./buyer-avatar", () => ({
  buyerAvatar: async () => "/api/shop/media/shop/avatars/777-aa.jpg",
}));
vi.mock("./buyer-profiles", () => ({
  orderSnapshots: () => ORDER.items,
}));
vi.mock("./orders-rows", () => ({
  itemStatements: () => [],
  readOrder: async () => ORDER,
  readOrderStatuses: async () => [
    { key: "new", label: "Нове", stage: "open", isCustom: false, isActive: true },
    { key: "done", label: "Виконано", stage: "closed", isCustom: false, isActive: true },
  ],
}));

const { QuickOrderService } = await import("./quick-order.service");

function makeDb(): D1Database {
  const db = {
    prepare(sql: string) {
      const record = { sql, binds: [] as unknown[] };
      if (/INSERT INTO shop_orders/.test(sql)) state.inserted.push(record);

      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => {
          if (/COUNT\(\*\)/.test(sql)) return { total: state.daily };
          if (/FROM users/.test(sql)) {
            return {
              first_name: "Олена",
              last_name: "Тест",
              username: "@olena",
              language: "uk",
            };
          }
          return null;
        },
        all: async () => ({
          results: state.active.map((status) => ({ status })),
        }),
        run: async () => ({ meta: { last_row_id: 55, changes: 1 } }),
      };
      return statement;
    },
    batch: async () => [],
  };
  return db as unknown as D1Database;
}

function service(): InstanceType<typeof QuickOrderService> {
  return new QuickOrderService({ DB: makeDb() } as unknown as Env);
}

beforeEach(() => {
  state.daily = 0;
  state.active = [];
  state.inserted = [];
  state.notified = 0;
});

describe("QuickOrderService", () => {
  it("п'ять замовлень за добу — відмова без запису", async () => {
    state.daily = 5;

    const outcome = await service().place("galyashop", 777, {
      items: [{ productId: 9, qty: 1 }],
    });

    expect(outcome).toEqual({
      kind: "rejected",
      message: "Не більше 5 замовлень на добу — спробуйте пізніше",
    });
    expect(state.inserted).toHaveLength(0);
  });

  it("активне замовлення в магазині — теж відмова", async () => {
    state.active = ["new"];

    const outcome = await service().place("galyashop", 777, {
      items: [{ productId: 9, qty: 1 }],
    });

    expect(outcome.kind).toBe("rejected");
    expect(state.inserted).toHaveLength(0);
  });

  it("створює замовлення зі знімком Telegram і порожнім контактом", async () => {
    const outcome = await service().place("galyashop", 777, {
      items: [{ productId: 9, qty: 1 }],
    });

    expect(outcome).toEqual({ kind: "placed", order: ORDER });
    expect(state.inserted).toHaveLength(1);
    expect(state.inserted[0].sql).toContain("buyer_profile");

    const profile = JSON.parse(String(state.inserted[0].binds[3])) as {
      name: string;
      username: string;
      quick: boolean;
    };
    expect(profile).toEqual({
      name: "Олена Тест",
      username: "olena",
      language: "uk",
      photo: "/api/shop/media/shop/avatars/777-aa.jpg",
      quick: true,
    });
    expect(state.notified).toBe(1);
  });
});
