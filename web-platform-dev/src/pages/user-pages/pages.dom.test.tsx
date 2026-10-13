// @vitest-environment jsdom
/**
 * «Сторінки» — два погляди: «Мої» й «Публічні».
 *
 * Тут ламається мовчки: досить показати чуже під «Мої» — і людина вважає чужу
 * сторінку своєю; досить загубити перемикач — і погляд лишається один, а
 * публічні сторінки стають недосяжними; досить мовчати на порожній список — і
 * екран читається як поламаний.
 *
 * @module web-platform-dev/src/pages/user-pages/pages.dom.test
 */

import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { PublicPage, UserPage } from "@wwwuabot/shared/pages";

const pages = { listOwn: vi.fn(), published: vi.fn() };

vi.mock("../../shared/api/pages.api", () => ({
  pagesApi: {
    listOwn: (...args: unknown[]) => pages.listOwn(...args),
    published: (...args: unknown[]) => pages.published(...args),
  },
}));
vi.mock("@wwwuabot/ui/nav", () => ({ useScreenChrome: () => {} }));

const { PublicPagesTab } = await import("./PublicPagesTab");
const { UserPagesPage } = await import("./UserPagesPage");

const userPage = (id: number, title: string): UserPage => ({
  id,
  slug: `storinka-${id}`,
  title,
  template: "card",
  values: {},
  isPublic: false,
  staff: [],
  role: "owner",
  updatedAt: "2026-10-01 10:00:00",
});

const publicPage = (id: number, title: string): PublicPage => ({
  id,
  slug: `publichna-${id}`,
  title,
  template: "card",
  author: { id: 9, name: "olena", photoUrl: null },
  updatedAt: "2026-10-01 10:00:00",
});

beforeEach(() => {
  vi.clearAllMocks();
  pages.listOwn.mockResolvedValue([userPage(1, "Моя візитка")]);
  pages.published.mockResolvedValue([publicPage(2, "Чужа подія")]);
});

const renderAt = (element: ReactElement): void => {
  render(<MemoryRouter>{element}</MemoryRouter>);
};

describe("погляд «Публічні»", () => {
  it("показує чужі опубліковані сторінки", async () => {
    renderAt(<PublicPagesTab />);

    expect(await screen.findByText("Чужа подія")).toBeTruthy();
    expect(pages.published).toHaveBeenCalled();
  });

  it("порожній список каже, як сторінка тут опиняється", async () => {
    pages.published.mockResolvedValue([]);

    renderAt(<PublicPagesTab />);

    expect(await screen.findByText(/Поки ніхто не опублікував/)).toBeTruthy();
  });

  it("помилка називає причину й дає спробувати ще раз", async () => {
    pages.published.mockRejectedValue(new Error("Немає доступу"));

    renderAt(<PublicPagesTab />);

    expect(await screen.findByText("Немає доступу")).toBeTruthy();
    pages.published.mockResolvedValue([publicPage(2, "Чужа подія")]);
    await userEvent.click(screen.getByRole("button", { name: /Спробувати ще раз/ }));
    expect(await screen.findByText("Чужа подія")).toBeTruthy();
  });
});

describe("екран «Сторінки»", () => {
  it("першим показує погляд «Мої» — свої сторінки", async () => {
    renderAt(<UserPagesPage />);

    expect(await screen.findByText("Моя візитка")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Мої" }).getAttribute("aria-selected")).toBe("true");
  });

  it("перемикач відкриває «Публічні» — і там уже чужі", async () => {
    renderAt(<UserPagesPage />);
    await screen.findByText("Моя візитка");

    await userEvent.click(screen.getByRole("tab", { name: "Публічні" }));

    await waitFor(() => expect(screen.getByText("Чужа подія")).toBeTruthy());
  });

  it("порожній список своїх каже, як створити сторінку", async () => {
    pages.listOwn.mockResolvedValue([]);

    renderAt(<UserPagesPage />);

    expect(await screen.findByText("Ще немає жодної сторінки.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Створити сторінку" })).toBeTruthy();
  });
});
