/**
 * Підсумкові числа контактів — три пари «знак + число» в шапці екрана.
 *
 * Перевіряємо найтонше, бо саме тут цифра легко стає неправдою, а знак —
 * нечитабельним:
 *
 *   - числа стоять **за спаданням** (всього → бот → платформа): це лійка, і
 *     читають її, порівнюючи кроки між собою;
 *   - числа рахують **людей, а не картки**: два лінки на одну людину дають два
 *     записи й **одну** людину в «у боті» — без рядка-пояснення, бо різницю
 *     видно в списку (другий запис підписаний «та сама людина, що …»);
 *   - той, хто на платформі, порахований **і в «у боті»**: людина не може
 *     відкрити Mini App, не зайшовши в бота, і лійка без цього мала б дірку;
 *   - контакт **без лінка** входить у «Всього» — це довідник, а не список
 *     надісланих посилань;
 *   - слово з розмітки **не зникло**, а сховане: скрінрідер читає «Всього 2»,
 *     бо сам знак числа не називає, а око бачить три **різні** знаки — три
 *     однакові силуети читались би як одне число.
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

/** Знаки кожної пари — щоб перевірити, що вони справді різні. */
function icons(html: string): string[] {
  return [...html.matchAll(/<svg[\s\S]*?<\/svg>/g)].map((match) => match[0]);
}

describe("ContactTotals", () => {
  it("називає три кроки лійки своїми словами, а на екрані ставить знак", () => {
    const html = render([contact(1)]);

    // Слова лишились у розмітці: без них скрінрідер читав би «2 1 0» без назв.
    expect(html).toContain("Всього");
    expect(html).toContain("Бот");
    expect(html).toContain("Платформа");
    // «Всього» рахує **усі** записи, тож навіть контакт без лінка тут є: лійка
    // йде за спаданням — всього → бот → платформа.
    expect(numbers(html)).toEqual(["1", "0", "0"]);
    // Підпис — `dt`, число — `dd`: так читає скрінрідер («Всього 1»).
    const pair = html.slice(html.indexOf('wb-contact-stat"'), html.indexOf("</div>"));
    expect(pair.indexOf("<dt")).toBeLessThan(pair.indexOf("<dd"));
    expect(html.match(/wb-contact-stat"/g)).toHaveLength(3);
  });

  it("знаки різні: три однакові силуети читались би як одне число", () => {
    const drawn = icons(render([contact(1)]));

    expect(drawn).toHaveLength(3);
    expect(new Set(drawn).size).toBe(3);
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

describe("числа — знаки в шапці, а не плашки", () => {
  it("стоять у ряд із назвою: праворуч від неї, одним рядом", () => {
    // Числа живуть у шапці (`.wb-page-head`), поруч із заголовком, а `margin-left:
    // auto` тримає їх праворуч навіть тоді, коли ряд переноситься: числа
    // продовжують назву, а не починають новий ряд від лівого краю.
    const stats = rule(".wb-contact-stats");
    expect(stats).toContain("display: flex");
    expect(stats).toContain("align-items: center");
    expect(stats).toContain("margin: 0 0 0 auto");
    expect(stats).not.toContain("grid-template-columns");
  });

  it("⛔ заливки немає: у шапці залишається єдина акцентна пляма — «+»", () => {
    // Плашка з `--field-bg` важила б більше за саму цифру, а місце в шапці
    // належить назві екрана.
    expect(rule(".wb-contact-stat")).not.toContain("background");
    expect(rule(".wb-contact-stat")).not.toContain("border");
    expect(rule(".wb-contact-stat")).toContain("gap: var(--sp-1)");
  });

  it("знак і число — акцентом: це підсумок екрана, а не примітка під списком", () => {
    expect(rule(".wb-contact-stat-label")).toContain("color: var(--accent)");
    expect(rule(".wb-contact-stat-value")).toContain("color: var(--accent)");
    expect(rule(".wb-contact-stat-value")).toContain("font-size: var(--text-md)");
  });

  it("слово сховане з екрана, але лишається для скрінрідера", () => {
    // `display: none` тут було б помилкою: разом зі словом зникла б і назва
    // числа, а сам знак нічого не називає.
    const word = rule(".wb-contact-stat-word");
    expect(word).not.toContain("display: none");
    expect(word).toContain("position: absolute");
    expect(word).toContain("width: 1px");
    expect(word).toContain("clip-path: inset(50%)");
  });
});
