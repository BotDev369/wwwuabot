// @vitest-environment jsdom
/**
 * «Обране»: **лайк лишається списком, а не глухим кутом**.
 *
 * Тут ламається мовчки: досить не сказати причину помилки — і екран виглядає
 * просто порожнім; досить не показати, що контент зник, — і рядок обіцяє
 * відкрити те, чого немає; досить забути про дотик «Прибрати лайк» — і лайк
 * лишається назавжди.
 *
 * @module web-platform-dev/src/pages/favorites/FavoritesPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FavoriteItem } from "@wwwuabot/shared/favorites";

const navigate = vi.fn();
const favorites = {
  items: [] as FavoriteItem[],
  loading: false,
  error: null as string | null,
  busy: null as string | null,
  reload: vi.fn(),
  remove: vi.fn(),
};

vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));
vi.mock("./useFavorites", () => ({ useFavorites: () => favorites }));

const { FavoritesPage } = await import("./FavoritesPage");

const item = (overrides: Partial<FavoriteItem> = {}): FavoriteItem => ({
  kind: "page",
  targetId: 1,
  title: "Моя сторінка",
  href: "/pages/1",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  favorites.items = [];
  favorites.loading = false;
  favorites.error = null;
  favorites.busy = null;
});

describe("стани екрана", () => {
  it("завантаження не прикидається порожнім списком", () => {
    favorites.loading = true;
    render(<FavoritesPage />);

    expect(screen.getByText(/Завантаження/)).toBeTruthy();
  });

  it("помилка називає причину й дає повторити", async () => {
    favorites.error = "Немає доступу";
    render(<FavoritesPage />);

    expect(screen.getByText("Немає доступу")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Повторити" }));

    expect(favorites.reload).toHaveBeenCalled();
  });

  it("порожній список каже, як додати лайк", () => {
    render(<FavoritesPage />);

    expect(screen.getByText(/Тут буде все, що ви вподобали/)).toBeTruthy();
  });
});

describe("рядок обраного", () => {
  it("дотик «Відкрити» веде за адресою рядка", async () => {
    favorites.items = [item()];
    render(<FavoritesPage />);

    await userEvent.click(screen.getByRole("button", { name: "Відкрити" }));

    expect(navigate).toHaveBeenCalledWith("/pages/1");
  });

  it("зниклий контент каже про це словами, а не мовчить", () => {
    favorites.items = [item({ href: null })];
    render(<FavoritesPage />);

    expect(screen.getByText(/Контент видалено або доступ закрито/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Відкрити" })).toBeNull();
  });

  it("«Прибрати лайк» прибирає саме цей рядок", async () => {
    const first = item();
    favorites.items = [first];
    render(<FavoritesPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати лайк/ }));

    expect(favorites.remove).toHaveBeenCalledWith(first);
  });
});
