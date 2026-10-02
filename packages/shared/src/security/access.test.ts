/**
 * Спільне правило допуску — тести.
 *
 * Перевіряємо не «працює чи ні», а **боку відмови**: помилка тут нічого не
 * ламає, вона просто мовчки закриває або, навпаки, мовчки відкриває продукт.
 *
 * @module @wwwuabot/shared/security/access.test
 */

import { describe, expect, it } from "vitest";
import { hasAccess, parseOwnerTelegramId } from "./access";

const OWNER = "372567448";

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

  it("власник із секрету має доступ без запрошення", () => {
    expect(hasAccess({ user_id: 372567448, inviter_id: null }, OWNER)).toBe(true);
    expect(hasAccess({ user_id: 372567448 }, OWNER)).toBe(true);
  });

  it("⛔ секрет власника не відкриває інших", () => {
    expect(hasAccess({ user_id: 555, inviter_id: null }, OWNER)).toBe(false);
    expect(hasAccess({ user_id: 372567449, inviter_id: null }, OWNER)).toBe(false);
    // Рядок у колонці — збій, а не збіг: власник у базі має ціле число.
    expect(hasAccess({ user_id: "372567448", inviter_id: null }, OWNER)).toBe(false);
  });

  it("⛔ без секрету винячку немає: продукт лишається закритим", () => {
    const owner = { user_id: 372567448, inviter_id: null };
    expect(hasAccess(owner)).toBe(false);
    expect(hasAccess(owner, "")).toBe(false);
    expect(hasAccess(owner, "   ")).toBe(false);
    expect(hasAccess(owner, "abc")).toBe(false);
    expect(hasAccess(owner, "372567448,555")).toBe(false);
    expect(hasAccess(owner, "-372567448")).toBe(false);
  });

  it("розбір секрету: лише ціле Telegram-id", () => {
    expect(parseOwnerTelegramId("372567448")).toBe(372567448);
    expect(parseOwnerTelegramId("  372567448 ")).toBe(372567448);
    expect(parseOwnerTelegramId("")).toBeNull();
    expect(parseOwnerTelegramId("abc")).toBeNull();
    expect(parseOwnerTelegramId("1e3")).toBeNull();
    expect(parseOwnerTelegramId(undefined)).toBeNull();
    expect(parseOwnerTelegramId(null)).toBeNull();
  });
});
