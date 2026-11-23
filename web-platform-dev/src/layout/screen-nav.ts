/**
 * Меню платформи з реєстру: пункт — рядок `in_menu = 1`, «тут ти» — найдовший збіг.
 *
 * @module web-platform-dev/src/layout/screen-nav
 */

import type { SideBarItem, SideBarSection } from "@wwwuabot/ui/nav";
import { SCREENS, matchScreen, type ScreenRow } from "@wwwuabot/shared/screens";

/** Шаблон адреси пункту: у меню стоять лише екрани без параметрів. */
const PATHS = new Map(SCREENS.map((screen) => [screen.key, screen.path]));

/** Чи пункт веде в поточний розділ: активний — корінь адреси. */
function isActive(key: string, activeKey: string | null): boolean {
  if (!activeKey) return false;
  return key === activeKey || activeKey.startsWith(`${key}.`);
}

/** Один список без «Ще»: пункти рівні, як і були. */
export function navFromScreens(rows: readonly ScreenRow[], pathname: string): SideBarSection[] {
  const activeKey = matchScreen(pathname)?.screen.key ?? null;

  const items: SideBarItem[] = rows
    .filter((row) => row.inMenu)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((row) => {
      const path = PATHS.get(row.key) ?? null;
      // Пункт меню без знака не малюється: знак — частина пункту, а не прикраса.
      if (!path || path.includes(":") || !row.icon) return [];
      return [
        {
          key: row.key,
          label: row.title,
          icon: row.icon,
          href: path,
          active: isActive(row.key, activeKey),
        },
      ];
    });

  return [{ key: "main", items }];
}
