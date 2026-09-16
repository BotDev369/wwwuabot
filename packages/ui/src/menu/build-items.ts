/**
 * Пункти меню зі складу оболонки → те, що рендерить `MenuModal`.
 *
 * Чиста функція без стану: правило «що робить дотик» однакове в обох
 * оболонках, тож живе тут, а не двічі в них. Точно так само влаштований
 * футер (`buildTabBarItems` у `@wwwuabot/ui/nav`).
 *
 * @module @wwwuabot/ui/menu
 */

import type { MenuItem, ShellMenuItem } from "./types";

export interface BuildMenuItemsOptions {
  items: readonly ShellMenuItem[];
  /** Перехід у межах SPA (`useNavigate()`). */
  navigate: (href: string) => void;
  /** Дотик до пункту-заглушки: показати, що розділ ще не готовий. */
  onPlaceholder: (item: ShellMenuItem) => void;
}

export function buildMenuItems({
  items,
  navigate,
  onPlaceholder,
}: BuildMenuItemsOptions): MenuItem[] {
  return items.map((item) => {
    const href = item.href;
    // Своя дія має пріоритет: панель теми відкривається всередині модалки,
    // і адреси під нею немає.
    const onSelect = item.onSelect ?? (href ? () => navigate(href) : () => onPlaceholder(item));
    return { ...item, onSelect };
  });
}
