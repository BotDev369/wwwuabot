/**
 * Схема залучених — що вона каже про гілку.
 *
 * Тут перевіряється те, чого не видно в числах: другий рівень з'являється
 * **лише тоді, коли він є**. «Залучив(ла) ще 0» — це рядок заради нуля, і саме
 * такий рядок робить список шумним.
 *
 * Друге — **стан замість порожнього імені**: контакт, який прийшов за лінком,
 * показує своє ім'я (воно приходить із профілю), а той, хто ще не прийшов, —
 * свій стан словом. Порожній рядок у схемі читався б як зламана розмітка.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, а не дотики.
 */

/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Contact } from "@wwwuabot/shared/contacts";
import { ContactsScheme } from "./ContactsScheme";

/** Контакт-фікстура: приєднаний передають через `telegramUserId` + `joinedAt`. */
function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    name: "Карас",
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

function render(contacts: Contact[]): string {
  return renderToStaticMarkup(<ContactsScheme contacts={contacts} />);
}

describe("ContactsScheme", () => {
  it("показує три числа — контактів, запрошено, приєднались", () => {
    const html = render([
      contact({ id: 1, code: "inv-000001", telegramUserId: 555, joinedAt: "2026-09-18 03:40:00" }),
      contact({ id: 2, name: "Олег", code: "inv-000002" }),
      contact({ id: 3, name: "Просто знайомий" }),
    ]);

    expect(html).toContain("Контактів");
    expect(html).toContain("Запрошено");
    expect(html).toContain("Приєднались");
    // 3 контакти, 2 з лінком, 1 людина прийшла.
    const numbers = [...html.matchAll(/<dd>(\d+)<\/dd>/g)].map((match) => match[1]);
    expect(numbers).toEqual(["3", "2", "1"]);
  });

  it("гілка починається з власника, а не з першого контакту", () => {
    const html = render([contact()]);

    expect(html).toContain("wb-contact-scheme-root");
    expect(html.trim().startsWith("<div")).toBe(true);
  });

  it("очікування назване словом, а контакт без лінка — своїм станом", () => {
    const html = render([
      contact({ id: 1, name: "Олег", code: "inv-000001" }),
      contact({ id: 2, name: "Знайомий" }),
    ]);

    expect(html).toContain("лінк чекає");
    expect(html).toContain("без лінка");
    expect(html).not.toContain("ще не приєднався");
  });

  it("другий рівень показується лише тоді, коли він є", () => {
    const withNested = render([
      contact({ telegramUserId: 555, code: "inv-000001", invitedCount: 3 }),
    ]);
    const without = render([contact({ telegramUserId: 555, code: "inv-000001", invitedCount: 0 })]);

    expect(withNested).toContain("залучив(ла) ще 3");
    expect(withNested).toContain("Ваші контакти залучили ще 3");
    expect(without).not.toContain("залучив");
    expect(without).not.toContain("wb-contact-nested-total");
  });

  it("ім'я контакту стоїть окремо від хендла — підпис і підпис", () => {
    const html = render([contact({ username: "karas", telegramUserId: 555 })]);

    expect(html).toContain("wb-contact-scheme-node");
    expect(html).toContain("Карас");
    expect(html).toContain("wb-contact-scheme-name");
    expect(html).toContain("@karas");
  });
});
