/**
 * Список контактів — акордеон: що видно **до** дотику і що з'являється після.
 *
 * Перевіряємо те, що легко зламати мовчки: номер порядковий і **продовжується в
 * групах** (групи ділять список, а не починають його заново), закритий рядок
 * показує два рядки інформації й **жодної дії** (дії живуть у тілі), розкритий
 * додає етапи, лінк, дати й дії, а **стадія названа словом** — «зайшов у бота»
 * проти «приєднався» це різні події, і за кольором їх не видно.
 *
 * Дві речі тут перевіряються **разом із CSS**: що рядок бере тло з того самого
 * кирпичика «плитка списку», що картка нотатки, і що знайдений хештег має
 * власне правило (акцент), а не покладається на колір за замовчуванням.
 *
 * І ще одне, що легко не помітити: **однаковий `id` у двох рядках — не
 * помилка**. Людина, яка зайшла за двома лінками, дає дві картки, і друга
 * мусить бути підписана — інакше власник читає це як зламані дані.
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
import type { ContactsGroup } from "./types";
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

/** Група — те, як список розклали: у тестах досить однієї. */
function group(contacts: Contact[], label = "Усі контакти"): ContactsGroup {
  return { key: "all", label, contacts };
}

const ROWS: CollectionView = { layout: "rows", columns: 2 };
const CARDS: CollectionView = { layout: "cards", columns: 2 };

function render(
  contacts: Contact[],
  over: {
    openIds?: number[];
    found?: string[];
    copiedId?: number | null;
    collection?: CollectionView;
    groups?: ContactsGroup[];
  } = {},
): string {
  return renderToStaticMarkup(
    <ContactList
      groups={over.groups ?? [group(contacts)]}
      found={over.found}
      openIds={over.openIds ?? []}
      onToggle={() => {}}
      onEdit={() => {}}
      onDelete={() => {}}
      onMakeLink={() => {}}
      onCopyLink={() => {}}
      copiedId={over.copiedId ?? null}
      collection={over.collection ?? ROWS}
    />,
  );
}

