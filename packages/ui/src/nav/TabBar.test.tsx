/**
 * Тести нижнього футера.
 *
 * Перевіряємо дві речі, які легко зламати мовчки: склад слотів (5 — і в
 * центрі «+», крайній справа — профіль) і те, що клік по пункту з адресою
 * робить навігацію оболонки, а не перезавантаження сторінки.
 */

import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TabBar } from "./TabBar";
import { buildTabBarItems, isTabActive } from "./build-items";
import type { ShellTab } from "./types";

const TABS: readonly ShellTab[] = [
  { key: "home", label: "Головна", icon: "home", href: "/" },
  { key: "mydate", label: "МоїДати", icon: "my-dates", href: "/mydate" },
  { key: "create", label: "Створити", icon: "plus", primary: true },
  { key: "shop", label: "GalyaShop", icon: "tag", href: "/galyashop" },
  { key: "profile", label: "Профіль", icon: "user" },
];

describe("TabBar", () => {
  it("рендерить усі слоти, підписує навігацію й позначає активний пункт", () => {
    const items = buildTabBarItems({
      tabs: TABS,
      pathname: "/mydate",
      navigate: vi.fn(),
      onPlaceholder: vi.fn(),
    });
    const html = renderToStaticMarkup(<TabBar items={items} label="Навігація платформи" />);

    expect(html).toContain('aria-label="Навігація платформи"');
    for (const label of ["Головна", "МоїДати", "GalyaShop", "Профіль", "Створити"]) {
      expect(html).toContain(label);
    }
    // Активний — рівно один, і це «МоїДати»
    expect(html.match(/wb-tabbar-item--active/g)).toHaveLength(1);
    expect(html).toContain('aria-current="page"');
  });

  it("центр — «+» без підпису, крайній справа — профіль", () => {
    const items = buildTabBarItems({
      tabs: TABS,
      pathname: "/",
      navigate: vi.fn(),
      onPlaceholder: vi.fn(),
    });
    const html = renderToStaticMarkup(<TabBar items={items} />);
    const classes = [...html.matchAll(/class="(wb-tabbar-item[^"]*)"/g)].map((m) => m[1]);

    expect(classes).toHaveLength(5);
    expect(classes[2]).toContain("wb-tabbar-item--primary");
    expect(html).toContain("wb-tabbar-plus");
    // «+» — кругла кнопка без підпису, тож підпис іде в aria-label
    expect(html).toContain('aria-label="Створити"');
    expect(html.indexOf("Профіль")).toBeGreaterThan(html.indexOf("GalyaShop"));
  });

  it("пункт без адреси — кнопка-заглушка, а не посилання", () => {
    const items = buildTabBarItems({
      tabs: TABS,
      pathname: "/",
      navigate: vi.fn(),
      onPlaceholder: vi.fn(),
    });
    const html = renderToStaticMarkup(<TabBar items={items} />);

    expect(html).toContain("<button");
    expect(html.match(/<a /g)).toHaveLength(3); // home, mydate, shop
  });
});

describe("buildTabBarItems", () => {
  it("на дотик до адресного пункту кличе navigate, а не onPlaceholder", () => {
    const navigate = vi.fn();
    const onPlaceholder = vi.fn();
    const items = buildTabBarItems({
      tabs: TABS,
      pathname: "/",
      navigate,
      onPlaceholder,
    });

    items[1].onSelect?.();
    expect(navigate).toHaveBeenCalledWith("/mydate");
    expect(onPlaceholder).not.toHaveBeenCalled();

    items[4].onSelect?.();
    expect(onPlaceholder).toHaveBeenCalledWith(TABS[4]);
  });
});

describe("isTabActive", () => {
  it("вкладені адреси належать тому ж пункту, а головна — лише точно", () => {
    expect(isTabActive("/mydate/1980-03-03/today", "/mydate")).toBe(true);
    expect(isTabActive("/mydates", "/mydate")).toBe(false);
    expect(isTabActive("/", "/")).toBe(true);
    expect(isTabActive("/mydate", "/")).toBe(false);
  });
});
