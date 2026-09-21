/**
 * Склад Простору — те, що ламається мовчки.
 *
 * Тут три речі, які не видно ні в компіляторі, ні на око в коді:
 * **типова вкладка** (порожня перша вкладка зустрічає людину порожнім екраном),
 * **порядок і підписи** (вкладка без підпису не вгадується) і те, що розділ без
 * екрана не ховається мовчки, а **каже, що там буде**.
 *
 * @module web-platform-dev/src/pages/space.test
 */

import { describe, expect, it } from "vitest";
import { SPACE_PATH, SPACE_USER_PATH, spaceUserPath } from "../app/routes";
import { DEFAULT_SPACE_TAB, SPACE_TABS, spaceTab } from "./space-tabs";

describe("розділи Простору", () => {
  it("першим стоїть «Користувачі», і він же типовий", () => {
    // Люди з'являються в Просторі самі, а оголошення треба ще написати: перша
    // вкладка мусить мати що показати.
    expect(SPACE_TABS[0].key).toBe("users");
    expect(DEFAULT_SPACE_TAB).toBe(SPACE_TABS[0].key);
  });

  it("кожен розділ має підпис, і підписи не повторюються", () => {
    const labels = SPACE_TABS.map((tab) => tab.label);
    expect(labels).toEqual(["Користувачі", "Оголошення", "Сторінки"]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("розділ без екрана каже, що там буде — замість порожнечі", () => {
    for (const tab of SPACE_TABS.filter((entry) => entry.soon)) {
      expect(tab.hint, tab.key).toBeTruthy();
    }
    // А той, що вже працює, нічого не обіцяє: у нього немає `hint`.
    expect(spaceTab("users").hint).toBeUndefined();
    expect(spaceTab("users").soon).toBeUndefined();
  });

  it("невідомий ключ не валить екран", () => {
    expect(spaceTab("users").key).toBe("users");
  });
});

describe("адреси Простору", () => {
  it("складаються з констант, а не з літералів у розмітці", () => {
    expect(SPACE_PATH).toBe("/space");
    expect(SPACE_USER_PATH).toBe("/space/u");
    expect(spaceUserPath(42)).toBe("/space/u/42");
  });
});
