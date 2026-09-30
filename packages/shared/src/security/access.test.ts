/**
 * Спільне правило допуску — тести.
 *
 * Перевіряємо не «працює чи ні», а **боку відмови**: помилка тут нічого не
 * ламає, вона просто мовчки закриває або, навпаки, мовчки відкриває продукт.
 *
 * @module @wwwuabot/shared/security/access.test
 */

import { describe, expect, it } from "vitest";
import { hasAccess } from "./access";

describe("допуск у продукт", () => {
  it("⛔ без `inviter_id` продукт закритий", () => {
    expect(hasAccess({ inviter_id: null })).toBe(false);
    expect(hasAccess({})).toBe(false);
    // Старий рядок без колонки: `SELECT *` дав би саме `undefined`, і відмова
    // тут була б правильною — але тимчасом, коли колонки ще немає.
    expect(hasAccess({ inviter_id: undefined })).toBe(false);
    expect(hasAccess(null)).toBe(false);
    expect(hasAccess(undefined)).toBe(false);
  });

  it("запрошена людина має доступ", () => {
    expect(hasAccess({ inviter_id: 4242 })).toBe(true);
  });

  it("⛔ не число — не допуск: рядок у колонці означає збій, а не запрошення", () => {
    expect(hasAccess({ inviter_id: "4242" })).toBe(false);
    expect(hasAccess({ inviter_id: 0 })).toBe(false);
    expect(hasAccess({ inviter_id: -7 })).toBe(false);
    expect(hasAccess({ inviter_id: 1.5 })).toBe(false);
  });

  it("⛔ роль не відкриває продукт: закритий він для всіх", () => {
    expect(hasAccess({ role: "admin" } as { inviter_id?: unknown })).toBe(false);
    expect(hasAccess({ role: "admin", inviter_id: null } as { inviter_id?: unknown })).toBe(false);
    expect(hasAccess({ role: "admin", inviter_id: 7 } as { inviter_id?: unknown })).toBe(true);
  });
});
