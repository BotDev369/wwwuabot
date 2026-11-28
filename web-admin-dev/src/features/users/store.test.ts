/**
 * Стан «Користувачів»: завантаження, вибір, дії й новий фільтр проєкту.
 *
 * Сторінка й таблиця мокають store, тож без цього файлу його логіка лишалась
 * би непокритою — разом із фільтром, який вони лише читають.
 *
 * @module web-admin-dev/src/features/users/store.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  list: vi.fn(),
  bulk: vi.fn(),
  remove: vi.fn(),
  block: vi.fn(),
}));
vi.mock("../../shared/api/users.api", () => ({
  listUsers: api.list,
  bulkAction: api.bulk,
  deleteUser: api.remove,
  blockUser: api.block,
}));

const { useUsersStore } = await import("./store");

const PERSON = {
  user_id: 7,
  first_name: "Сергій",
  tenant_id: 1,
  tenant_key: null,
  is_blocked: 0,
} as never;
const OTHER = { user_id: 8, first_name: "Олена", tenant_id: 2, tenant_key: "shop-a" } as never;

function reset(): void {
  useUsersStore.setState({
    items: [],
    selectedIds: new Set(),
    status: "idle",
    errorMsg: null,
    sortField: "user_id",
    sortDir: "asc",
    search: "",
    tenantFilter: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  reset();
});

describe("store користувачів", () => {
  it("load везе список, а помилка лишається видимою", async () => {
    api.list.mockResolvedValueOnce([PERSON]);
    await useUsersStore.getState().load();
    expect(useUsersStore.getState().items).toEqual([PERSON]);
    expect(useUsersStore.getState().status).toBe("idle");

    api.list.mockRejectedValueOnce(new Error("мережа"));
    await useUsersStore.getState().load();
    expect(useUsersStore.getState().status).toBe("error");
    expect(useUsersStore.getState().errorMsg).toBe("мережа");
  });

  it("refresh оновлює дані й теж не ковтає помилку", async () => {
    api.list.mockResolvedValueOnce([PERSON, OTHER]);
    await useUsersStore.getState().refresh();
    expect(useUsersStore.getState().items).toHaveLength(2);

    api.list.mockRejectedValueOnce(new Error("таймаут"));
    await useUsersStore.getState().refresh();
    expect(useUsersStore.getState().errorMsg).toBe("таймаут");
  });

  it("фільтр проєкту пишеться в стан і знімається", () => {
    useUsersStore.getState().setTenantFilter("shop-a");
    expect(useUsersStore.getState().tenantFilter).toBe("shop-a");

    useUsersStore.getState().setTenantFilter(null);
    expect(useUsersStore.getState().tenantFilter).toBeNull();
  });

  it("сортування за проєктом: перший клік — за зростанням, другий — за спаданням", () => {
    useUsersStore.getState().setSort("tenant_key");
    expect(useUsersStore.getState()).toMatchObject({ sortField: "tenant_key", sortDir: "asc" });

    useUsersStore.getState().setSort("tenant_key");
    expect(useUsersStore.getState().sortDir).toBe("desc");

    useUsersStore.getState().setSort("first_name");
    expect(useUsersStore.getState()).toMatchObject({ sortField: "first_name", sortDir: "asc" });

    useUsersStore.getState().setSearch("сер");
    expect(useUsersStore.getState().search).toBe("сер");
  });

  it("вибір: toggle, «вибрати всі» в обидва боки, очищення", () => {
    useUsersStore.getState().toggleSelect(7);
    expect(useUsersStore.getState().selectedIds.has(7)).toBe(true);
    useUsersStore.getState().toggleSelect(7);
    expect(useUsersStore.getState().selectedIds.has(7)).toBe(false);

    useUsersStore.getState().selectAll([7, 8]);
    expect(useUsersStore.getState().selectedIds.size).toBe(2);
    useUsersStore.getState().selectAll([7, 8]);
    expect(useUsersStore.getState().selectedIds.size).toBe(0);

    useUsersStore.getState().toggleSelect(8);
    useUsersStore.getState().clearSelection();
    expect(useUsersStore.getState().selectedIds.size).toBe(0);
  });

  it("видалення й блокування одного рядка", async () => {
    useUsersStore.setState({ items: [PERSON, OTHER], selectedIds: new Set([7]) });

    await useUsersStore.getState().deleteOne(7);
    expect(api.remove).toHaveBeenCalledWith(7);
    expect(useUsersStore.getState().items).toEqual([OTHER]);
    expect(useUsersStore.getState().selectedIds.size).toBe(0);

    await useUsersStore.getState().blockOne(8, true);
    expect(api.block).toHaveBeenCalledWith(8, true);
    expect(useUsersStore.getState().items[0]).toMatchObject({ user_id: 8, is_blocked: 1 });
  });

  it("масові дії: без вибору — нічого, з вибором — delete/block/unblock", async () => {
    await useUsersStore.getState().bulk("delete");
    expect(api.bulk).not.toHaveBeenCalled();

    useUsersStore.setState({ items: [PERSON, OTHER], selectedIds: new Set([7]) });
    await useUsersStore.getState().bulk("delete");
    expect(api.bulk).toHaveBeenCalledWith("delete", [7]);
    expect(useUsersStore.getState().items).toEqual([OTHER]);

    useUsersStore.setState({ items: [PERSON, OTHER], selectedIds: new Set([8]) });
    await useUsersStore.getState().bulk("block");
    expect(useUsersStore.getState().items[1]).toMatchObject({ is_blocked: 1 });

    useUsersStore.setState({ selectedIds: new Set([8]) });
    await useUsersStore.getState().bulk("unblock");
    expect(useUsersStore.getState().items[1]).toMatchObject({ is_blocked: 0 });
  });
});
