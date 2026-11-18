/**
 * Каталог ролей: класи ролі збираються з її ознак, а категорія фільтрує список.
 *
 * @module packages/shared/src/ui/role-catalog.test
 */

import { describe, expect, it } from "vitest";
import { ROLE_CATEGORIES, STYLE_ROLES, roleClass, rolesIn } from "./role-catalog";

describe("каталог ролей", () => {
  it("ставить кожній ролі класи тону, розміру, відступу, руху й радіуса", () => {
    for (const role of STYLE_ROLES) {
      expect(roleClass(role)).toBe(
        `sc-role sc-tone-${role.tone} sc-size-${role.size} sc-gap-${role.space} sc-motion-${role.motion} sc-radius-${role.radius}`,
      );
    }
  });

  it("має підпис і пояснення в кожної ролі — слова приходять із JSON", () => {
    for (const role of STYLE_ROLES) {
      expect(role.label.trim()).not.toBe("");
      expect(role.note.trim()).not.toBe("");
    }
  });

  it("не має двох ролей з одним ім'ям", () => {
    const ids = STYLE_ROLES.map((role) => role.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("віддає ролі лише своєї категорії й не лишає категорію порожньою", () => {
    for (const category of ROLE_CATEGORIES) {
      const roles = rolesIn(category.id);
      expect(roles.length).toBeGreaterThan(0);
      expect(roles.every((role) => role.category === category.id)).toBe(true);
    }
  });
});
