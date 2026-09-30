/**
 * Допуск до закритого бота — тести.
 *
 * Перевіряємо не «працює чи ні», а **з боку відмови**: помилка тут не ламає
 * нічого видимо, вона просто мовчки закриває або, навпаки, мовчки відкриває
 * бот. Тому кожен випадок — це людина, яка або бачить порожнечу, або бачить
 * контент без дозволу.
 *
 * @module bot-dev/src/modules/access/access.test
 */

import { describe, expect, it } from "vitest";
import { ACCESS_ROLE, hasBotAccess } from "./access";

describe("доступ до бота", () => {
  it("⛔ без `inviter_id` бот закритий", () => {
    expect(hasBotAccess({ inviter_id: null })).toBe(false);
    expect(hasBotAccess({})).toBe(false);
    // Старий рядок без колонки: `SELECT *` дав би саме `undefined`, і відмова
    // тут була б правильною — але тимчасом, коли колонки ще немає.
    expect(hasBotAccess({ inviter_id: undefined })).toBe(false);
    expect(hasBotAccess(null)).toBe(false);
    expect(hasBotAccess(undefined)).toBe(false);
  });

  it("запрошена людина бачить бот", () => {
    expect(hasBotAccess({ inviter_id: 4242 })).toBe(true);
  });

  it("⛔ не число — не допуск: рядок у колонці означає збій, а не запрошення", () => {
    expect(hasBotAccess({ inviter_id: "4242" })).toBe(false);
    expect(hasBotAccess({ inviter_id: 0 })).toBe(false);
    expect(hasBotAccess({ inviter_id: 1.5 })).toBe(false);
  });

  it("адміністратор не потребує запрошення — він сам запрошує", () => {
    expect(hasBotAccess({ role: ACCESS_ROLE })).toBe(true);
    expect(hasBotAccess({ role: ACCESS_ROLE, inviter_id: null })).toBe(true);
  });

  it("звичайна роль допуску не дає", () => {
    expect(hasBotAccess({ role: "user", inviter_id: null })).toBe(false);
    expect(hasBotAccess({ role: "vip", inviter_id: null })).toBe(false);
  });
});
