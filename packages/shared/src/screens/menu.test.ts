/**
 * Групи меню тримають **усі** пункти реєстру: забутий екран не зникає з меню, а
 * ловиться тут. Тест іде від `inMenu = true`, а не від списку в JSON.
 *
 * @module @wwwuabot/shared/screens/menu.test
 */

import { describe, expect, it } from "vitest";
import { MENU_GROUPS, MENU_REST_KEY, menuGroupsFromRows } from "./menu";
import { SCREENS, type ScreenRow } from "./registry";

const ROWS: readonly ScreenRow[] = SCREENS.map((screen) => ({
  key: screen.key,
  parentKey: screen.parent,
  title: screen.title,
  icon: screen.icon,
  sortOrder: screen.sort,
  inMenu: screen.inMenu,
  texts: {},
}));

describe("тематичні групи меню", () => {
  it("кожен пункт меню стоїть рівно в одній групі", () => {
    const declared = MENU_GROUPS.flatMap((group) => group.screens);
    const inMenu = SCREENS.filter((screen) => screen.inMenu)
      .map((screen) => screen.key)
      .sort();

    expect(declared.length).toBe(new Set(declared).size);
    expect([...declared].sort()).toEqual(inMenu);
  });

  it("ключі й підписи груп не повторюються", () => {
    const keys = MENU_GROUPS.map((group) => group.key);
    const titles = MENU_GROUPS.map((group) => group.title);

    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) expect(title.trim()).not.toBe("");
  });

  it("будує групи в порядку JSON, без порожніх", () => {
    const groups = menuGroupsFromRows(ROWS);

    expect(groups.map((group) => group.key)).toEqual(MENU_GROUPS.map((group) => group.key));
    expect(groups.every((group) => group.items.length > 0)).toBe(true);
    expect(groups.flatMap((group) => group.items).length).toBe(
      SCREENS.filter((screen) => screen.inMenu).length,
    );
  });

  it("пункт поза групами не губиться: іде останнім без підпису", () => {
    const day = ROWS.find((row) => row.key === "day") as ScreenRow;
    const rows: ScreenRow[] = [
      { ...day, key: "future", title: "Майбутнє", sortOrder: 99 },
      day,
      { ...day, key: "hidden", inMenu: false },
    ];

    const groups = menuGroupsFromRows(rows);
    const last = groups[groups.length - 1];

    expect(last.key).toBe(MENU_REST_KEY);
    expect(last.title).toBeNull();
    expect(last.items.map((item) => item.key)).toEqual(["future"]);
    expect(groups.flatMap((group) => group.items.map((item) => item.key))).toEqual([
      "day",
      "future",
    ]);
  });
});
