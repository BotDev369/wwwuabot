/**
 * Стадія контакту й підсумки схеми — те, що легко порахувати неправильно.
 *
 * Найтонше тут — **порядок, а не сума**. Дат може бути дві (бот і платформа),
 * і старша стадія не «втрачає» молодшу: людина, яка зайшла на платформу,
 * зайшла й у бота, тож у лійці вона мусить бути **в обох** числах. Якщо
 * колись рахувати «або те, або те», лійка дірява — а саме заради різниці між
 * кроками вона й існує.
 *
 * Друге тонке — **контакт без лінка не «очікує»**: він нікого не запрошував, і
 * чекати нічого.
 */

import { describe, expect, it } from "vitest";
import type { Contact } from "@wwwuabot/shared/contacts";
import { contactStage, contactStats } from "./scheme";

/** Контакт-фікстура: усе, крім переданого, — «щойно завели». */
function contact(over: Partial<Contact> = {}): Contact {
  return {
    id: 1,
    name: "Контакт",
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

const BOT = "2026-09-18 03:45:00";
const PLATFORM = "2026-09-18 03:50:00";

describe("стадія контакту", () => {
  it("без лінка — `none`, а не «очікує»", () => {
    expect(contactStage(contact())).toBe("none");
  });

  it("лінк складено — `invited`", () => {
    expect(contactStage(contact({ code: "inv-8f3k2q" }))).toBe("invited");
  });

  it("зайшов у бота — `bot` (часткове приєднання)", () => {
    expect(contactStage(contact({ code: "inv-8f3k2q", joinedUserId: 555, joinedBotAt: BOT }))).toBe(
      "bot",
    );
  });

  it("зайшов і на платформу — `platform`, і це старша стадія", () => {
    expect(
      contactStage(contact({ joinedUserId: 555, joinedBotAt: BOT, joinedPlatformAt: PLATFORM })),
    ).toBe("platform");
  });

  it("⛔ платформа без бота не робить стадію молодшою: дивимось з кінця", () => {
    // Такого рядка не має бути в базі (дату платформи ставить api-dev лише
    // тим, хто вже в боті), але порядок перевірок мусить бути сталим: інакше
    // одна зламана дата показувала б контакт «у боті» замість «приєднався».
    expect(contactStage(contact({ joinedUserId: 555, joinedPlatformAt: PLATFORM }))).toBe(
      "platform",
    );
  });
});

describe("підсумки схеми", () => {
  it("порожній список — це нулі, а не порожні поля", () => {
    expect(contactStats([])).toEqual({
      total: 0,
      invited: 0,
      waiting: 0,
      bot: 0,
      platform: 0,
      nested: 0,
    });
  });

  it("лійка не має дірок: той, хто на платформі, порахований і в боті", () => {
    const stats = contactStats([
      contact({ id: 1, name: "Просто занесли" }),
      contact({ id: 2, name: "Запрошений", code: "inv-000002" }),
      contact({ id: 3, name: "У боті", code: "inv-000003", joinedUserId: 1, joinedBotAt: BOT }),
      contact({
        id: 4,
        name: "Приєднався",
        code: "inv-000004",
        joinedUserId: 2,
        joinedBotAt: BOT,
        joinedPlatformAt: PLATFORM,
      }),
    ]);

    expect(stats.total).toBe(4);
    expect(stats.invited).toBe(3);
    expect(stats.waiting).toBe(1);
    expect(stats.bot).toBe(2);
    expect(stats.platform).toBe(1);
  });

  it("⛔ контакт без лінка не вважається тим, хто «очікує»", () => {
    // Інакше «очікують» росло б від кожного, кого власник просто заніс у
    // довідник, і число читалося б як обізянка, якої ніхто не давав.
    expect(contactStats([contact()]).waiting).toBe(0);
    expect(contactStats([contact()]).invited).toBe(0);
  });

  it("другий рівень — сума того, що закріпили контакти, а не власник", () => {
    const stats = contactStats([
      contact({ id: 1, joinedUserId: 1, joinedBotAt: BOT, invitedCount: 2 }),
      contact({ id: 2, joinedUserId: 2, joinedBotAt: BOT, invitedCount: 3 }),
      // Запрошений, але ще не прийшов: глибини в нього немає.
      contact({ id: 3, code: "inv-000003" }),
    ]);

    expect(stats.nested).toBe(5);
  });
});
