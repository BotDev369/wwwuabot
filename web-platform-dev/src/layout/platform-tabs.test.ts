import { describe, expect, it } from "vitest";
import { buildTabBarItems } from "@wwwuabot/ui/nav";
import {
  ACCOUNT_PATH,
  ASSESSMENTS_PATH,
  FAVORITES_PATH,
  SERVICES_PATH,
  TRACKERS_PATH,
} from "../app/routes";
import {
  FAVORITES_TAB_KEY,
  UNREAD_TAB_KEY,
  platformSectionPath,
  toShellTabs,
  withBadges,
} from "./platform-tabs";

function items(pathname = "/") {
  return buildTabBarItems({
    tabs: toShellTabs(),
    pathname: platformSectionPath(pathname),
    navigate: () => {},
    onPlaceholder: () => {},
  });
}

function activeKeys(pathname: string) {
  return items(pathname)
    .filter((tab) => tab.active)
    .map((tab) => tab.key);
}

describe("п'ять розділів платформи", () => {
  it("Акаунт, Обране, Трекери, Розвиток, Сервіси — рівні слоти з іконкою та адресою", () => {
    const tabs = toShellTabs();
    expect(tabs.map((tab) => tab.label)).toEqual([
      "Акаунт",
      "Обране",
      "Трекери",
      "Розвиток",
      "Сервіси",
    ]);
    expect(tabs.map((tab) => tab.href)).toEqual([
      ACCOUNT_PATH,
      FAVORITES_PATH,
      TRACKERS_PATH,
      ASSESSMENTS_PATH,
      SERVICES_PATH,
    ]);
    expect(tabs.every((tab) => !tab.primary && tab.icon && tab.href)).toBe(true);
    expect(tabs[1].icon).toBe("thumbs-up");
    expect(tabs[2].icon).toBe("bar-chart");
    expect(tabs[3].icon).toBe("growth");
    expect(tabs[4].icon).toBe("grid");
  });

  it("власні екрани підсвічують «Акаунт», сервіси — «Сервіси»", () => {
    const own = ["/", ACCOUNT_PATH, "/orders", "/notes", "/contacts", "/messages", "/pages/7"];
    for (const path of own) expect(activeKeys(path), path).toEqual(["account"]);
    expect(activeKeys(FAVORITES_PATH)).toEqual(["favorites"]);
    expect(activeKeys(TRACKERS_PATH)).toEqual(["trackers"]);
    expect(activeKeys(`${TRACKERS_PATH}/4`)).toEqual(["trackers"]);
    expect(activeKeys(ASSESSMENTS_PATH)).toEqual(["assessments"]);
    expect(activeKeys(`${ASSESSMENTS_PATH}/who5`)).toEqual(["assessments"]);
    // Аналіз дат — частина «Розвитку», а не акаунта.
    expect(activeKeys("/dateanalysis/1980")).toEqual(["assessments"]);
    expect(activeKeys(SERVICES_PATH)).toEqual(["services"]);
    // Сторінка контенту за `slug` не належить жодному пункту смуги.
    expect(activeKeys("/public-card")).toEqual([]);
    expect(platformSectionPath("/public-card")).toBe("/public-card");
  });

  it("непрочитані позначають «Акаунт», обране — свій пункт", () => {
    const tabs = withBadges(items(), { [UNREAD_TAB_KEY]: 4, [FAVORITES_TAB_KEY]: 1 });
    expect(tabs.filter((tab) => tab.badge !== undefined).map((tab) => tab.key)).toEqual([
      "account",
      "favorites",
    ]);
    expect(tabs[0].badge).toBe(4);
    expect(tabs[1].badge).toBe(1);
  });

  it("нуль і невалідне число не дають позначки", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const tabs = withBadges(items(), { [UNREAD_TAB_KEY]: value, [FAVORITES_TAB_KEY]: value });
      expect(tabs.every((tab) => tab.badge === undefined)).toBe(true);
    }
  });

  it("число без свого пункту нікого не позначає", () => {
    const tabs = withBadges(items(), { unknown: 3 });
    expect(tabs.every((tab) => tab.badge === undefined)).toBe(true);
  });
});
