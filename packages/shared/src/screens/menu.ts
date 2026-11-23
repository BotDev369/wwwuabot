/**
 * Тематичні групи меню: підпис і склад — у `menu-groups.json`, а не в коді.
 *
 * Група не є екраном: адреси й крохи її не бачать. Пункт поза групами не
 * губиться — він іде останнім у групі без підпису. Правила — `docs/SCREEN_TEXTS.md`.
 *
 * @module @wwwuabot/shared/screens
 */

import menuGroups from "./menu-groups.json";
import type { ScreenRow } from "./registry";

/** Рядок `menu-groups.json`: ключ, підпис і склад групи. */
export interface MenuGroupDef {
  key: string;
  title: string;
  screens: readonly string[];
}

/** Група з резолвнутими екранами; `title: null` — залишок поза групами. */
export interface MenuGroup {
  key: string;
  title: string | null;
  items: readonly ScreenRow[];
}

/** Групи в тому порядку, у якому їх читають меню й головна. */
export const MENU_GROUPS: readonly MenuGroupDef[] = menuGroups;

/** Ключ групи-залишку: пункти, яких ще немає в жодній групі. */
export const MENU_REST_KEY = "more";

/**
 * Групи для рядків реєстру. Порожні групи не малюються, пункт поза меню не
 * потрапляє нікуди, залишок іде останнім у порядку `sort_order`.
 */
export function menuGroupsFromRows(rows: readonly ScreenRow[]): MenuGroup[] {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const placed = new Set<string>();
  const groups: MenuGroup[] = [];

  for (const group of MENU_GROUPS) {
    const items = group.screens.flatMap((key) => {
      const row = byKey.get(key);
      if (!row || !row.inMenu) return [];
      placed.add(key);
      return [row];
    });
    if (items.length > 0) groups.push({ key: group.key, title: group.title, items });
  }

  const rest = rows
    .filter((row) => row.inMenu && !placed.has(row.key))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (rest.length > 0) groups.push({ key: MENU_REST_KEY, title: null, items: rest });

  return groups;
}
