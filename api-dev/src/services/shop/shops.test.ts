/**
 * Межа доступу магазину: **хто його веде**.
 *
 * Тут фіксується те, що видно лише в коді: доступ дає не рівність `owner_id`, а
 * роль. Магазин ведуть продавець і адміни (`scenarios.admin_ids`), і саме цим
 * правом користуються товари, файли, статуси й замовлення — тож помилка тут
 * відкрила б чужу чергу замовлень і чужу переписку з покупцями.
 *
 * @module api-dev/src/services/shop/shops.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../../shared/types";
import { managedShopId, shopStaffIds, type ShopScope } from "./shops";

const OWNER = 372567448;
const GALYA = 1049272067;
const STRANGER = 999;

/** Заглушка D1: віддає один рядок `scenarios` — його досить для перевірки ролі. */
function makeDb(row: Record<string, unknown> | null): Env {
  const db = {
    prepare: () => ({
      bind: () => ({
        first: async () => row,
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } }),
      }),
    }),
  };
  return { DB: db } as unknown as Env;
}

const SHOP = { id: 382, owner_id: String(OWNER), admin_ids: `["${GALYA}"]` };

describe("managedShopId", () => {
  it("власник веде магазин", async () => {
    expect(await managedShopId(makeDb(SHOP).DB, 382, OWNER)).toBe(382);
  });

  it("адмін веде магазин — товари й замовлення не лишаються в однієї людини", async () => {
    expect(await managedShopId(makeDb(SHOP).DB, 382, GALYA)).toBe(382);
  });

  it("сторонній не дістає нічого — «немає» й «чуже» тут нерозрізненні", async () => {
    expect(await managedShopId(makeDb(SHOP).DB, 382, STRANGER)).toBeNull();
  });

  it("немає рядка — немає доступу", async () => {
    expect(await managedShopId(makeDb(null).DB, 382, OWNER)).toBeNull();
  });

  it("зіпсована колонка адмінів не відбирає доступ у власника", async () => {
    const broken = { ...SHOP, admin_ids: "[не json" };
    expect(await managedShopId(makeDb(broken).DB, 382, OWNER)).toBe(382);
    expect(await managedShopId(makeDb(broken).DB, 382, GALYA)).toBeNull();
  });

  it("рядок платформи (без власника) доступом не ділиться", async () => {
    const platform = { id: 7, owner_id: null, admin_ids: null };
    expect(await managedShopId(makeDb(platform).DB, 7, OWNER)).toBeNull();
  });
});

describe("shopStaffIds", () => {
  const shop: ShopScope = {
    id: 382,
    slug: "galyashop",
    title: "GalyaShop",
    ownerId: OWNER,
    adminIds: [GALYA],
  };

  it("замовлення йде власнику ТА адмінам: адмін обіцяв відправити те саме", () => {
    expect(shopStaffIds(shop)).toEqual([OWNER, GALYA]);
  });

  it("власник у списку адмінів не дає другої адреси", () => {
    expect(shopStaffIds({ ...shop, adminIds: [OWNER, GALYA] })).toEqual([OWNER, GALYA]);
  });
});
