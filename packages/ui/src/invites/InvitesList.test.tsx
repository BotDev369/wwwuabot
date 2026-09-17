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

/** Тіло правила за селектором — щоб перевіряти саме його, а не файл цілком. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return CSS.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
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
    <InvitesList links={links} copiedId={copiedId} onCopy={() => {}} onDelete={() => {}} />,
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
});
