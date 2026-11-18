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
  ASSESSMENTS_PATH,
  ACCOUNT_PATH,
  DAY_PATH,
  PAGES_PATH,
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

  it("сторінка за адресою світить «Базар»", () => {
    expect(activeKeys(PAGES_PATH)).toEqual(["bazar"]);
    // Глибше за список — та сама сторінка: `/pages/7` не має світити двоє.
    expect(activeKeys("/pages/7")).toEqual(["bazar"]);
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

  it("⛔ хибних переходів немає: жоден пункт не веде на Оцінки", () => {
    const hrefs = PLATFORM_NAV.flatMap((section) => section.items).map((item) => item.href);
    expect(hrefs).not.toContain(ASSESSMENTS_PATH);
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
