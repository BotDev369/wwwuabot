/**
 * Склад футера платформи: **котрий пункт несе число непрочитаних**.
 *
 * Смуга — спільний кирпичик, а склад — свій у кожної оболонки, і саме склад
 * міняють руками: переставити пункт, замінити розділ, повісити позначку не на
 * той пункт. Усе це компілюється бездоганно й видно лише на телефоні.
 *
 * @module web-platform-dev/src/layout/platform-tabs.test
 */

import { describe, expect, it } from "vitest";
import { buildTabBarItems } from "@wwwuabot/ui/nav";
import {
  MESSAGES_PATH,
  MESSAGES_TAB_KEY,
  PLATFORM_TABS,
  PROFILE_PATH,
  PROFILE_TAB_KEY,
  toShellTabs,
  withUnreadBadge,
} from "./platform-tabs";

function items(pathname = "/") {
  return buildTabBarItems({
    tabs: toShellTabs(),
    pathname,
    navigate: () => {},
    onPlaceholder: () => {},
  });
}

describe("склад футера", () => {
  it("п'ять слотів: центр — дія, крайній справа — профіль", () => {
    const tabs = toShellTabs();

    expect(tabs).toHaveLength(5);
    expect(tabs[2].primary).toBe(true);
    expect(tabs[4].key).toBe(PROFILE_TAB_KEY);
    expect(tabs[4].href).toBe(PROFILE_PATH);
  });

  it("«Повідомлення» ведуть на свій екран, а не в GalyaShop", () => {
    const messages = toShellTabs().find((tab) => tab.key === MESSAGES_TAB_KEY);

    expect(messages?.href).toBe(MESSAGES_PATH);
    // Магазин лишається контентом у базі — з футера він прибраний повністю.
    expect(toShellTabs().some((tab) => tab.key === "galyashop")).toBe(false);
    expect(PLATFORM_TABS.every((tab) => tab.label !== "GalyaShop")).toBe(true);
  });

  it("активним стає саме пункт повідомлень", () => {
    const active = items(MESSAGES_PATH).filter((item) => item.active);

    expect(active).toHaveLength(1);
    expect(active[0].key).toBe(MESSAGES_TAB_KEY);
  });
});

describe("число непрочитаних", () => {
  it("позначку несе лише пункт повідомлень", () => {
    const badged = withUnreadBadge(items(), 4);

    expect(badged.filter((item) => item.badge !== undefined).map((item) => item.key)).toEqual([
      MESSAGES_TAB_KEY,
    ]);
    expect(badged.find((item) => item.key === MESSAGES_TAB_KEY)?.badge).toBe(4);
  });

  it("нуль і сміття не дають позначки — інакше на іконці висів би нуль", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(withUnreadBadge(items(), value).every((item) => item.badge === undefined)).toBe(true);
    }
  });

  it("пункти без числа лишаються тими самими", () => {
    const plain = items();
    const badged = withUnreadBadge(plain, 2);

    expect(badged.map((item) => item.key)).toEqual(plain.map((item) => item.key));
    expect(badged.find((item) => item.key === MESSAGES_TAB_KEY)?.label).toBe("Повідомлення");
  });
});
