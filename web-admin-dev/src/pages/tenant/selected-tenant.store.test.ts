// @vitest-environment jsdom
/**
 * Вибір проєкту: типовий головний і те, що вибір переживає перезавантаження.
 *
 * @module web-admin-dev/src/pages/tenant/selected-tenant.store.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("вибір проєкту", () => {
  it("без збереженого вибору показує головний", async () => {
    const { useSelectedTenant, MAIN_TENANT } = await import("./selected-tenant.store");

    expect(useSelectedTenant.getState().key).toBe(MAIN_TENANT);
  });

  it("вибір лежить у сховищі й читається після перезапуску панелі", async () => {
    const first = await import("./selected-tenant.store");
    first.useSelectedTenant.getState().select("shop-a");

    expect(first.useSelectedTenant.getState().key).toBe("shop-a");
    expect(localStorage.getItem("wb.admin.tenant")).toBe("shop-a");

    // Новий інстанс модуля — те саме, що перезавантаження сторінки.
    vi.resetModules();
    const second = await import("./selected-tenant.store");
    expect(second.useSelectedTenant.getState().key).toBe("shop-a");
  });
});
