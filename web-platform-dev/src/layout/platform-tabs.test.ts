import { describe, expect, it } from "vitest";
import { buildTabBarItems } from "@wwwuabot/ui/nav";
import { FAVORITES_PATH, PROFILE_PATH, SPACE_PATH } from "../app/routes";
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
  it("I, Обране, You — рівні слоти з іконкою та підписом", () => {
    const tabs = toShellTabs();
    expect(tabs.map((tab) => tab.label)).toEqual(["I", "Обране", "You"]);
    expect(tabs.map((tab) => tab.href)).toEqual([PROFILE_PATH, FAVORITES_PATH, SPACE_PATH]);
    expect(tabs.every((tab) => !tab.primary && tab.icon && tab.href)).toBe(true);
    expect(tabs[1].icon).toBe("thumbs-up");
    expect(tabs[2].icon).toBe("users");
  });

  it("власні екрани підсвічують I, а чужий контент — You", () => {
    const own = [
      "/",
      "/profile/theme",
      "/create",
      "/notes",
      "/contacts",
      "/messages",
      "/pages/7",
      "/mydate/1980",
    ];
    for (const path of own) expect(activeKeys(path), path).toEqual(["profile"]);
    for (const path of ["/space", "/space/u/7", "/public-card"]) {
      expect(activeKeys(path)).toEqual(["space"]);
    }
    expect(activeKeys(FAVORITES_PATH)).toEqual(["favorites"]);
    expect(platformSectionPath("/pages-other")).toBe(SPACE_PATH);
  });

  it("непрочитані повідомлення позначають I", () => {
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
