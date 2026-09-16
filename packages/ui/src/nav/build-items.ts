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
    // Своя дія має пріоритет: центральний «+» — не адреса, а дія.
    const onSelect = tab.onSelect ?? (href ? () => navigate(href) : () => onPlaceholder(tab));
    return {
      ...tab,
      active: href ? isTabActive(pathname, href) : false,
      onSelect,
    };
  });
}

/**
 * Центральний слот дії відкриває свою річ замість навігації.
 *
 * Склад пунктів — свій у кожної оболонки, а «+» — спільний слот дії, і дія в
 * нього теж одна: композер. Тому правило «котрий пункт діє» живе тут, а не
 * двома копіями в оболонках.
 */
export function withPrimaryAction(tabs: readonly ShellTab[], onSelect: () => void): ShellTab[] {
  return tabs.map((tab) => (tab.primary ? { ...tab, onSelect } : tab));
}

/**
 * Пункт зі своєю дією замість навігації — за його ключем.
 *
 * Знадобилось профілю: дотик відкриває меню (`@wwwuabot/ui/menu`), а не веде
 * на адресу. Винести це в спільне — те саме рішення, що й для центрального
 * «+»: оболонка не має тримати власну копію правила «котрий пункт діє».
 *
 * Власна дія має **пріоритет** над `href`, тож пункт із нею перестає бути
 * посиланням: інакше довелося б гасити браузерну навігацію на кожен дотик.
 */
export function withAction(
  tabs: readonly ShellTab[],
  key: string,
  onSelect: () => void,
): ShellTab[] {
  // `href: undefined` навмисно: пункт зі своєю дією більше не адреса, тож і
  // ссилкою в розмітці не рендериться (інакше браузерна навігація йшла б
  // паралельно з нашою).
  return tabs.map((tab) => (tab.key === key ? { ...tab, href: undefined, onSelect } : tab));
}
