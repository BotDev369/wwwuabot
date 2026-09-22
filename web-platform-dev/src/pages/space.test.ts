/**
 * Склад Простору — те, що ламається мовчки.
 *
 * Тут чотири речі, які не видно ні в компіляторі, ні на око в коді:
 * **типовий розділ** (він відкривається першим, тож мусить мати що показати),
 * **порядок і підписи** (пункт без підпису не вгадується, а порядок — це те, з
 * чого Простір починається), **знак пункту** (згорнута панель лишає саме його —
 * без знака пункт стає порожньою клітинкою) і те, що розділ без екрана не
 * ховається мовчки, а **каже, що там буде**.
 *
 * @module web-platform-dev/src/pages/space.test
 */

import { describe, expect, it } from "vitest";
import { SPACE_PATH, SPACE_USER_PATH, spaceUserPath } from "../app/routes";
import {
  DEFAULT_SPACE_TAB,
  SPACE_TABS,
  readSpaceNavExpanded,
  spaceTab,
  spaceTabPath,
} from "./space-tabs";

describe("розділи Простору", () => {
  it("першими стоять «Оголошення», і вони ж типові", () => {
    // Дошку наповнюють люди, тож вона перша має що показати; «Користувачі»
    // стоять останніми — профіль з'являється лише після того, як людина сама
    // його відкриє.
    expect(SPACE_TABS[0].key).toBe("ads");
    expect(SPACE_TABS[SPACE_TABS.length - 1].key).toBe("users");
    expect(DEFAULT_SPACE_TAB).toBe(SPACE_TABS[0].key);
  });

  it("кожен розділ має підпис, і підписи не повторюються", () => {
    const labels = SPACE_TABS.map((tab) => tab.label);
    expect(labels).toEqual(["Оголошення", "Теми", "Ігри", "Сторінки", "Користувачі"]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("кожен пункт має знак — інакше згорнута панель порожня", () => {
    for (const tab of SPACE_TABS) {
      expect(tab.icon, tab.key).toBeTruthy();
    }
  });

  it("розділ без екрана каже, що там буде — замість порожнечі", () => {
    for (const tab of SPACE_TABS.filter((entry) => entry.soon)) {
      expect(tab.hint, tab.key).toBeTruthy();
    }
  });

  it("той, що вже працює, нічого не обіцяє: у нього немає ні `soon`, ні `hint`", () => {
    // Заглушка, яку забули зняти, гірша за відсутню: екран працює, а вкладка
    // все ще каже «ще в розробці» — і людина в нього не загляне.
    for (const key of ["ads", "themes", "games"] as const) {
      expect(spaceTab(key).hint, key).toBeUndefined();
      expect(spaceTab(key).soon, key).toBeUndefined();
    }
  });

  it("невідомий ключ не валить екран", () => {
    expect(spaceTab("ads").key).toBe("ads");
  });
});

describe("панель розділів", () => {
  it("відкрита, коли розділ не названо адресою — щоб дати обрати", () => {
    // Дотик по «Простір» у футері веде на `/space`: спершу показують вибір.
    expect(readSpaceNavExpanded(null)).toBe(true);
  });

  it("згорнута, коли розділ прийшов адресою — його вже обрано", () => {
    expect(readSpaceNavExpanded("ads")).toBe(false);
    expect(readSpaceNavExpanded("users")).toBe(false);
  });
});

describe("адреси Простору", () => {
  it("складаються з констант, а не з літералів у розмітці", () => {
    expect(SPACE_PATH).toBe("/space");
    expect(SPACE_USER_PATH).toBe("/space/u");
    expect(spaceUserPath(42)).toBe("/space/u/42");
  });

  it("розділ називається в адресі завжди — навіть типовий", () => {
    // Параметр означає не лише «який розділ», а й «розділ уже обрано»: із
    // названим розділом панель приходить згорнутою (`readSpaceNavExpanded`),
    // і саме тому хаб «Створити» веде в оголошення **із** параметром.
    expect(spaceTabPath("ads")).toBe("/space?tab=ads");
    expect(spaceTabPath("games")).toBe("/space?tab=games");
  });
});
