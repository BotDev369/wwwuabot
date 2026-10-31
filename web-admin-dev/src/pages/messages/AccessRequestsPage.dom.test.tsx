// @vitest-environment jsdom
/**
 * Звернення зі сторінки відмови: стани, фільтр на клієнті й відкриття рядка.
 *
 * @module web-admin-dev/src/pages/messages/AccessRequestsPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/access-requests/store", () => ({
  useAccessRequests: () => store.state,
}));
vi.mock("./RequestList", () => ({
  RequestList: ({
    items,
    emptyText,
    onOpen,
  }: {
    items: { id: number }[];
    emptyText: string;
    onOpen: (id: number) => void;
  }) => (
    <div data-testid="list">
      <span data-testid="empty">{emptyText}</span>
      <span data-testid="count">{items.length}</span>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onOpen(item.id)}>
          open-{item.id}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./RequestModal", () => ({
  RequestModal: ({ item, onClose }: { item: { id: number }; onClose: () => void }) => (
    <button type="button" data-testid="modal" onClick={onClose}>
      {item.id}
    </button>
  ),
}));
vi.mock("./RequestCreateModal", () => ({
  RequestCreateModal: ({ onClose }: { onClose: () => void }) => (
    <button type="button" data-testid="create-modal" onClick={onClose}>
      close
    </button>
  ),
}));

const { AccessRequestsPage } = await import("./AccessRequestsPage");

const ITEM = {
  id: 1,
  user_id: 5,
  text: "Пустіть будь ласка",
  first_name: "Сергій",
  last_name: "Дискант",
  username: null,
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    items: [ITEM],
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

describe("AccessRequestsPage", () => {
  it("малює список і лічильник", () => {
    render(<AccessRequestsPage />);

    expect(screen.getByTestId("count").textContent).toBe("1");
    expect(screen.getByRole("heading", { name: "Повідомлення" })).toBeTruthy();
  });

  it("порожній список пояснює, звідки візьмуться звернення", () => {
    store.state = state({ items: [] });
    render(<AccessRequestsPage />);

    expect(screen.getByTestId("empty").textContent).toContain("Повідомлень ще немає");
  });

  it("фільтр шукає за автором, текстом і номером", () => {
    store.state = state({ search: "дискант" });
    render(<AccessRequestsPage />);
    expect(screen.getByTestId("count").textContent).toBe("1");

    store.state = state({ search: "чужe" });
    render(<AccessRequestsPage />);
    const counts = screen.getAllByTestId("count");
    const empties = screen.getAllByTestId("empty");
    expect(counts[counts.length - 1].textContent).toBe("0");
    expect(empties[empties.length - 1].textContent).toContain("Нічого не знайдено");
  });

  it("поки вантажить і коли впало — різні тексти", () => {
    store.state = state({ status: "loading" });
    const loading = render(<AccessRequestsPage />);
    expect(screen.getByText("Завантаження повідомлень…")).toBeTruthy();
    loading.unmount();

    const load = vi.fn();
    store.state = state({ status: "error", errorMsg: "KV недоступний", load });
    render(<AccessRequestsPage />);
    expect(screen.getByText(/KV недоступний/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Спробувати ще" }));
    expect(load).toHaveBeenCalled();
  });

  it("пошук і запис ведуть у стан сторінки", () => {
    const setSearch = vi.fn();
    store.state = state({ setSearch });
    render(<AccessRequestsPage />);

    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "сер" } });
    expect(setSearch).toHaveBeenCalledWith("сер");

    fireEvent.click(screen.getByRole("button", { name: "Записати" }));
    expect(screen.getByTestId("create-modal")).toBeTruthy();
  });

  it("рядок відкривається у модалці й закривається", () => {
    render(<AccessRequestsPage />);

    fireEvent.click(screen.getByText("open-1"));
    expect(screen.getByTestId("modal").textContent).toBe("1");

    fireEvent.click(screen.getByTestId("modal"));
    expect(screen.queryByTestId("modal")).toBeNull();
  });
});
