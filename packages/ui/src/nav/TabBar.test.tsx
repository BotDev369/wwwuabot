/**
 * Тести нижнього футера.
 *
 * Перевіряємо те, що легко зламати мовчки: склад слотів (у центрі «+», крайній
 * справа — профіль), підсвічення активного розділу ЗАЛИТИМ знаком (без фонового
 * кола) і те, що клік по пункту з адресою робить навігацію оболонки, а не
 * перезавантаження сторінки.
 */

import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TabBar } from "./TabBar";
import { buildTabBarItems, isTabActive, withPrimaryAction } from "./build-items";
import type { ShellTab } from "./types";

const TABS: readonly ShellTab[] = [
  { key: "home", label: "Головна", icon: "home", iconActive: "home-solid", href: "/" },
  {
    key: "space",
    label: "Простір",
    icon: "feed",
    iconActive: "feed-solid",
    href: "/space",
  },
  { key: "create", label: "Створити", icon: "plus", primary: true },
  { key: "shop", label: "GalyaShop", icon: "shop", href: "/galyashop" },
  { key: "profile", label: "Профіль", icon: "user", iconActive: "user-solid" },
];

function render(pathname: string) {
  const items = buildTabBarItems({
    tabs: TABS,
    pathname,
    navigate: vi.fn(),
    onPlaceholder: vi.fn(),
  });
  return renderToStaticMarkup(<TabBar items={items} />);
}

describe("TabBar", () => {
  it("рендерить усі слоти, підписує навігацію й позначає активний пункт", () => {
    const items = buildTabBarItems({
      tabs: TABS,
      pathname: "/space",
      navigate: vi.fn(),
      onPlaceholder: vi.fn(),
    });
    const html = renderToStaticMarkup(<TabBar items={items} label="Навігація платформи" />);

    expect(html).toContain('aria-label="Навігація платформи"');
    for (const label of ["Головна", "Простір", "GalyaShop", "Профіль", "Створити"]) {
      expect(html).toContain(label);
    }
    // Активний — рівно один, і це «Простір»
    expect(html.match(/wb-tabbar-item--active/g)).toHaveLength(1);
    expect(html).toContain('aria-current="page"');
  });

  it("центр — «+» без підпису, крайній справа — профіль", () => {
    const html = render("/");
    const classes = [...html.matchAll(/class="(wb-tabbar-item[^"]*)"/g)].map((m) => m[1]);

    expect(classes).toHaveLength(5);
    expect(classes[2]).toContain("wb-tabbar-item--primary");
    // «+» — іконка без підпису, тож підпис іде в aria-label
    expect(html).toContain('aria-label="Створити"');
    expect(html.indexOf("Профіль")).toBeGreaterThan(html.indexOf("GalyaShop"));
  });

  it("активний пункт показує ЗАЛИТИЙ варіант іконки (і лише він)", () => {
    const html = render("/space");

    // Залитий гліф — це окремий svg з fill замість обводки; в смузі він рівно один
    expect(html.match(/fill="currentColor"/g)).toHaveLength(1);
    expect(html).toContain('fill-rule="evenodd"'); // рядки стрічки вирізані з картки
    // Сам підпис активного пункту-посилання лишається підписаним для скрінрідера
    expect(html).toContain('aria-current="page"');
  });

  it("пункт без залитого варіанта лишається контурним у будь-якому стані", () => {
    // GalyaShop не має iconActive — активний стан їй дає лише колір і штрих (CSS)
    expect(render("/galyashop").match(/fill="currentColor"/g)).toBeNull();
    // Головна вибрана — залитий гліф є
    expect(render("/").match(/fill="currentColor"/g)).toHaveLength(1);
  });

  it("число непрочитаних стоїть на своєму пункті — і лише коли воно є", () => {
    const items = buildTabBarItems({
      tabs: TABS.map((tab) =>
        tab.key === "shop" ? { ...tab, badge: 3 } : { ...tab, badge: undefined },
      ),
      pathname: "/",
      navigate: vi.fn(),
      onPlaceholder: vi.fn(),
    });
    const html = renderToStaticMarkup(<TabBar items={items} />);

    expect(html).toContain("wb-tabbar-badge");
    expect(html).toContain(">3<");
    // Нуль і від'ємне — це «немає позначки», а не нуль на іконці.
    const none = renderToStaticMarkup(
      <TabBar items={items.map((item) => ({ ...item, badge: 0 }))} />,
    );
    expect(none).not.toContain("wb-tabbar-badge");
  });

  it("пункт без адреси — кнопка-заглушка, а не посилання", () => {
    const html = render("/");

    expect(html).toContain("<button");
    expect(html.match(/<a /g)).toHaveLength(3); // home, space, shop
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
    expect(navigate).toHaveBeenCalledWith("/space");
    expect(onPlaceholder).not.toHaveBeenCalled();

    items[4].onSelect?.();
    expect(onPlaceholder).toHaveBeenCalledWith(TABS[4]);
  });

  it("своя дія пункту перекриває заглушку: центральний «+» відкриває композер", () => {
    const openComposer = vi.fn();
    const onPlaceholder = vi.fn();
    const items = buildTabBarItems({
      tabs: withPrimaryAction(TABS, openComposer),
      pathname: "/",
      navigate: vi.fn(),
      onPlaceholder,
    });

    items[2].onSelect?.();
    expect(openComposer).toHaveBeenCalledTimes(1);
    expect(onPlaceholder).not.toHaveBeenCalled();

    // Пункт-заглушка без своєї дії поводиться як раніше
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
