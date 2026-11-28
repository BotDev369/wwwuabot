// @vitest-environment jsdom
/**
 * Пам'ять пошуку й сортування: вибір переживає перезапуск панелі, а битий
 * вміст сховища не ламає таблицю.
 *
 * @module web-admin-dev/src/features/users/view-memory.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const KEY = "wb.admin.users.view";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("пам'ять вигляду «Користувачів»", () => {
  it("без збереженого вибору — типовий вигляд", async () => {
    const { readViewMemory } = await import("./view-memory");

    expect(readViewMemory()).toEqual({ search: "", sortField: "user_id", sortDir: "asc" });
  });

  it("пошук і порядок читаються після перезапуску панелі", async () => {
    const first = await import("./view-memory");
    first.writeViewMemory({ search: "олен", sortField: "tenant_key", sortDir: "desc" });

    vi.resetModules();
    const second = await import("./view-memory");
    expect(second.readViewMemory()).toEqual({
      search: "олен",
      sortField: "tenant_key",
      sortDir: "desc",
    });
  });

  it("битий JSON і чужі значення дають типові поля", async () => {
    const { readViewMemory } = await import("./view-memory");

    localStorage.setItem(KEY, "{не json");
    expect(readViewMemory()).toEqual({ search: "", sortField: "user_id", sortDir: "asc" });

    localStorage.setItem(KEY, JSON.stringify({ search: 7, sortField: "hack", sortDir: "бік" }));
    expect(readViewMemory()).toEqual({ search: "", sortField: "user_id", sortDir: "asc" });

    localStorage.setItem(KEY, JSON.stringify({ search: "сер", sortField: "first_name" }));
    expect(readViewMemory()).toEqual({ search: "сер", sortField: "first_name", sortDir: "asc" });
  });

  it("store стартує зі збереженим виглядом і пише зміни назад", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ search: "сер", sortField: "username", sortDir: "desc" }),
    );
    const { useUsersStore } = await import("./store");

    expect(useUsersStore.getState()).toMatchObject({
      search: "сер",
      sortField: "username",
      sortDir: "desc",
    });

    useUsersStore.getState().setSearch("олен");
    useUsersStore.getState().setSort("tenant_key");
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null")).toEqual({
      search: "олен",
      sortField: "tenant_key",
      sortDir: "asc",
    });
  });
});
