// @vitest-environment jsdom
/**
 * Пам'ять фільтра «Проєкт»: вибір лежить у сховищі й не переживає зникнення
 * проєкту зі списку людей.
 *
 * @module web-admin-dev/src/features/users/tenant-filter-storage.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const MAIN = { user_id: 1, tenant_id: 1, tenant_key: null } as never;
const SHOP = { user_id: 2, tenant_id: 2, tenant_key: "shop-a" } as never;

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("пам'ять фільтра проєкту", () => {
  it("без збереженого вибору видно всі проєкти", async () => {
    const { readTenantFilter } = await import("./tenant-filter-storage");

    expect(readTenantFilter()).toBeNull();
  });

  it("вибір лежить у сховищі й читається після перезапуску панелі", async () => {
    const first = await import("./tenant-filter-storage");
    first.writeTenantFilter("shop-a");
    expect(localStorage.getItem("wb.admin.users.tenant")).toBe("shop-a");

    // Новий інстанс модуля — те саме, що перезавантаження сторінки.
    vi.resetModules();
    const second = await import("./tenant-filter-storage");
    expect(second.readTenantFilter()).toBe("shop-a");

    second.writeTenantFilter(null);
    expect(localStorage.getItem("wb.admin.users.tenant")).toBeNull();
    expect(second.readTenantFilter()).toBeNull();
  });

  it("знімає проєкт, якого вже немає серед людей, і лишає наявний", async () => {
    const { keepKnownFilter } = await import("./tenant-filter-storage");

    expect(keepKnownFilter("shop-a", [MAIN, SHOP])).toBe("shop-a");
    expect(keepKnownFilter("shop-a", [MAIN])).toBeNull();
    expect(keepKnownFilter("shop-a", [])).toBeNull();
    expect(keepKnownFilter(null, [SHOP])).toBeNull();
  });

  it("store стартує зі збереженим вибором", async () => {
    localStorage.setItem("wb.admin.users.tenant", "shop-a");
    const { useUsersStore } = await import("./store");

    expect(useUsersStore.getState().tenantFilter).toBe("shop-a");
  });
});
