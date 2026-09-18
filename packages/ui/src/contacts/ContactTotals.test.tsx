/**
 * Підсумкові числа контактів — лійка «запрошено → у боті → на платформі».
 *
 * Перевіряємо найтонше, бо саме тут цифра легко стає неправдою:
 *
 *   - числа рахують **людей, а не картки**: два лінки на одну людину дають два
 *     записи й **одну** людину в лійці, а під числами стоїть пояснення (без
 *     нього «2 → 1» читається як поламаний рахунок, хоч це правда);
 *   - той, хто на платформі, порахований **і в «у боті»**: людина не може
 *     відкрити Mini App, не зайшовши в бота, і лійка без цього мала б дірку;
 *   - контакт **без лінка** в «запрошено» не рахується: чекати нічого, бо
 *     нічого не надіслано.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку
 * рендерить React, а не дотики.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Contact } from "@wwwuabot/shared/contacts";
import { ContactTotals } from "./ContactTotals";

/** Контакт-фікстура: усе, крім переданого, — «щойно завели». */
function contact(id: number, over: Partial<Contact> = {}): Contact {
  return {
    id,
    name: `Контакт ${id}`,
    username: null,
    tags: [],
    notes: "",
    code: null,
    deepLink: null,
    joinedUserId: null,
    joinedBotAt: null,
    joinedPlatformAt: null,
    createdAt: "2026-09-18 03:40:00",
    updatedAt: "2026-09-18 03:40:00",
    invitedCount: 0,
    ...over,
  };
}

function render(contacts: Contact[]): string {
  return renderToStaticMarkup(<ContactTotals contacts={contacts} />);
}

/** Числа — у тому порядку, у якому вони стоять на екрані. */
function numbers(html: string): string[] {
  return [...html.matchAll(/<dd>(\d+)<\/dd>/g)].map((match) => match[1]);
}

describe("ContactTotals", () => {
  it("називає три кроки лійки своїми словами", () => {
    const html = render([contact(1)]);

    expect(html).toContain("Запрошено");
    expect(html).toContain("У боті");
    expect(html).toContain("На платформі");
    expect(numbers(html)).toEqual(["0", "0", "0"]);
  });

  it("контакт без лінка в «запрошено» не рахується", () => {
    expect(numbers(render([contact(1), contact(2, { code: "inv-8f3k2q" })]))).toEqual([
      "1",
      "0",
      "0",
    ]);
  });

  it("той, хто на платформі, порахований і в «у боті» — лійка без дірок", () => {
    const html = render([
      contact(1, {
        joinedUserId: 555,
        joinedBotAt: "2026-09-18 03:45:00",
        joinedPlatformAt: "2026-09-18 03:50:00",
      }),
    ]);

    // «Запрошено» теж 1: людина пройшла через лінк, хоч його коду в рядку вже
    // немає — стадія дивиться з кінця, а не збирає прапорці.
    expect(numbers(html)).toEqual(["1", "1", "1"]);
  });

  it("числа рахують людей, а не картки", () => {
    const html = render([
      contact(1, { code: "inv-1", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
      contact(2, { code: "inv-2", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    expect(numbers(html)).toEqual(["2", "1", "0"]);
    // Без пояснення «2 → 1» читалось би як поламаний рахунок.
    expect(html).toContain("Ще 1 запис про тих самих людей");
  });

  it("різні люди з однаковими іменами не зливаються в одну", () => {
    const html = render([
      contact(1, { joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
      contact(2, { joinedUserId: 556, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    expect(numbers(html)).toEqual(["2", "2", "0"]);
    expect(html).not.toContain("про тих самих людей");
  });

  it("коли дублів немає — жодного рядка-пояснення", () => {
    expect(
      render([contact(1, { joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" })]),
    ).not.toContain("про тих самих людей");
  });
});
