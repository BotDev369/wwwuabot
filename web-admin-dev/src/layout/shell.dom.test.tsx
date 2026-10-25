// @vitest-environment jsdom
/**
 * Каркас панелі під дотиком: сайдбар — єдина навігація, і саме поводження
 * (drawer, згортання, вихід) перевіряється тут, а не в розмітці.
 *
 * Сайдбар рендериться всередині `AppShell`, тож обидва файли каркаса
 * накриваються тим самим деревом — як вони й живуть у продукті.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const auth = vi.hoisted(() => ({ logout: vi.fn(() => Promise.resolve()) }));

vi.mock("../shared/api/auth.api", () => ({ logout: auth.logout }));

const { AppShell } = await import("./AppShell");
const { useAdminNav } = await import("./Sidebar/adminNav.store");
const { useSidebar } = await import("./Sidebar/useSidebar");

const reload = vi.fn();

/** Вьюпорт: у jsdom немає `matchMedia`, а `useIsMobile` питає саме його. */
function setViewport(mobile: boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: mobile,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    addListener: () => {},
    removeListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

function renderShell(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/analytics"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="analytics" element={<p>вміст сторінки</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

/** Пункти меню з того самого store, що його читає сайдбар. */
const navItems = () => useAdminNav.getState().sections.flatMap((section) => section.items);

beforeEach(() => {
  localStorage.clear();
  useSidebar.setState({ collapsed: false });
  setViewport(false);
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, reload },
  });
  auth.logout.mockClear();
  reload.mockClear();
});

describe("каркас панелі", () => {
  it("нижнього футера немає ні на десктопі, ні на телефоні", () => {
    setViewport(false);
    const desktop = renderShell();
    expect(desktop.container.querySelector(".wb-tabbar")).toBeNull();
    desktop.unmount();

    setViewport(true);
    const mobile = renderShell();
    expect(mobile.container.querySelector(".wb-tabbar")).toBeNull();
  });

  it("меню — один список без назв розділів, і кожен пункт веде на свою адресу", () => {
    const { container } = renderShell();

    expect(container.querySelector(".wb-nav-section-title")).toBeNull();

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      navItems().map((item) => item.to),
    );
  });

  it("знаки меню — акцентні: клас живе на коробці сайдбара", () => {
    const { container } = renderShell();
    const aside = container.querySelector(".wb-nav");

    expect(aside?.className).toContain("wb-nav--accent-icons");
  });

  it("на телефоні меню — поверхня: гамбургер відкриває, скрим закриває", () => {
    setViewport(true);
    const { container } = renderShell();

    fireEvent.click(screen.getByRole("button", { name: "Відкрити меню" }));
    expect(container.querySelector(".app-drawer--open")).not.toBeNull();

    const overlay = container.querySelector(".app-drawer-overlay");
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as Element);

    expect(container.querySelector(".app-drawer--open")).toBeNull();
    expect(screen.getByRole("button", { name: "Відкрити меню" })).toBeTruthy();
  });

  it("тумблер згортає меню: підписи зникають, пункт лишається знаком", () => {
    renderShell();
    const first = navItems()[0];

    expect(screen.getByText(first.label)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Згорнути бічне меню" }));

    expect(screen.queryByText(first.label)).toBeNull();
    // Ім'я не губиться — воно в підказці й у `aria-label` самого пункту.
    expect(screen.getByRole("link", { name: first.label })).toBeTruthy();
  });

  it("вихід гасить сесію й перезавантажує панель", async () => {
    renderShell();
    const buttons = screen.getAllByRole("button", { name: "Вийти" });

    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(auth.logout).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });
});
