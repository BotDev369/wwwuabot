/**
 * «Тут ти» в меню платформи.
 *
 * Підсвітка — не прикраса: вона каже, де людина стоїть, і рівно **один** пункт
 * може бути поточним. Два підсвічені пункти читаються як поломка, а пункт, що
 * веде не туди (колишні «Світлиця» → Оцінки), — це хибний перехід, який
 * помічаєш уже на чужому екрані.
 */

import { describe, expect, it } from "vitest";
import {
  ANALYSIS_PATH,
  ACCOUNT_PATH,
  DAY_PATH,
  ORDERS_PATH,
  SHOPS_PATH,
  TRACKERS_PATH,
  USERS_PATH,
} from "@/app/routes";
import { PLATFORM_NAV, platformNav } from "./platform-nav";

/** Ключі пунктів, які зараз підсвічені. */
function activeKeys(pathname: string): string[] {
  return platformNav(pathname)
    .flatMap((section) => section.items)
    .filter((item) => item.active)
    .map((item) => item.key);
}

describe("меню платформи", () => {
  it("«Мій день» — на своїй адресі, а корінь — вітрина без пункту", () => {
    expect(activeKeys(DAY_PATH)).toEqual(["day"]);
    // Вітрина — обкладинка продукту: у меню їй місця немає.
    expect(activeKeys("/")).toEqual([]);
  });

  it("замовлення — свій пункт, і лише він", () => {
    expect(activeKeys(ORDERS_PATH)).toEqual(["orders"]);
  });

  it("вкладки магазину не світять нічого: це сторінка всередині сценарію", () => {
    expect(activeKeys("/scenarios/7/products")).toEqual([]);
  });

  it("акаунт — «Я», і лише він", () => {
    expect(activeKeys(ACCOUNT_PATH)).toEqual(["me"]);
    expect(activeKeys(`${ACCOUNT_PATH}/`)).toEqual(["me"]);
  });

  it("«Ще» підсвічує свій пункт, а не головне меню", () => {
    expect(activeKeys(TRACKERS_PATH)).toEqual(["trackers"]);
    expect(activeKeys(`${USERS_PATH}/42`)).toEqual(["hurt"]);
  });

  it("чужа адреса не підсвічує нічого", () => {
    expect(activeKeys("/research")).toEqual([]);
  });

  it("«Аналіз» — один пункт головного меню, і в ньому тести", () => {
    // Два входи в одну фічу (окремо аналіз і окремо тести) читались як два
    // різні розділи, хоч у них спільне ядро якостей.
    const main = PLATFORM_NAV.find((section) => section.key === "main");
    expect(main?.items.map((item) => item.label)).toContain("Аналіз");

    const hrefs = PLATFORM_NAV.flatMap((section) => section.items).map((item) => item.href);
    expect(hrefs.filter((href) => href === ANALYSIS_PATH)).toHaveLength(1);
    // Окремого «Тестування» немає: тести живуть під /analysis/tests.
    expect(hrefs.filter((href) => href === "/assessments")).toHaveLength(0);
    expect(hrefs).toContain(SHOPS_PATH);
  });

  it("головна, кроки, системи й тести світять один пункт", () => {
    expect(activeKeys(SHOPS_PATH)).toEqual(["shops"]);
    expect(activeKeys(ANALYSIS_PATH)).toEqual(["analysis"]);
    expect(activeKeys(`${ANALYSIS_PATH}/person/systems`)).toEqual(["analysis"]);
    expect(activeKeys(`${ANALYSIS_PATH}/tests/bigfive`)).toEqual(["analysis"]);
  });

  it("хибних переходів немає: пункту, який нікуди не веде, не існує", () => {
    // «Світлиця» повернеться в меню тоді, коли в неї буде власний екран.
    const labels = PLATFORM_NAV.flatMap((section) => section.items).map((item) => item.label);
    expect(labels).not.toContain("Світлиця");
  });

  it("у кожного пункту є адреса й назва", () => {
    for (const section of PLATFORM_NAV) {
      expect(section.items.length).toBeGreaterThan(0);
      for (const item of section.items) {
        expect(item.href).toMatch(/^\//);
        expect(item.label.length).toBeGreaterThan(0);
      }
    }
  });
});
