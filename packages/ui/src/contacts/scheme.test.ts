/**
 * Підсумки схеми — числа, які легко порахувати неправильно.
 *
 * Найтонше тут — **«запрошено» проти «прийшло»**. Контакт може жити без лінка
 * (власник просто знає цю людину), і тоді він не «очікує»: чекати нічого, бо
 * нічого не надіслано. Тому `waiting` рахує саме контакти з кодом, а не
 * `total - joined`.
 *
 * Друге тонке — глибина гілки: це сума того, що закріпили **контакти**. Якщо
 * колись злити її з «приєднались», схема перестане показувати головне, заради
 * чого існує: що гілка продовжується не тобою.
 */

import { describe, expect, it } from "vitest";
import type { Contact } from "@wwwuabot/shared/contacts";
import { contactStats } from "./scheme";

/** Контакт-фікстура: контакт передають лише тоді, коли він справді є. */
function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    name: "Контакт",
    username: null,
    telegramUserId: null,
    tags: [],
    notes: "",
    code: null,
    deepLink: null,
    joinedAt: null,
    createdAt: "2026-09-18 03:40:00",
    updatedAt: "2026-09-18 03:40:00",
    invitedCount: 0,
    ...over,
  };
}

describe("підсумки схеми", () => {
  it("порожній список — це нулі, а не порожні поля", () => {
    expect(contactStats([])).toEqual({ total: 0, linked: 0, waiting: 0, joined: 0, nested: 0 });
  });

  it("лінк є — запрошено; Telegram-id є — прийшло", () => {
    const stats = contactStats([
      contact({ id: 1, name: "Заведений без лінка" }),
      contact({ id: 2, name: "Запрошений", code: "inv-8f3k2q" }),
      contact({ id: 3, name: "Приєднався", code: "inv-8f3k2r", telegramUserId: 555 }),
    ]);

    expect(stats.total).toBe(3);
    expect(stats.linked).toBe(2);
    expect(stats.waiting).toBe(1);
    expect(stats.joined).toBe(1);
  });

  it("⛔ контакт без лінка не вважається тим, хто «очікує»", () => {
    // Інакше «очікують» росло б від кожного, кого власник просто заніс у
    // довідник, і число читалося б як обіцянка, якої ніхто не давав.
    expect(contactStats([contact()]).waiting).toBe(0);
  });

  it("другий рівень — сума того, що закріпили контакти, а не власник", () => {
    const stats = contactStats([
      contact({ id: 1, telegramUserId: 1, code: "inv-000001", invitedCount: 2 }),
      contact({ id: 2, telegramUserId: 2, code: "inv-000002", invitedCount: 3 }),
      // Запрошений, але ще не прийшов: глибини в нього немає.
      contact({ id: 3, code: "inv-000003" }),
    ]);

    expect(stats.nested).toBe(5);
  });
});
