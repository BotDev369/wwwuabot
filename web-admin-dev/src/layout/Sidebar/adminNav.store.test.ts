/**
 * Пункти бічної навігації адмінки: «Аналітика» мусить бути в списку.
 *
 * Перевіряємо не вигляд, а **склад**: пункт, доданий у конфіг, легко втратити
 * при наступній правці сторінки, і тоді екран існує, але до нього немає входу.
 *
 * @module web-admin-dev/src/layout/Sidebar/adminNav.store.test
 */

import { describe, expect, it } from "vitest";
import { useAdminNav } from "./adminNav.store";

describe("навігація адмінки", () => {
  it("веде в «Аналітику» поруч із людьми та повідомленнями", () => {
    const sections = useAdminNav.getState().sections;
    const admin = sections.find((section) => section.title === "Адміністрування");
    const analytics = admin?.items.find((item) => item.to === "/analytics");

    expect(analytics).toEqual({ to: "/analytics", label: "Аналітика", icon: "pulse" });
  });

  it("видаляє пункт за адресою", () => {
    useAdminNav.getState().removeItem("/analytics");

    const items = useAdminNav.getState().sections.flatMap((section) => section.items);
    expect(items.some((item) => item.to === "/analytics")).toBe(false);
  });

  it("оновлює список цілком і додає пункт у секцію", () => {
    useAdminNav.getState().setSections([{ title: null, items: [] }]);
    useAdminNav.getState().addItem(0, { to: "/analytics", label: "Аналітика", icon: "pulse" });

    const [section] = useAdminNav.getState().sections;
    expect(section.items.map((item) => item.to)).toEqual(["/analytics"]);
  });
});
