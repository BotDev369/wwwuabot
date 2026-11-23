/**
 * Меню платформи з реєстру: тематичні групи, а «тут ти» — найдовший збіг.
 *
 * Групи приходять із `@wwwuabot/shared/screens`, тож головна й сайдбар
 * показують той самий поділ, а не два списки, які розійдуться першою правкою.
 *
 * @module web-platform-dev/src/layout/screen-nav
 */

import type { IconName } from "@wwwuabot/shared";
import type { SideBarItem, SideBarSection } from "@wwwuabot/ui/nav";
import { SCREENS, matchScreen, menuGroupsFromRows, type ScreenRow } from "@wwwuabot/shared/screens";

/** Шаблон адреси пункту: у меню стоять лише екрани без параметрів. */
const PATHS = new Map(SCREENS.map((screen) => [screen.key, screen.path]));

/** Чи пункт веде в поточний розділ: активний — корінь адреси. */
function isActive(key: string, activeKey: string | null): boolean {
  if (!activeKey) return false;
  return key === activeKey || activeKey.startsWith(`${key}.`);
}

/** Пункт меню після реєстру: усе, що треба, щоб намалювати рядок. */
export interface PlatformNavItem {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  active: boolean;
}

/** Тематична група меню: підпис і пункти в порядку реєстру. */
export interface PlatformNavGroup {
  key: string;
  title: string | null;
  items: PlatformNavItem[];
}

/**
 * Меню для адреси: групи з реєстру, пункти з назвою, знаком і шляхом.
 *
 * Пункт без адреси, без параметра чи без знака не малюється: знак — частина
 * пункту, а не прикраса, а параметризований екран не має пункту меню.
 */
export function platformNav(rows: readonly ScreenRow[], pathname: string): PlatformNavGroup[] {
  const activeKey = matchScreen(pathname)?.screen.key ?? null;

  return menuGroupsFromRows(rows)
    .map((group) => ({
      key: group.key,
      title: group.title,
      items: group.items.flatMap((row): PlatformNavItem[] => {
        const path = PATHS.get(row.key) ?? null;
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
      }),
    }))
    .filter((group) => group.items.length > 0);
}

/** Ті самі групи у формі сайдбара: одна дорога для головної й меню. */
export function navFromScreens(rows: readonly ScreenRow[], pathname: string): SideBarSection[] {
  return platformNav(rows, pathname).map((group): SideBarSection => {
    const items: SideBarItem[] = group.items;
    return group.title === null
      ? { key: group.key, items }
      : { key: group.key, title: group.title, items };
  });
}
