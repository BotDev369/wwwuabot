// @vitest-environment jsdom
/**
 * Сторінка — **лише перегляд**: назва, товари магазину й сама сторінка.
 *
 * Тут ламається мовчки: повернута кнопка «Змінити текст» чи перемикач
 * публічності знову дала б людині право правити те, що належить платформі.
 *
 * @module web-platform-dev/src/pages/user-pages/UserPageView.dom.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { UserPage } from "@wwwuabot/shared/pages";

const state: { page: UserPage | null; loading: boolean; error: string | null } = {
  page: null,
  loading: false,
  error: null,
};

vi.mock("./useUserPage", () => ({ useUserPage: () => ({ ...state, pages: {} }) }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("@wwwuabot/ui/blocks", () => ({ registerAllBlocks: () => {} }));
vi.mock("@wwwuabot/ui", () => ({ PageCanvas: () => <div data-testid="canvas" /> }));
vi.mock("@/pages/shop/useShopProducts", () => ({
  useShopProducts: () => ({ products: [], media: [], loading: false, error: null }),
}));
vi.mock("@/pages/shop/ShopPanel", () => ({
  ShopPanel: ({ pageId }: { pageId: number }) => <div>Товари магазину {pageId}</div>,
}));

const { UserPageView } = await import("./UserPageView");

const page = (over: Partial<UserPage> = {}): UserPage => ({
  id: 7,
  slug: "moia-vizytka",
  title: "Моя візитка",
  template: "card",
  values: { title: "Моя візитка" },
  isPublic: true,
  staff: [{ id: 9, name: "olena", role: "owner" }],
  role: "owner",
  updatedAt: "2026-10-01 10:00:00",
  ...over,
});

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={["/pages/7"]}>
      <Routes>
        <Route path="/pages/:id" element={<UserPageView />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.page = page();
  state.loading = false;
  state.error = null;
});

afterEach(() => {
  cleanup();
});

describe("сторінка як перегляд", () => {
  it("показує назву й саму сторінку", () => {
    renderPage();

    expect(screen.getByText("Моя візитка")).toBeTruthy();
    expect(screen.getByTestId("canvas")).toBeTruthy();
  });

  it("не дає правити сторінку: ні тексту, ні видимості, ні видалення", () => {
    renderPage();

    for (const name of [/Змінити текст/, /Видалити/, /Публічна сторінка/, /Додати адміна/]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("магазин показує товари, але сторінка не стає редагованою", () => {
    state.page = page({ id: 12, template: "shop" });

    renderPage();

    expect(screen.getByText("Товари магазину 12")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Змінити текст/ })).toBeNull();
  });

  it("немає сторінки — каже це, а не порожній екран", () => {
    state.page = null;
    state.error = null;

    renderPage();

    expect(screen.getByText("Такої сторінки немає.")).toBeTruthy();
  });
});
