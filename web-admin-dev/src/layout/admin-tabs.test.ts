import { describe, it, expect } from "vitest";
import { isTabActive } from "@wwwuabot/ui/nav";
import { ADMIN_TABS } from "./admin-tabs";

describe("склад футера адмінки", () => {
  it("п'ять рівних слотів", () => {
    expect(ADMIN_TABS).toHaveLength(5);
  });

  it("«+» стоїть по центру й лишається єдиною заглушкою", () => {
    const middle = ADMIN_TABS[2];
    expect(middle.primary).toBe(true);
    expect(middle.icon).toBe("plus");
    expect(middle.href).toBeUndefined();
    expect(ADMIN_TABS.filter((tab) => !tab.href).map((tab) => tab.key)).toEqual(["create"]);
  });

  it("профіль має екран, а не заглушку", () => {
    const profile = ADMIN_TABS.find((tab) => tab.key === "profile");
    expect(profile?.href).toBe("/profile");
  });

  it("кожен живий пункт має іконку вибраного стану", () => {
    for (const tab of ADMIN_TABS) {
      if (!tab.href) continue;
      expect(tab.iconActive, tab.key).toBeTruthy();
    }
  });

  it("профіль підсвічується саме на своєму маршруті", () => {
    expect(isTabActive("/profile", "/profile")).toBe(true);
    expect(isTabActive("/users", "/profile")).toBe(false);
  });
});
