/**
 * Склад футера платформи: **котрий пункт несе число непрочитаних**.
 *
 * Смуга — спільний кирпичик, а склад — свій у кожної оболонки, і саме склад
 * міняють руками: переставити пункт, замінити розділ, повісити позначку не на
 * той пункт, позбавити пункт адреси. Усе це компілюється бездоганно й видно
 * лише на телефоні.
 *
 * Сторож адрес тут головний: доки «+» відкривав поверхню, виняток з правила
 * «слот — це місце» жив саме в ньому, і повернути його (разом із втраченими
 * історією, «назад» і посиланням) дуже легко.
 *
 * @module web-platform-dev/src/layout/platform-tabs.test
 */

import { describe, expect, it } from "vitest";
import { buildTabBarItems } from "@wwwuabot/ui/nav";
import { CREATE_PATH, MESSAGES_PATH, PROFILE_PATH, SPACE_PATH } from "../app/routes";
import { MESSAGES_TAB_KEY, PLATFORM_TABS, toShellTabs, withUnreadBadge } from "./platform-tabs";

function items(pathname = "/") {
  return buildTabBarItems({
    tabs: toShellTabs(),
    pathname,
    navigate: () => {},
    onPlaceholder: () => {},
  });
}

describe("склад футера", () => {
  it("п'ять слотів: у центрі — «Створити», крайній справа — профіль", () => {
    const tabs = toShellTabs();

    expect(tabs).toHaveLength(5);
    expect(tabs[2].key).toBe("create");
    expect(tabs[2].primary).toBe(true);
    expect(tabs[4].key).toBe("profile");
    expect(tabs[4].href).toBe(PROFILE_PATH);
  });

  it("кожен слот веде на адресу — винятків немає", () => {
    // Слот без адреси означав би, що дотик відкриває поверхню, а не веде на
    // екран: тоді футер не має ні історії, ні «назад», ні посилання, яке можна
    // надіслати. Саме так було з «+» — і саме тому він тепер теж адреса.
    const tabs = toShellTabs();
    expect(tabs.filter((tab) => !tab.href).map((tab) => tab.key)).toEqual([]);
    expect(tabs.find((tab) => tab.key === "space")?.href).toBe(SPACE_PATH);
    // Своєї дії (`onSelect`) немає ні в кого: усе, що робить слот, — це перехід.
    expect(tabs.every((tab) => tab.onSelect === undefined)).toBe(true);
  });

  it("«+» веде в хаб «Створити», а не відкриває поверхню", () => {
    // Створення живе на своїх екранах (`?new=1`), а слот відкриває список
    // входів: інакше дотик не має адреси, а шість власних екранів людини
    // ховаються в хабі профілю, де їх не шукають.
    const create = PLATFORM_TABS[2];
    expect([create.key, create.label, create.icon]).toEqual(["create", "Створити", "plus"]);
    expect(create.to).toBe(CREATE_PATH);
    expect(toShellTabs()[2].href).toBe("/create");
  });

  it("хаб «Створити» підсвічує свій слот, як і будь-який розділ", () => {
    const active = items(CREATE_PATH).filter((item) => item.active);
    expect(active.map((item) => item.key)).toEqual(["create"]);
  });

  it("другий слот — «Простір» зі своїм знаком і парою для вибраного стану", () => {
    // Знак у футері не `globe`: глобус уже означає «Локації» в хабі профілю,
    // а один гліф на дві різні речі змушує читати підпис. Пара `feed` /
    // `feed-solid` — той самий знак контуром і фарбою, як у решти слотів.
    const space = PLATFORM_TABS[1];
    expect([space.key, space.label, space.icon, space.iconActive]).toEqual([
      "space",
      "Простір",
      "feed",
      "feed-solid",
    ]);
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
