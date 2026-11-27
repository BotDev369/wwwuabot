/**
 * Проєкти для селекта: шлях адмін-API і фільтр активних.
 *
 * @module web-admin-dev/src/shared/api/tenants.api.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = { request: vi.fn() };
vi.mock("./client", () => ({ apiFetch: mocks.request }));
const { listActiveTenants, listAdminTenants } = await import("./tenants.api");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("проєкти", () => {
  it("список іде в адмін-API як є", async () => {
    const tenants = [{ id: 1, key: "main", name: "main", status: "active" }];
    mocks.request.mockResolvedValueOnce({ tenants });

    expect(await listAdminTenants()).toEqual(tenants);
    expect(mocks.request).toHaveBeenCalledWith("/api/admin/tenants");
  });

  it("селект бачить лише активні", async () => {
    mocks.request.mockResolvedValueOnce({
      tenants: [
        { id: 1, key: "main", name: "main", status: "active" },
        { id: 2, key: "old", name: "Старий", status: "archived" },
        { id: 3, key: "shop-a", name: "Магазин", status: "active" },
      ],
    });

    expect((await listActiveTenants()).map((tenant) => tenant.key)).toEqual(["main", "shop-a"]);
  });

  it("порожня відповідь не ламає селект", async () => {
    mocks.request.mockResolvedValueOnce({});

    expect(await listAdminTenants()).toEqual([]);
  });
});
