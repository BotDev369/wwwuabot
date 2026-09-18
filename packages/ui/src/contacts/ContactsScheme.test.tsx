/**
 * Схема залучених — що вона каже про гілку.
 *
 * Тут перевіряється те, чого не видно в числах: **лійка без дірок** (той, хто
 * зайшов на платформу, порахований і в «у боті»), **другий рівень з'являється
 * лише тоді, коли він є** («залучив(ла) ще 0» — рядок заради нуля) і **стадія
 * в рядку названа словом** — саме різниця між «у боті» та «приєднався» і є
 * те, заради чого екран існує, а за кольором її не видно.
 *
 * Окремо — **близнюки**: два записи про одну людину мусять бути підписані
 * («та сама людина, що …») і пояснені під числами. Мовчазні близнюки — це
 * екран, на якому «запрошено 2» стоїть над «у боті 1», і виглядає це як
 * поламаний рахунок.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики.
 */

/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Contact } from "@wwwuabot/shared/contacts";
import { ContactsScheme } from "./ContactsScheme";

const BOT = "2026-09-18 03:45:00";
const PLATFORM = "2026-09-18 03:50:00";

/** Контакт-фікстура: усе, крім переданого, — «щойно завели». */
function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    name: "Карас",
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
  return renderToStaticMarkup(<ContactsScheme contacts={contacts} />);
}

describe("ContactsScheme", () => {
  it("показує три числа — запрошено, у боті, приєднались", () => {
    const html = render([
      contact({
        id: 1,
        name: "Приєднався",
        code: "inv-000001",
        joinedUserId: 555,
        joinedBotAt: BOT,
        joinedPlatformAt: PLATFORM,
      }),
      contact({ id: 2, name: "У боті", code: "inv-000002", joinedUserId: 556, joinedBotAt: BOT }),
      contact({ id: 3, name: "Олег", code: "inv-000003" }),
      contact({ id: 4, name: "Просто знайомий" }),
    ]);

    expect(html).toContain("Запрошено");
    expect(html).toContain("У боті");
    expect(html).toContain("Приєднались");
    // 3 лінки, 2 зайшли в бота, 1 дійшов до платформи.
    const numbers = [...html.matchAll(/<dd>(\d+)<\/dd>/g)].map((match) => match[1]);
    expect(numbers).toEqual(["3", "2", "1"]);
  });

  it("гілка починається з власника, а не з першого контакту", () => {
    expect(render([contact()])).toContain("wb-contact-scheme-root");
  });

  it("стадія називається словом: часткове приєднання видно в рядку", () => {
    const html = render([contact({ joinedUserId: 555, joinedBotAt: BOT })]);

    expect(html).toContain("зайшов у бота");
    expect(html).toContain("wb-contact-scheme-stage");
  });

  it("⛔ повному приєднанню стадію не повторюють: це шум", () => {
    const html = render([
      contact({ joinedUserId: 555, joinedBotAt: BOT, joinedPlatformAt: PLATFORM }),
    ]);

    expect(html).not.toContain("wb-contact-scheme-stage");
    expect(html).not.toContain("приєднався");
  });

  it("другий рівень показується лише тоді, коли він є", () => {
    const withNested = render([contact({ joinedUserId: 555, joinedBotAt: BOT, invitedCount: 3 })]);
    const without = render([contact({ joinedUserId: 555, joinedBotAt: BOT, invitedCount: 0 })]);

    expect(withNested).toContain("залучив(ла) ще 3");
    expect(withNested).toContain("Ваші контакти залучили ще 3");
    expect(without).not.toContain("залучив");
    expect(without).not.toContain("wb-contact-nested-total");
  });

  it("ім'я контакту стоїть окремо від хендла — підпис і підпис", () => {
    const html = render([contact({ username: "karas", joinedUserId: 555, joinedBotAt: BOT })]);

    expect(html).toContain("wb-contact-scheme-node");
    expect(html).toContain("Карас");
    expect(html).toContain("wb-contact-scheme-name");
    expect(html).toContain("@karas");
  });

  it("другий запис про ту саму людину підписаний, а перший — ні", () => {
    const html = render([
      contact({ id: 1, name: "Карась 2", joinedUserId: 555, joinedBotAt: BOT }),
      contact({ id: 2, name: "Карась молодший", joinedUserId: 555, joinedBotAt: BOT }),
    ]);

    expect(html).toContain("та сама людина, що «Карась 2»");
    // Підпис один: перший запис людини — він сам собі не близнюк.
    expect([...html.matchAll(/wb-contact-scheme-twin/g)]).toHaveLength(1);
  });

  it("без близнюків підпису й пояснення немає", () => {
    const html = render([
      contact({ id: 1, joinedUserId: 555, joinedBotAt: BOT }),
      contact({ id: 2, joinedUserId: 556, joinedBotAt: BOT }),
    ]);

    expect(html).not.toContain("та сама людина");
    expect(html).not.toContain("wb-contact-twins-note");
  });

  it("пояснює, чому в лійці менше, ніж запрошень", () => {
    const html = render([
      contact({ id: 1, code: "inv-000001", joinedUserId: 555, joinedBotAt: BOT }),
      contact({ id: 2, code: "inv-000002", joinedUserId: 555, joinedBotAt: BOT }),
    ]);

    // Запрошено 2, у боті 1 — і різниця названа вголос, а не лишена власнику.
    expect(html).toContain("wb-contact-twins-note");
    expect(html).toContain("Ще 1 запис про тих самих людей");
    const numbers = [...html.matchAll(/<dd>(\d+)<\/dd>/g)].map((match) => match[1]);
    expect(numbers).toEqual(["2", "1", "0"]);
  });
});