describe("ContactList — закритий рядок", () => {
  it("нумерує контакти порядково, і в групах номер продовжується", () => {
    const first = group([contact(7), contact(9)], "Сьогодні");
    const second: ContactsGroup = {
      key: "day:yesterday",
      label: "Вчора",
      contacts: [contact(11)],
    };
    const html = render([], { groups: [first, second] });
    const numbers = [...html.matchAll(/wb-contact-number">(\d+)</g)].map((match) => match[1]);

    expect(numbers).toEqual(["1", "2", "3"]);
    // Заголовок групи каже, скільки в ній записів: «тут 2» мусить бути видно,
    // не рахуючи очима.
    expect(html).toContain("Сьогодні");
    expect(html).toContain('wb-contact-group-count">2<');
  });

  it("⛔ без груп титул не показується: «усі контакти» повторювало б назву екрана", () => {
    // Типове групування — без груп, а їхнє число вже стоїть плашкою «Всього»
    // над списком: титул тут був би третім словом про те саме.
    const html = render([contact(1), contact(2)]);

    expect(html).not.toContain("wb-contact-group-title");
    expect(html.match(/wb-contact-item"/g)).toHaveLength(2);
  });

  it("показує ім'я, дату-час зміни, хто це й стадію словом", () => {
    const html = render([contact(1, { name: "Олег", username: "oleg" })]);

    expect(html).toContain("Олег");
    expect(html).toContain("@oleg");
    expect(html).toContain("18.09.2026");
    expect(html).toContain("без лінка");
  });

  it("часткове приєднання видно словом «зайшов у бота»", () => {
    const html = render([
      contact(1, { code: "inv-8f3k2q", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    expect(html).toContain("зайшов у бота");
    expect(html).toContain("id 555");
    expect(html).not.toContain("приєднався");
  });

  it("повне приєднання каже «приєднався»", () => {
    const html = render([
      contact(1, {
        joinedUserId: 555,
        joinedBotAt: "2026-09-18 03:45:00",
        joinedPlatformAt: "2026-09-18 03:50:00",
      }),
    ]);

    expect(html).toContain("приєднався");
    expect(html).not.toContain("зайшов у бота");
  });

  it("⛔ закритий рядок — одна кнопка й жодної дії: усе інше в тілі", () => {
    const html = render([contact(1), contact(2)]);
    const items = html.split("wb-contact-item").slice(1);

    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.match(/<button/g) ?? []).toHaveLength(1);
      expect(item).not.toContain("Прибрати");
      expect(item).not.toContain("Копіювати");
    }
    expect(html).toContain('aria-expanded="false"');
  });

  it("другий запис про ту саму людину підписаний — id один, людини дві немає", () => {
    const html = render([
      contact(1, { name: "Карась 2", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
      contact(2, {
        name: "Карась молодший",
        joinedUserId: 555,
        joinedBotAt: "2026-09-18 03:45:00",
      }),
    ]);
    const items = html.split("wb-contact-item").slice(1);

    expect(items[0]).not.toContain("та сама людина");
    expect(items[1]).toContain("та сама людина, що «Карась 2»");
    expect([...html.matchAll(/wb-contact-twin/g)]).toHaveLength(1);
  });

  it("різні люди з однаковим іменем близнюками не стають", () => {
    const html = render([
      contact(1, { name: "Карась", joinedUserId: 555, joinedBotAt: "2026-09-18 03:45:00" }),
      contact(2, { name: "Карась", joinedUserId: 556, joinedBotAt: "2026-09-18 03:45:00" }),
    ]);

    expect(html).not.toContain("та сама людина");
  });

  it("хештеги — підписи в рядку, а не чипи, і знайдений стоїть акцентом", () => {
    const html = render([contact(1, { tags: ["друг", "київ"] })], { found: ["київ"] });

    expect(html).toContain("wb-contact-tag");
    expect(html).not.toContain("wb-chip");
    // Акцент — рівно на тому тезі, який знайшов пошук, а не на всьому рядку.
    expect([...html.matchAll(/wb-contact-tag--hit/g)]).toHaveLength(1);
    expect(rule(".wb-contact-tag--hit")).toContain("color: var(--accent)");
  });
});

describe("ContactList — розкритий рядок", () => {
  it("показує всі три етапи, навіть непройдені", () => {
    const html = render([contact(1)], { openIds: [1] });

    expect(html).toContain("wb-contact-body");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain("Запрошено");
    expect(html).toContain("Зайшов у бота");
    expect(html).toContain("Зайшов на платформу");
    expect((html.match(/ще ні/g) ?? []).length).toBe(2);
  });

  it("контакт без лінка пропонує його скласти", () => {
    const html = render([contact(1)], { openIds: [1] });

    expect(html).toContain("Створити лінк");
    expect(html).not.toContain("Копіювати");
  });

  it("складений лінк показується готовим діплінком, який можна скопіювати", () => {
    const html = render(
      [contact(1, { code: "inv-8f3k2q", deepLink: "https://t.me/bot?start=inv-8f3k2q" })],
      {
        openIds: [1],
      },
    );

    expect(html).toContain("https://t.me/bot?start=inv-8f3k2q");
    expect(html).toContain("Копіювати");
    expect(html).not.toContain("Створити лінк");
  });

  it("щойно скопійований лінк каже це словом", () => {
    const html = render(
      [contact(1, { code: "inv-8f3k2q", deepLink: "https://t.me/bot?start=x" })],
      {
        openIds: [1],
        copiedId: 1,
      },
    );

    expect(html).toContain("Скопійовано");
    expect(html).not.toContain("Копіювати");
  });

  it("⛔ за використаним лінком кнопки немає: він більше нікого не закріпить", () => {
    const html = render(
      [
        contact(1, {
          code: "inv-8f3k2q",
          deepLink: "https://t.me/bot?start=inv-8f3k2q",
          joinedUserId: 555,
          joinedBotAt: "2026-09-18 03:45:00",
        }),
      ],
      { openIds: [1] },
    );

    expect(html).toContain("Лінк використано");
    expect(html).not.toContain("Копіювати");
    expect(html).not.toContain("start=inv-8f3k2q");
  });

  it("обидві дати — парами «підпис → значення», а не рядком через кому", () => {
    const html = render([contact(1, { createdAt: "2026-09-10 10:00:00" })], { openIds: [1] });

    expect(html).toContain("Створено");
    expect(html).toContain("Змінено");
    expect(html).toContain("10.09.2026");
  });

  it("глибину гілки видно рядком, і лише коли вона є", () => {
    expect(render([contact(1, { invitedCount: 3 })], { openIds: [1] })).toContain(
      "Залучив(ла) ще 3",
    );
    expect(render([contact(1)], { openIds: [1] })).not.toContain("Залучив(ла)");
  });

  it("примітки показуються цілком — і лише в розкритому рядку", () => {
    expect(render([contact(1, { notes: "знайомий зі школи" })])).not.toContain("знайомий зі школи");
    expect(render([contact(1, { notes: "знайомий зі школи" })], { openIds: [1] })).toContain(
      "знайомий зі школи",
    );
  });

  it("дії стоять у тілі, і видалення попереджене кольором", () => {
    const html = render([contact(1)], { openIds: [1] });
    const actions = html.slice(html.indexOf("wb-sheet-actions"));

    expect(actions.match(/<button/g) ?? []).toHaveLength(2);
    expect(html).toContain("Прибрати");
    expect(html).toContain("Змінити");
    expect(html).toContain("wb-btn-danger");
  });
});

describe("ContactList — вигляд і стилі", () => {
  it("плитки — той самий рядок із іншою розкладкою, а не друга розмітка", () => {
    const rows = render([contact(1, { tags: ["друг"] })]);
    const cards = render([contact(1, { tags: ["друг"] })], { collection: CARDS });

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

  it("розкритий рядок видно тлом, а не лише кареткою", () => {
    expect(rule(".wb-contact-item--open")).toContain("background: var(--surface-active)");
  });

  it("плитка не коротшає до обрубка на короткому імені", () => {
    const cards = rulesIn(CSS, ".wb-collection--cards .wb-contact-item");

    expect(cards.join(" ")).toContain("min-height: var(--sp-16)");
  });

  it("у рядку довге ім'я обрізається, а в плитці — переноситься", () => {
    expect(rule(".wb-contact-name")).toContain("text-overflow: ellipsis");
    expect(rule(".wb-collection--cards .wb-contact-name")).toContain("-webkit-line-clamp: 2");
    // Довгий `@username` мусить переноситись: інакше розтягує список за екран.
    expect(rule(".wb-contact-who")).toContain("overflow-wrap: anywhere");
  });
});
