/**
 * Правила ключа проєкту — тести межі з payload'ами бота: чужий `start_param`
 * не має ставати ключем, інакше старе посилання вело б у «проєкт, якого немає».
 *
 * @module @wwwuabot/shared/tenants/index.test
 */

import { describe, expect, it } from "vitest";
import {
  DEFAULT_TENANT_KEY,
  isTenantRole,
  isValidTenantKey,
  tenantKeyFromStartParam,
  tenantStartParam,
} from "./index";

describe("ключ проєкту", () => {
  it("приймає латиницю, цифри й дефіс", () => {
    for (const key of ["main", "shop-a", "a1", "x".repeat(32)]) {
      expect(isValidTenantKey(key), key).toBe(true);
    }
  });

  it("не приймає регістр, підкреслення, провідний дефіс і короткі ключі", () => {
    for (const key of ["Main", "shop_a", "-shop", "a", "", "x".repeat(33), "магазин"]) {
      expect(isValidTenantKey(key), key).toBe(false);
    }
  });

  it("головний проєкт — валідний ключ", () => {
    expect(isValidTenantKey(DEFAULT_TENANT_KEY)).toBe(true);
  });
});

describe("deep link", () => {
  it("будує й розбирає ключ із префіксом", () => {
    expect(tenantStartParam("shop-a")).toBe("p_shop-a");
    expect(tenantKeyFromStartParam("p_shop-a")).toBe("shop-a");
  });

  it("нормалізує пробіли й регістр", () => {
    expect(tenantKeyFromStartParam(" p_Main ")).toBe("main");
    expect(tenantKeyFromStartParam("p_Inv")).toBe("inv");
  });

  it("⛔ не вважає ключем payload'и бота", () => {
    for (const value of ["inv-8f3k2q", "mydate_19800303_today", "p_", "main"]) {
      expect(tenantKeyFromStartParam(value), value).toBeNull();
    }
  });

  it("порожнє значення — не ключ", () => {
    expect(tenantKeyFromStartParam("")).toBeNull();
    expect(tenantKeyFromStartParam(undefined)).toBeNull();
    expect(tenantKeyFromStartParam(null)).toBeNull();
  });
});

describe("ролі", () => {
  it("знає рівно дві ролі", () => {
    expect(isTenantRole("owner")).toBe(true);
    expect(isTenantRole("member")).toBe(true);
    expect(isTenantRole("admin")).toBe(false);
    expect(isTenantRole("")).toBe(false);
  });
});
