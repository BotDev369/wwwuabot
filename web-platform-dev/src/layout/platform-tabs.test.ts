import { describe, expect, it } from "vitest";
import { buildTabBarItems } from "@wwwuabot/ui/nav";
import { FAVORITES_PATH, PROFILE_ACCOUNT_PATH, SERVICES_PATH } from "../app/routes";
import { platformSectionPath, toShellTabs, withUnreadBadge } from "./platform-tabs";

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

describe("три розділи платформи", () => {
  it("Акаунт, Обране, Сервіси — рівні слоти з іконкою та адресою", () => {
    const tabs = toShellTabs();
    expect(tabs.map((tab) => tab.label)).toEqual(["Акаунт", "Обране", "Сервіси"]);
    expect(tabs.map((tab) => tab.href)).toEqual([
      PROFILE_ACCOUNT_PATH,
      FAVORITES_PATH,
      SERVICES_PATH,
    ]);
    expect(tabs.every((tab) => !tab.primary && tab.icon && tab.href)).toBe(true);
    expect(tabs[1].icon).toBe("thumbs-up");
    expect(tabs[2].icon).toBe("grid");
  });

  it("власні екрани підсвічують «Акаунт», сервіси — «Сервіси»", () => {
    const own = [
      "/profile",
      "/profile/theme",
      "/profile/account",
      "/create",
      "/notes",
      "/contacts",
      "/messages",
      "/pages/7",
      "/dateanalysis/1980",
    ];
    for (const path of own) expect(activeKeys(path), path).toEqual(["profile"]);
    expect(activeKeys(FAVORITES_PATH)).toEqual(["favorites"]);
    expect(activeKeys(SERVICES_PATH)).toEqual(["services"]);
    // Сторінка контенту за `slug` не належить жодному пункту смуги.
    expect(activeKeys("/public-card")).toEqual([]);
    expect(platformSectionPath("/public-card")).toBe("/public-card");
  });

  it("непрочитані повідомлення позначають «Акаунт»", () => {
    const tabs = withUnreadBadge(items(), 4);
    expect(tabs.filter((tab) => tab.badge !== undefined).map((tab) => tab.key)).toEqual([
      "profile",
    ]);
    expect(tabs[0].badge).toBe(4);
  });

  it("нуль і невалідне число не дають позначки", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(withUnreadBadge(items(), value).every((tab) => tab.badge === undefined)).toBe(true);
    }
  });
});
