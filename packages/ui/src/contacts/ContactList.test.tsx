/**
 * Рядок контакту — те, що мусить бути видно **до** дотику.
 *
 * Перевіряємо те, що легко зламати мовчки: номер контакту порядковий і
 * збігається з місцем у списку, **стадія названа словом** — «зайшов у бота»
 * проти «приєднався» це різні події, і за кольором їх не видно, — а дій у рядку
 * немає: вони живуть у картці, яку рядок відкриває. Хештег при цьому **підпис,
 * а не чип**: у чипа бренди задають свої мірки з `!important`, і рядок тегів
 * виходив би вдвічі вищим за рядок із текстом.
 *
 * Дві властивості перевіряються **разом із CSS**: звідки рядок бере тло (той
 * самий кирпичик «плитка списку», що картка нотатки) і що довгий `@username`
 * переноситься, а не розтягує список за екран.
 *
 * Окремо — найтонше: **плитки це той самий рядок із іншою розкладкою**, а не
 * друга розмітка. Тест звіряє, що розмітка рядків і плиток відрізняється рівно
 * класом вигляду.
 *
 * Середовище тестів — `node` (без DOM), тож перевіряємо розмітку, яку рендерить
 * React, і правила CSS, а не дотики.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Contact } from "@wwwuabot/shared/contacts";
import { ContactList } from "./ContactList";
import type { CollectionView } from "../collection";

/** Спільні стилі: розмітку рендерить спільний модуль, тож і правила там. */
const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/contacts.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Тіла правил, у селекторі яких є цей клас — **цілим селектором**.
 *
 * Саме цілим, а не «одразу перед дужкою»: плитковий режим пише свої правила
 * тим самим класом у складі довшого селектора
 * (`.wb-collection--cards .wb-contact-card`), і пошук за сусідством дужки
 * повернув би тіло, що стоїть **перед** ним.
 */
function rulesIn(css: string, selector: string): string[] {
  const bodies: string[] = [];
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const has = selectors.split(",").some((part) => {
      const candidate = part.trim();
      return candidate === selector || candidate.startsWith(`${selector}:`);
    });
    if (has) bodies.push(body);
  }
  return bodies;
}

/** Тіло правила, у якому стоїть саме цей селектор (перший такий). */
function rule(selector: string): string {
  return rulesIn(CSS, selector)[0] ?? "";
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

const ROWS: CollectionView = { layout: "rows", columns: 2 };
const CARDS: CollectionView = { layout: "cards", columns: 2 };

function render(contacts: Contact[], collection: CollectionView = ROWS): string {
  return renderToStaticMarkup(
    <ContactList contacts={contacts} collection={collection} onOpen={() => {}} />,
  );
}

describe("ContactList", () => {
  it("нумерує контакти порядково — номер збігається з місцем у списку", () => {
    const html = render([contact(7), contact(9), contact(11)]);
    const numbers = [...html.matchAll(/wb-contact-number">(\d+)</g)].map((match) => match[1]);

    expect(numbers).toEqual(["1", "2", "3"]);
  });

  it("контакт без лінка названий словом, а не порожнім рядком", () => {
    const html = render([contact(1, { name: "Олег" })]);

    expect(html).toContain("Олег");
    expect(html).toContain("без лінка");
  });

  it("складений, але не використаний лінк каже «лінк чекає»", () => {
    expect(render([contact(1, { code: "inv-8f3k2q" })])).toContain("лінк чекає");
  });

  it("часткове приєднання видно словом «зайшов у бота»", () => {
    const html = render([
      contact(1, { code: "inv-8f3k2q", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    expect(html).toContain("зайшов у бота");
    expect(html).toContain("id 555");
    expect(html).not.toContain("приєднався");
  });

  it("повне приєднання каже «приєднався» і показує, хто це", () => {
    const html = render([
      contact(1, {
        username: "karas",
        joinedUserId: 555,
        joinedBotAt: "2026-09-18 03:45:00",
        joinedPlatformAt: "2026-09-18 03:50:00",
      }),
    ]);

    expect(html).toContain("@karas");
    expect(html).toContain("приєднався");
    expect(html).not.toContain("зайшов у бота");
  });

  it("хештеги — підписи в рядку, а не чипи", () => {
    const html = render([contact(1, { tags: ["друг", "київ"] })]);

    expect(html).toContain("#друг");
    expect(html).toContain("#київ");
    expect(html).toContain("wb-contact-tag");
    expect(html).not.toContain("wb-chip");
  });

  it("⛔ у рядку немає жодної дії: дії живуть у картці контакту", () => {
    const html = render([contact(1), contact(2)]);
    const items = html.split("wb-contact-item").slice(1);

    expect(items).toHaveLength(2);
    // Одна кнопка на рядок — сам рядок (він і відкриває картку).
    for (const item of items) expect(item.match(/<button/g) ?? []).toHaveLength(1);
    expect(html).toContain('aria-label="Відкрити контакт «Контакт 1»"');
    expect(html).not.toContain("Копіювати");
    expect(html).not.toContain("Прибрати");
  });

  it("плитки — той самий рядок із іншою розкладкою, а не друга розмітка", () => {
    const rows = render([contact(1, { tags: ["друг"] })]);
    const cards = render([contact(1, { tags: ["друг"] })], CARDS);

    expect(rows).toContain("wb-collection--rows");
    expect(cards).toContain("wb-collection--cards wb-collection--cols-2");
    // Різниця рівно одна — клас вигляду списку.
    expect(cards.replace("wb-collection--cards wb-collection--cols-2", "wb-collection--rows")).toBe(
      rows,
    );
  });

  it("рядок — та сама плитка списку, що й нотатка: окремого тла немає", () => {
    expect(rule(".wb-contact-item")).toContain("background: var(--field-bg)");
    // Рамки немає жодної — розділяє проміжок (правило 15), а `border-radius`
    // це заокруглення тла, а не лінія.
    expect(rule(".wb-contact-item")).not.toMatch(/border\s*:/);
  });

  it("плитка не коротшає до обрубка на короткому імені", () => {
    const cards = rulesIn(CSS, ".wb-collection--cards .wb-contact-item");

    expect(cards.join(" ")).toContain("min-height: var(--sp-16)");
  });

  it("довге ім'я чи хендл переносяться, а не розтягують список за екран", () => {
    expect(rule(".wb-contact-name")).toContain("overflow-wrap: anywhere");
    expect(rule(".wb-contact-who")).toContain("overflow-wrap: anywhere");
  });
});
