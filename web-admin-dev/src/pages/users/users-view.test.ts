/**
 * Видимий список: проєкт як фільтр і як порядок сортування.
 *
 * @module web-admin-dev/src/pages/users/users-view.test
 */

import { describe, expect, it } from "vitest";
import type { UserRow } from "../../shared/api/users.api";
import { filteredUsers } from "./users-view";

function user(overrides: Partial<UserRow> & { user_id: number }): UserRow {
  return {
    first_name: null,
    last_name: null,
    username: null,
    language: null,
    created_at: null,
    is_blocked: 0,
    role: null,
    tariff: null,
    status: null,
    discount: null,
    permissions: null,
    ...overrides,
  } as UserRow;
}

const PEOPLE: UserRow[] = [
  user({ user_id: 1, first_name: "Аліса", tenant_id: 1, tenant_key: null }),
  user({
    user_id: 2,
    first_name: "Богдан",
    tenant_id: 2,
    tenant_key: "shop-a",
    tenant_name: "Магазин",
  }),
  user({
    user_id: 3,
    first_name: "Віра",
    tenant_id: 2,
    tenant_key: "shop-a",
    tenant_name: "Магазин",
  }),
];

const base = { search: "", tenantFilter: null, sortField: "user_id", sortDir: "asc" } as const;

describe("filteredUsers", () => {
  it("фільтр за проєктом лишає тільки його людей", () => {
    const ids = filteredUsers(PEOPLE, { ...base, tenantFilter: "shop-a" }).map((u) => u.user_id);

    expect(ids).toEqual([2, 3]);
  });

  it("головний проєкт — це люди без ключа й з `tenant_id NULL`", () => {
    const ids = filteredUsers(
      [...PEOPLE, user({ user_id: 4, first_name: "Гліб", tenant_id: null })],
      { ...base, tenantFilter: "main" },
    ).map((u) => u.user_id);

    expect(ids).toEqual([1, 4]);
  });

  it("пошук і фільтр діють разом", () => {
    const ids = filteredUsers(PEOPLE, {
      ...base,
      tenantFilter: "shop-a",
      search: "віра",
    }).map((u) => u.user_id);

    expect(ids).toEqual([3]);
  });

  it("сортування за проєктом ставить головний перед рештою", () => {
    const asc = filteredUsers(PEOPLE, { ...base, sortField: "tenant_key", sortDir: "asc" }).map(
      (u) => u.user_id,
    );
    const desc = filteredUsers(PEOPLE, { ...base, sortField: "tenant_key", sortDir: "desc" }).map(
      (u) => u.user_id,
    );

    expect(asc).toEqual([1, 2, 3]);
    expect(desc).toEqual([2, 3, 1]);
  });

  it("порожній проєкт — порожній список, а не всі люди", () => {
    expect(filteredUsers(PEOPLE, { ...base, tenantFilter: "nope" })).toEqual([]);
  });
});
