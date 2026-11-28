// @vitest-environment jsdom
/**
 * Фільтр «Проєкт»: варіанти з наявних людей і значення, яке їде у стан.
 *
 * @module web-admin-dev/src/pages/users/UsersProjectFilter.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/users/store", () => ({ useUsersStore: () => store.state }));

const { UsersProjectFilter } = await import("./UsersProjectFilter");

const ITEMS = [
  { user_id: 1, first_name: "Аліса", tenant_id: 1, tenant_key: null },
  {
    user_id: 2,
    first_name: "Богдан",
    tenant_id: 2,
    tenant_key: "shop-a",
    tenant_name: "Магазин",
  },
];

function state(overrides: Record<string, unknown> = {}) {
  return { items: ITEMS, tenantFilter: null, setTenantFilter: vi.fn(), ...overrides };
}

beforeEach(() => {
  store.state = state();
});

describe("UsersProjectFilter", () => {
  it("показує всі проєкти з даними й головний", () => {
    render(<UsersProjectFilter />);

    const select = screen.getByLabelText("Проєкт") as HTMLSelectElement;
    const options = [...select.options].map((option) => option.textContent);

    expect(options).toEqual(["Усі проєкти", "main — Головний", "shop-a — Магазин"]);
  });

  it("вибір проєкту пише його ключ у стан, «усі» — null", () => {
    const setTenantFilter = vi.fn();
    store.state = state({ setTenantFilter });
    render(<UsersProjectFilter />);

    fireEvent.change(screen.getByLabelText("Проєкт"), { target: { value: "shop-a" } });
    expect(setTenantFilter).toHaveBeenCalledWith("shop-a");

    fireEvent.change(screen.getByLabelText("Проєкт"), { target: { value: "" } });
    expect(setTenantFilter).toHaveBeenLastCalledWith(null);
  });

  it("без людей фільтра немає — немає з чого вибирати", () => {
    store.state = state({ items: [] });
    render(<UsersProjectFilter />);

    expect(screen.queryByLabelText("Проєкт")).toBeNull();
  });
});
