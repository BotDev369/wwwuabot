// @vitest-environment jsdom
/**
 * Сторінка користувачів: три стани завантаження й те, що пошук веде у стан.
 *
 * @module web-admin-dev/src/pages/users/UsersPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/users/store", () => ({
  useUsersStore: () => store.state,
}));
vi.mock("./UsersTable", () => ({
  UsersTable: ({ onMessage }: { onMessage: (id: number) => void }) => (
    <button type="button" data-testid="table" onClick={() => onMessage(7)}>
      table
    </button>
  ),
}));
vi.mock("./UserBulkBar", () => ({ UserBulkBar: () => <div data-testid="bulk" /> }));
vi.mock("./UserMessageModal", () => ({
  UserMessageModal: ({ userId, onClose }: { userId: number; onClose: () => void }) => (
    <button type="button" data-testid="message" onClick={onClose}>
      {userId}
    </button>
  ),
}));

const { UsersPage } = await import("./UsersPage");

function state(overrides: Record<string, unknown> = {}) {
  return {
    items: [{ user_id: 7 }],
    status: "ready",
    errorMsg: "",
    load: vi.fn(),
    search: "",
    setSearch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  store.state = state();
});

describe("UsersPage", () => {
  it("малює таблицю й лічить людей у шапці", () => {
    render(<UsersPage />);

    expect(screen.getByTestId("table")).toBeTruthy();
    expect(screen.getByTestId("bulk")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
  });

  it("порожній список не показує лічильник", () => {
    store.state = state({ items: [] });
    render(<UsersPage />);

    expect(screen.queryByText("1")).toBeNull();
  });

  it("поки вантажить — замість таблиці текст, а не порожнеча", () => {
    store.state = state({ status: "loading" });
    render(<UsersPage />);

    expect(screen.getByText("Завантаження користувачів…")).toBeTruthy();
    expect(screen.queryByTestId("table")).toBeNull();
  });

  it("помилка показує причину й кнопку повтору", () => {
    const load = vi.fn();
    store.state = state({ status: "error", errorMsg: "D1 недоступна", load });
    render(<UsersPage />);

    expect(screen.getByText(/D1 недоступна/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(load).toHaveBeenCalled();
  });

  it("пошук іде у стан, а не у власну копію фільтра", () => {
    const setSearch = vi.fn();
    store.state = state({ setSearch });
    render(<UsersPage />);

    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "сер" } });
    expect(setSearch).toHaveBeenCalledWith("сер");
  });

  it("повідомлення відкривається на вибраного й закривається", () => {
    render(<UsersPage />);

    fireEvent.click(screen.getByTestId("table"));
    expect(screen.getByTestId("message").textContent).toBe("7");

    fireEvent.click(screen.getByTestId("message"));
    expect(screen.queryByTestId("message")).toBeNull();
  });
});
