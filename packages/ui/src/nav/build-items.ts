/**
 * Пункти футера зі складу оболонки → те, що рендерить `TabBar`.
 *
 * Чисті функції без стану: правило «котрий пункт активний» і «що робити на
 * дотик» однакове в обох оболонках, тож живе тут, а не двічі в них.
 *
 * @module @wwwuabot/ui/nav
 */

import type { ShellTab, TabBarItem } from "./types";

/**
 * Чи відповідає поточний шлях пункту.
 *
 * Вкладені адреси належать тому ж пункту: `/mydate/1980-03-03` — це «МоїДати».
 * Для головної порівнюємо точно: інакше `/` підсвічувався б на кожній сторінці.
 */
export function isTabActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface BuildTabBarItemsOptions {
  tabs: readonly ShellTab[];
  /** Поточний шлях (`useLocation().pathname`). */
  pathname: string;
  /** Перехід у межах SPA (`useNavigate()`). */
  navigate: (href: string) => void;
  /** Дотик до пункту без адреси: показати, що розділ ще не готовий. */
  onPlaceholder: (tab: ShellTab) => void;
}

export function buildTabBarItems({
  tabs,
  pathname,
  navigate,
  onPlaceholder,
}: BuildTabBarItemsOptions): TabBarItem[] {
  return tabs.map((tab) => {
    const href = tab.href;
    return {
      ...tab,
      active: href ? isTabActive(pathname, href) : false,
      onSelect: href ? () => navigate(href) : () => onPlaceholder(tab),
    };
  });
}
