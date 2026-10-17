// @vitest-environment jsdom
/**
 * «Обране»: **лайк лишається списком, а не глухим кутом**.
 *
 * Тут ламається мовчки: досить не сказати причину помилки — і екран виглядає
 * просто порожнім; досить не показати, що контент зник, — і рядок обіцяє
 * відкрити те, чого немає; досить забути про дотик «Прибрати лайк» — і лайк
 * лишається назавжди.
 *
 * Окремо перевіряється порядок: «Спочатку нові» та «За назвою» — два вибори
 * однієї людини, і вибраний мусить бути видно (`aria-pressed`), а список —
 * справді перебудуватись.
 *
 * @module web-platform-dev/src/pages/favorites/FavoritesPage.dom.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FavoriteItem, FavoriteSort } from "@wwwuabot/shared/favorites";

const navigate = vi.fn();
const favorites = {
  items: [] as FavoriteItem[],
  loading: false,
  error: null as string | null,
  busy: null as string | null,
  sort: "date" as FavoriteSort,
  setSort: vi.fn((sort: FavoriteSort) => {
    favorites.sort = sort;
  }),
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
  photoUrl: null,
  savedAt: "2026-10-14 10:00:00",
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  favorites.items = [];
  favorites.loading = false;
  favorites.error = null;
  favorites.busy = null;
  favorites.sort = "date";
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
  it("дотик по рядку веде за адресою сторінки", async () => {
    favorites.items = [item()];
    render(<FavoritesPage />);

    // Саме рядок, а не кнопка зняття лайка: її підпис теж згадує назву.
    await userEvent.click(screen.getByRole("button", { name: /^Моя сторінка/ }));

    expect(navigate).toHaveBeenCalledWith("/pages/1");
  });

  it("зниклий контент каже про це словами, а не мовчить", () => {
    favorites.items = [item({ href: null })];
    render(<FavoritesPage />);

    expect(screen.getByText(/Контент видалено або доступ закрито/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Моя сторінка/ })).toBeNull();
  });

  it("«Прибрати з обраного» прибирає саме цей рядок", async () => {
    const first = item();
    favorites.items = [first];
    render(<FavoritesPage />);

    await userEvent.click(screen.getByRole("button", { name: /Прибрати з обраного/ }));

    expect(favorites.remove).toHaveBeenCalledWith(first);
  });

  it("знак прибирання — смітник, а не друге серце", () => {
    favorites.items = [item()];
    const { container } = render(<FavoritesPage />);

    const remove = container.querySelector(".wb-favorites-remove");
    expect(remove?.getAttribute("aria-label")).toContain("Прибрати з обраного");
    // Серце тут читалось би як лайк, і ним знімали б лайк випадково: у рядку
    // не мусить бути жодного серця.
    expect(container.querySelector(".wb-favorites-remove")?.innerHTML).toContain("M3 6h18");
    expect(container.innerHTML).not.toContain("20.84 4.61");
  });
});

describe("порядок списку", () => {
  it("два вибори видно, і вибраний каже про це", () => {
    favorites.items = [item()];
    render(<FavoritesPage />);

    const chosen = screen.getByRole("button", { name: "Спочатку нові" });
    expect(chosen.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "За назвою" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("«За назвою» міняє порядок рядків", async () => {
    favorites.items = [
      item({ targetId: 1, title: "Яблуко" }),
      item({ targetId: 2, title: "Абрикос" }),
    ];
    render(<FavoritesPage />);

    await userEvent.click(screen.getByRole("button", { name: "За назвою" }));

    expect(favorites.setSort).toHaveBeenCalledWith("name");
  });

  it("типовий порядок — найновіше першим", () => {
    favorites.items = [
      item({ targetId: 1, title: "Старе", savedAt: "2026-10-01 09:00:00" }),
      item({ targetId: 2, title: "Нове", savedAt: "2026-10-16 09:00:00" }),
    ];
    render(<FavoritesPage />);

    const rows = screen.getAllByRole("button", { name: /^(Старе|Нове)/ });
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Нове"),
      expect.stringContaining("Старе"),
    ]);
  });
});
