/**
 * Підсумки схеми — три числа, які легко порахувати неправильно.
 *
 * Найтонше тут — «другий рівень»: це сума того, що закріпили **контакти**, а не
 * власник. Якщо колись злити його з «приєднались», схема перестане показувати
 * головне, заради чого вона існує: що гілка продовжується не тобою.
 */

import { describe, expect, it } from "vitest";
import type { InviteLink } from "@wwwuabot/shared/invites";
import { inviteStats } from "./scheme";

/** Лінк-фікстура: контакт передають лише тоді, коли він справді є. */
function link(id: number, invitedCount: number | null = null): InviteLink {
  return {
    id,
    code: `inv-00000${id}`,
    label: `Контакт ${id}`,
    deepLink: `https://t.me/wwwuabot?start=inv-00000${id}`,
    createdAt: "2026-09-17 09:00:00",
    contact:
      invitedCount === null
        ? null
        : {
            userId: 500 + id,
            name: `Ім'я ${id}`,
            username: null,
            joinedAt: "2026-09-17 10:00:00",
            invitedCount,
          },
  };
}

describe("підсумки схеми", () => {
  it("порожній список — це нулі, а не порожні поля", () => {
    expect(inviteStats([])).toEqual({ links: 0, joined: 0, waiting: 0, nested: 0 });
  });

  it("лінк із контактом — закріплений, без контакту — очікує", () => {
    const stats = inviteStats([link(1, 0), link(2), link(3, 5)]);

    expect(stats.links).toBe(3);
    expect(stats.joined).toBe(2);
    expect(stats.waiting).toBe(1);
  });

  it("другий рівень — сума того, що закріпили контакти, а не власник", () => {
    expect(inviteStats([link(1, 2), link(2, 3), link(3)]).nested).toBe(5);
  });
});
