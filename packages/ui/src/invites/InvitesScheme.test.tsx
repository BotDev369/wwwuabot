/**
 * Схема залучених — що вона каже про гілку.
 *
 * Тут перевіряється те, чого не видно в числах: другий рівень з'являється
 * **лише тоді, коли він є**. «Залучив(ла) ще 0» — це рядок заради нуля, і саме
 * такий рядок робить список шумним.
 */

/// <reference types="node" />

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { InviteContact, InviteLink } from "@wwwuabot/shared/invites";
import { InvitesScheme } from "./InvitesScheme";

function contact(name: string, invitedCount: number): InviteContact {
  return {
    userId: 555,
    name,
    username: null,
    joinedAt: "2026-09-17 10:00:00",
    invitedCount,
  };
}

function link(id: number, label: string, joined: InviteContact | null = null): InviteLink {
  return {
    id,
    code: `inv-00000${id}`,
    label,
    deepLink: `https://t.me/wwwuabot?start=inv-00000${id}`,
    contact: joined,
    createdAt: "2026-09-17 09:00:00",
  };
}

function render(links: InviteLink[]): string {
  return renderToStaticMarkup(<InvitesScheme links={links} />);
}

describe("InvitesScheme", () => {
  it("показує три числа — лінків, приєднались, очікують", () => {
    const html = render([link(1, "Карас", contact("Карас", 0)), link(2, "Олег")]);

    expect(html).toContain("Лінків");
    expect(html).toContain("Приєднались");
    expect(html).toContain("Очікують");
    // 2 лінки, 1 закріплений, 1 очікує — числа стоять однією лінією з підписами.
    const numbers = [...html.matchAll(/<dd>(\d+)<\/dd>/g)].map((match) => match[1]);
    expect(numbers).toEqual(["2", "1", "1"]);
  });

  it("гілка починається з власника, а не з першого лінка", () => {
    expect(render([link(1, "Карас")])).toContain("wb-invite-scheme-root");
  });

  it("очікування назване очікуванням, а не порожнім ім'ям", () => {
    const html = render([link(1, "Олег")]);

    expect(html).toContain("ще не приєднався");
    expect(html).toContain("wb-invite-scheme-row--waiting");
  });

  it("другий рівень показується лише тоді, коли він є", () => {
    const withNested = render([link(1, "Карас", contact("Карас", 3))]);
    const without = render([link(1, "Карас", contact("Карас", 0))]);

    expect(withNested).toContain("залучив(ла) ще 3");
    expect(withNested).toContain("Ваші контакти залучили ще 3");
    expect(without).not.toContain("залучив");
    expect(without).not.toContain("wb-invite-nested-total");
  });

  it("ім'я контакту стоїть окремо від підпису лінка", () => {
    // Підпис вписує власник, ім'я приходить із профілю: якщо вони злиті в один
    // рядок, не видно, що лінк справді спрацював на живу людину.
    const html = render([link(1, "Хтось", contact("Карас", 0))]);

    expect(html).toContain("wb-invite-scheme-node");
    expect(html).toContain("Хтось");
    expect(html).toContain("wb-invite-scheme-name");
    expect(html).toContain("Карас");
  });
});
