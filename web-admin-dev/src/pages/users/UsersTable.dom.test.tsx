// @vitest-environment jsdom
/**
 * Таблиця користувачів: сортування, вибір, меню дій і закриття по Escape.
 *
 * @module web-admin-dev/src/pages/users/UsersTable.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/users/store", () => {
  const hook = () => store.state;
  return { useUsersStore: Object.assign(hook, { getState: () => store.state }) };
});

const dialog = vi.hoisted(() => ({ confirm: vi.fn(async () => true) }));
vi.mock("@wwwuabot/ui/dialog", () => ({ useDialog: () => dialog }));

vi.mock("./UserCardModal", () => ({
  UserCardModal: ({ userId }: { userId: number }) => <div data-testid="card">{userId}</div>,
}));
vi.mock("./UserEditModal", () => ({
  UserEditModal: ({ userId }: { userId: number }) => <div data-testid="edit">{userId}</div>,
}));

const { UsersTable } = await import("./UsersTable");

const PERSON = {
  user_id: 7,
  first_name: "Сергій",
  last_name: "Дискант",
  username: "DiskantSergiy",
  created_at: "2026-09-01 10:00:00",
  is_blocked: 0,
  role: "admin",
  tariff: "pro",
};

const BLOCKED = {
  user_id: 8,
  first_name: "Олена",
  last_name: null,
  username: null,
  created_at: null,
  is_blocked: 1,
  role: "user",
  tariff: "free",
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    items: [PERSON, BLOCKED],
    sortField: "first_name",
    sortDir: "asc",
    search: "",
    setSort: vi.fn(),
    selectedIds: new Set<number>(),
    toggleSelect: vi.fn(),
    selectAll: vi.fn(),
    blockOne: vi.fn(async () => {}),
    deleteOne: vi.fn(async () => {}),
    refresh: vi.fn(async () => {}),
    ...overrides,
  };
}

beforeEach(() => {
  store.state = state();
  dialog.confirm.mockResolvedValue(true);
});

/** Меню відкривається з рядка своєї людини: ряди сортовані, тож індекс не годиться. */
function openMenu(name: string): void {
  const row = screen.getByText(name).closest("tr") as HTMLElement;
  fireEvent.click(within(row).getByTitle("Дії"));
}

describe("UsersTable", () => {
  it("малює ім'я, позначку тарифу й статус", () => {
    render(<UsersTable onMessage={vi.fn()} />);

    expect(screen.getByText("Сергій Дискант")).toBeTruthy();
    expect(screen.getByText("@DiskantSergiy")).toBeTruthy();
    expect(screen.getByText("admin")).toBeTruthy();
    expect(screen.getByText("pro")).toBeTruthy();
    expect(screen.getByText("Активний")).toBeTruthy();
    expect(screen.getByText("Заблоковано")).toBeTruthy();
  });

  it("порожня база й порожній пошук кажуть різне", () => {
    store.state = state({ items: [] });
    const first = render(<UsersTable onMessage={vi.fn()} />);
    expect(screen.getByText("У базі ще немає користувачів.")).toBeTruthy();
    first.unmount();

    store.state = state({ search: "нема" });
    render(<UsersTable onMessage={vi.fn()} />);
    expect(screen.getByText(/Нічого не знайдено за/)).toBeTruthy();
  });

  it("пошук фільтрує за ім'ям, username і номером", () => {
    store.state = state({ search: "diskant" });
    render(<UsersTable onMessage={vi.fn()} />);

    expect(screen.getByText("Сергій Дискант")).toBeTruthy();
    expect(screen.queryByText("Олена")).toBeNull();
  });

  it("клік по заголовку сортує, вибір — на весь список", () => {
    const setSort = vi.fn();
    const selectAll = vi.fn();
    store.state = state({ setSort, selectAll });
    render(<UsersTable onMessage={vi.fn()} />);

    fireEvent.click(screen.getByText(/ID/));
    expect(setSort).toHaveBeenCalledWith("user_id");

    fireEvent.click(screen.getByTitle("Вибрати всі"));
    expect(selectAll).toHaveBeenCalledWith([8, 7]);
  });

  it("меню дій веде у картку, правку й повідомлення", () => {
    const onMessage = vi.fn();
    render(<UsersTable onMessage={onMessage} />);

    openMenu("Сергій Дискант");

    fireEvent.click(screen.getByText("Переглянути"));
    expect(screen.getByTestId("card").textContent).toBe("7");

    openMenu("Сергій Дискант");
    fireEvent.click(screen.getByText("Змінити"));
    expect(screen.getByTestId("edit").textContent).toBe("7");

    openMenu("Сергій Дискант");
    fireEvent.click(screen.getByText("Написати повідомлення"));
    expect(onMessage).toHaveBeenCalledWith(7);
  });

  it("блокування з меню передає протилежний стан", async () => {
    const blockOne = vi.fn(async () => {});
    store.state = state({ blockOne });
    render(<UsersTable onMessage={vi.fn()} />);

    openMenu("Сергій Дискант");
    fireEvent.click(screen.getByText("Заблокувати"));
    await Promise.resolve();

    expect(blockOne).toHaveBeenCalledWith(7, true);
  });

  it("Escape закриває меню", () => {
    render(<UsersTable onMessage={vi.fn()} />);

    openMenu("Сергій Дискант");
    expect(screen.getByText("Переглянути")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Переглянути")).toBeNull();
  });

  it("видалення питає підтвердження й кличе дію", async () => {
    const deleteOne = vi.fn(async () => {});
    store.state = state({ deleteOne });
    render(<UsersTable onMessage={vi.fn()} />);

    openMenu("Сергій Дискант");
    fireEvent.click(screen.getByText("Видалити"));
    await Promise.resolve();

    expect(deleteOne).toHaveBeenCalledWith(7);
  });

  it("рядок вибирається кліком і знімається повторним", () => {
    render(<UsersTable onMessage={vi.fn()} />);
    const row = screen.getByText("Сергій Дискант").closest("tr") as HTMLElement;

    fireEvent.click(row);
    expect(row.className).toContain("selected");

    fireEvent.click(row);
    expect(row.className).not.toContain("selected");
  });
});
