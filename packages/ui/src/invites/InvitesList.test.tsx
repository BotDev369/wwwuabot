/**
 * Картка лінка — те, що мусить бути видно **до** дотику.
 *
 * Перевіряємо три речі, кожну з яких легко зламати мовчки: стан названий
 * **словом** (не самим кольором), лінк показано готовим (а не «склади сам із
 * коду»), і кнопка без лінка не вдає, що щось робить.
 *
 * Одна властивість перевіряється **разом із CSS** — звідки картка бере тло:
 * це той самий кирпичик «плитка списку», що у картки нотатки, і якщо колись
 * з'явиться друга плитка зі своїм тлом, списки стануть різними на око.
 *
 * Одна дія перевіряється окремо — **правка імені**: олівець мусить стояти біля
 * підпису (це дія над іменем), а не в ряду `Копіювати / Прибрати` (там він
 * читався б як третя дія над посиланням), і брати вигляд із спільного правила
 * клітинок-знаків, а не заводити власне.
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
import type { InviteLink } from "@wwwuabot/shared/invites";
import { InvitesList } from "./InvitesList";

/** Спільні стилі: розмітку рендерить спільний модуль, тож і правила там. */
const CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/invites.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Спільні стилі: клітинка правки бере вигляд із того самого правила, що вкладки. */
const SHARED_CSS = readFileSync(
  join(
    fileURLToPath(new URL("../../../../", import.meta.url)),
    "packages/shared/src/styles/components.css",
  ),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * Тіла правил, у селекторі яких є цей клас.
 *
 * Саме **в селекторі**, а не «одразу перед дужкою»: клітинка правки стоїть у
 * списку спільних клітинок-знаків, і сусід, дописаний після неї, відсунув би `{`
 * від імені — тест падав би від чужої правки.
 */
function rulesIn(css: string, selector: string): string[] {
  const bodies: string[] = [];
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const has = selectors.split(",").some((part) =>
      part
        .trim()
        .split(/\s+/)
        .some((token) => token === selector || token.startsWith(`${selector}:`)),
    );
    if (has) bodies.push(body);
  }
  return bodies;
}

/** Тіло правила за селектором — щоб перевіряти саме його, а не файл цілком. */
function ruleIn(css: string, selector: string): string {
  return rulesIn(css, selector)[0] ?? "";
}

function rule(selector: string): string {
  return ruleIn(CSS, selector);
}

/** Лінк-фікстура: усе, крім переданого, має осмислений типовий вигляд. */
function link(id: number, over: Partial<InviteLink> = {}): InviteLink {
  return {
    id,
    code: "inv-8f3k2q",
    label: "Карас",
    deepLink: "https://t.me/wwwuabot?start=inv-8f3k2q",
    contact: null,
    createdAt: "2026-09-17 09:00:00",
    ...over,
  };
}

function render(links: InviteLink[], copiedId: number | null = null): string {
  return renderToStaticMarkup(
    <InvitesList
      links={links}
      copiedId={copiedId}
      onCopy={() => {}}
      onRename={() => {}}
      onDelete={() => {}}
    />,
  );
}

describe("InvitesList", () => {
  it("лінк, який ще чекає, названий словом «Очікує»", () => {
    const html = render([link(1)]);

    expect(html).toContain("Карас");
    expect(html).toContain("Очікує");
    expect(html).toContain("wb-invite-state--waiting");
    expect(html).not.toContain("wb-invite-contact");
  });

  it("закріплений лінк показує, хто прийшов, і коли", () => {
    const html = render([
      link(1, {
        contact: {
          userId: 555,
          name: "Карас Карасевич",
          username: "karas",
          joinedAt: "2026-09-17 10:00:00",
          invitedCount: 0,
        },
      }),
    ]);

    expect(html).toContain("Приєднався");
    expect(html).toContain("wb-invite-state--joined");
    expect(html).toContain("Карас Карасевич");
    expect(html).toContain("wb-invite-contact");
  });

  it("показує готовий діплінк, а не сам код", () => {
    // Код без лінка нічого не вартий: людина надсилає посилання.
    expect(render([link(1)])).toContain("https://t.me/wwwuabot?start=inv-8f3k2q");
  });

  it("⛔ без імені бота кнопка «Копіювати» не вдає, що працює", () => {
    const html = render([link(1, { deepLink: null })]);

    expect(html).toContain("disabled");
    expect(html).toContain("inv-8f3k2q");
  });

  it("«Скопійовано» показується лише тому лінку, який скопіювали", () => {
    const html = render([link(1), link(2)], 2);
    const [first, second] = html.split("wb-invite-item").slice(1);

    expect(first).toContain("Копіювати");
    expect(first).not.toContain("Скопійовано");
    expect(second).toContain("Скопійовано");
  });

  it("картка — та сама плитка списку, що й нотатка: окремого тла немає", () => {
    expect(rule(".wb-invite-item")).toContain("background: var(--field-bg)");
    // Рамки немає жодної — розділяє проміжок (правило 15), а `border-radius`
    // це заокруглення тла, а не лінія.
    expect(rule(".wb-invite-item")).not.toMatch(/border\s*:/);
  });

  it("стан читається кольором **і** словом: колір не єдиний носій сенсу", () => {
    expect(rule(".wb-invite-state--joined")).toContain("color: var(--green)");
    expect(rule(".wb-invite-state--waiting")).toContain("color: var(--text-muted)");
  });

  it("довгий лінк переноситься, а не розтягує картку за екран", () => {
    expect(rule(".wb-invite-code")).toContain("overflow-wrap: anywhere");
  });

  it("правка імені стоїть біля підпису — і називає контакт, а не просто «кнопка»", () => {
    const html = render([link(1)]);

    expect(html).toContain("wb-invite-title");
    expect(html).toContain('aria-label="Перейменувати контакт «Карас»"');
    // Підпис — ліворуч від контрола, а стан — за ним: правка всередині групи
    // з ім'ям, а не десь у картці.
    expect(html.indexOf("wb-invite-label")).toBeLessThan(html.indexOf("wb-invite-edit"));
    expect(html.indexOf("wb-invite-edit")).toBeLessThan(html.indexOf("wb-invite-state"));
  });

  it("⛔ правка не потрапляє в ряд дій: там і далі дві дії над посиланням", () => {
    const html = render([link(1)]);
    const actions = html.slice(html.indexOf("wb-invite-actions"));

    expect(html.indexOf("wb-invite-edit")).toBeLessThan(html.indexOf("wb-invite-actions"));
    // Третя кнопка в тому ряду на телефоні розривається (див. панель теми).
    expect(actions.match(/<button/g) ?? []).toHaveLength(2);
  });

  it("клітинка правки бере вигляд із спільного правила, а мірку — зі своєю кегля", () => {
    // Спільне правило клітинок-знаків: без рамки й тла, підсвічення лише на дотик.
    // Шукаємо за вмістом: клас стоїть у списку селекторів, тож «перше тіло»
    // залежало б від порядку в тому списку.
    const shared =
      rulesIn(SHARED_CSS, ".wb-invite-edit").find((body) => body.includes("display: flex")) ?? "";
    expect(shared).toContain("border: none");
    expect(shared).toContain("background: none");
    expect(shared).toContain("color: var(--text-secondary)");
    // Своя — тільки мірка: 32px, як у клітинки смуги нотаток.
    expect(rule(".wb-invite-edit")).toContain("width: 32px");
    expect(rule(".wb-invite-edit")).toContain("height: 32px");
  });
});
