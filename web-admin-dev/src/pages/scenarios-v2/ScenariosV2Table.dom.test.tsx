// @vitest-environment jsdom
/**
 * Таблиця сценаріїв: пошук, чипси типів, групування, сортування й картка.
 *
 * @module web-admin-dev/src/pages/scenarios-v2/ScenariosV2Table.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

const store = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock("../../features/scenarios/store", () => {
  const hook = () => store.state;
  return { useScenariosStore: Object.assign(hook, { getState: () => store.state }) };
});
vi.mock("../scenarios/ScenarioCardModal", () => ({
  ScenarioCardModal: ({ slug }: { slug: string }) => <div data-testid="card">{slug}</div>,
}));

const { ScenariosV2Table } = await import("./ScenariosV2Table");

const PHOTO = {
  slug: "viruvannia",
  rich_message: "false",
  page_data: null,
  updated_at: "2026-09-01 10:00:00",
  title: "Вірування",
};
const PAGE = {
  slug: "nastya",
  rich_message: null,
  page_data: '{"version":1}',
  updated_at: "2026-09-02 10:00:00",
  title: null,
};
const RICH = {
  slug: "mystec",
  rich_message: "true",
  page_data: null,
  updated_at: "2026-09-03 10:00:00",
  title: "Мистецтво",
};

function state(overrides: Record<string, unknown> = {}) {
  return {
    items: [PHOTO, PAGE, RICH],
    sortField: "slug",
    sortDir: "asc",
    setSort: vi.fn(),
    filter: "all",
    setFilter: vi.fn(),
    groupBy: "none",
    setGroupBy: vi.fn(),
    status: "ready",
    errorMsg: "",
    load: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  store.state = state();
});

describe("ScenariosV2Table", () => {
  it("малює рядки й лічить типи в чипсах", () => {
    render(<ScenariosV2Table />);

    expect(screen.getByText("viruvannia")).toBeTruthy();
    expect(screen.getByText("nastya")).toBeTruthy();
    expect(screen.getByText("3 сценаріїв")).toBeTruthy();
  });

  it("пошук звужує список і каже, скільки лишилось", () => {
    store.state = state({ items: [] });
    const first = render(<ScenariosV2Table />);
    expect(screen.getByText("У базі ще немає сценаріїв.")).toBeTruthy();
    first.unmount();

    store.state = state();
    render(<ScenariosV2Table />);
    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "nastya" } });

    expect(screen.getByText("1 з 3")).toBeTruthy();
    expect(screen.queryByText("viruvannia")).toBeNull();
  });

  it("чипс типу передає фільтр стану", () => {
    const setFilter = vi.fn();
    store.state = state({ setFilter });
    render(<ScenariosV2Table />);

    fireEvent.click(screen.getByRole("button", { name: /Page/ }));
    expect(setFilter).toHaveBeenCalledWith("page");
  });

  it("групування передає режим і малює заголовки груп", () => {
    const setGroupBy = vi.fn();
    store.state = state({ setGroupBy, groupBy: "type" });
    render(<ScenariosV2Table />);

    expect(screen.getByText(/Page \(веб-сторінки\)/)).toBeTruthy();

    fireEvent.click(screen.getByTitle("За префіксом"));
    expect(setGroupBy).toHaveBeenCalledWith("prefix");
  });

  it("сортування показує напрям і передає поле", () => {
    const setSort = vi.fn();
    store.state = state({ setSort, sortField: "slug", sortDir: "desc" });
    render(<ScenariosV2Table />);

    expect(screen.getByText(/Назва/).textContent).toContain("↓");
    fireEvent.click(screen.getByText(/Оновлено/));
    expect(setSort).toHaveBeenCalledWith("updated_at");
  });

  it("відкриття рядка показує картку, Escape закриває", () => {
    render(<ScenariosV2Table />);

    const row = screen.getByText("viruvannia").closest("tr") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /Відкрити/ }));
    expect(screen.getByTestId("card").textContent).toBe("viruvannia");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("card")).toBeNull();
  });

  it("фільтр без збігів каже, за чим шукали", () => {
    store.state = state({ items: [PHOTO] });
    render(<ScenariosV2Table />);
    fireEvent.change(screen.getByPlaceholderText(/Пошук/), { target: { value: "zzz" } });

    expect(screen.getByText(/Нічого не знайдено за «zzz»/)).toBeTruthy();
  });
});
