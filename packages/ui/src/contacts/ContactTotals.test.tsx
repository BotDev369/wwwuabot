/**
 * Підсумкові числа контактів — три плашки «Всього / Бот / Платформа».
 *
 * Перевіряємо найтонше, бо саме тут цифра легко стає неправдою:
 *
 *   - числа стоять **плашками й за спаданням** (всього → бот → платформа): це
 *     лійка, і читають її, порівнюючи кроки між собою;
 *   - числа рахують **людей, а не картки**: два лінки на одну людину дають два
 *     записи й **одну** людину в «у боті» — без рядка-пояснення, бо різницю
 *     видно в списку (другий запис підписаний «та сама людина, що …»);
 *   - той, хто на платформі, порахований **і в «у боті»**: людина не може
 *     відкрити Mini App, не зайшовши в бота, і лійка без цього мала б дірку;
 *   - контакт **без лінка** входить у «Всього» — це довідник, а не список
 *     надісланих посилань.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку
 * рендерить React, а не дотики.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Contact } from "@wwwuabot/shared/contacts";
import { ContactTotals } from "./ContactTotals";

/** Спільні стилі: розмітку рендерить спільний модуль, тож і правила там. */
const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/contacts.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Тіло правила за селектором — щоб перевіряти саме його, а не файл цілком. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
}

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
  return [...html.matchAll(/wb-contact-stat-value">(\d+)</g)].map((match) => match[1]);
}

describe("ContactTotals", () => {
  it("називає три кроки лійки своїми словами й ставить число над підписом", () => {
    const html = render([contact(1)]);

    expect(html).toContain("Всього");
    expect(html).toContain("Бот");
    expect(html).toContain("Платформа");
    // «Всього» рахує **усі** записи, тож навіть контакт без лінка тут є: лійка
    // йде за спаданням — всього → бот → платформа.
    expect(numbers(html)).toEqual(["1", "0", "0"]);

    // Підпис — `dt`, число — `dd`: так читає скрінрідер, а порядок на екрані
    // перевертає CSS (`column-reverse`), не чіпаючи розмітку.
    const plate = html.slice(html.indexOf('wb-contact-stat"'), html.indexOf("</div>"));
    expect(plate.indexOf("<dt")).toBeLessThan(plate.indexOf("<dd"));
    expect(html.match(/wb-contact-stat"/g)).toHaveLength(3);
  });

  it("контакт без лінка входить у «Всього»: це довідник, а не список лінків", () => {
    expect(numbers(render([contact(1), contact(2, { code: "inv-8f3k2q" })]))).toEqual([
      "2",
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

    expect(numbers(html)).toEqual(["1", "1", "1"]);
  });

  it("⛔ числа рахують людей, а не картки — і не пояснюються рядком", () => {
    const html = render([
      contact(1, { code: "inv-1", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
      contact(2, { code: "inv-2", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    // Два записи — одна людина: «Всього» 2, «Бот» 1. Саме для цього лійка
    // рахує `joinedUserId`, а не рядки.
    expect(numbers(html)).toEqual(["2", "1", "0"]);
    // Пояснення прибрано навмисно: воно повторювало те, що вже підписано в
    // списку («та сама людина, що …»), і займало рядок у шапці.
    expect(html).not.toContain("про тих самих людей");
    expect(html).not.toContain("wb-contact-twins-note");
  });

  it("різні люди з однаковими іменами не зливаються в одну", () => {
    const html = render([
      contact(1, { joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
      contact(2, { joinedUserId: 556, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    expect(numbers(html)).toEqual(["2", "2", "0"]);
  });
});

describe("плашки — мірки, які легко загубити мовчки", () => {
  it("три рівні клітинки, а не рядок підписів: числа порівнюють очима", () => {
    expect(rule(".wb-contact-stats")).toContain("grid-template-columns: repeat(3");
    // Обидва відступи — на самих плашках: у sticky-шарі проміжки задає дитина,
    // і без них числа тулились би до заголовка зверху й до смуги знизу.
    expect(rule(".wb-contact-stats")).toContain("margin: var(--sp-3) 0");
  });

  it("плашка — та сама плитка списку, а число над підписом", () => {
    expect(rule(".wb-contact-stat")).toContain("background: var(--field-bg)");
    expect(rule(".wb-contact-stat")).toContain("column-reverse");
    expect(rule(".wb-contact-stat-value")).toContain("font-size: var(--text-lg)");
  });

  it("підпис читабельний: тихіший кольором, а не кеглем", () => {
    // 12px на телефоні не читались (та сама межа, що в хештегів списку).
    expect(rule(".wb-contact-stat-label")).toContain("font-size: var(--text-sm)");
    expect(rule(".wb-contact-stat-label")).toContain("color: var(--text-muted)");
    expect(rule(".wb-contact-stat-label")).not.toContain("var(--text-primary)");
  });
});
