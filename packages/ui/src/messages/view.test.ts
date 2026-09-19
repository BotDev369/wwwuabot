/**
 * Правила списку розмов — пошук, фільтр, порядок, групи й чипи.
 *
 * Перевіряємо те, що ламається мовчки: розмова без повідомлень стоїть **унизу**
 * (вона не «найстаріша», її просто ще немає); «непрочитані спершу» не переставляє
 * решту; пошук знаходить і за іменем, яке дав власник, і за текстом останнього
 * повідомлення; у «днях» розмова без повідомлень не зникає зі списку; чип
 * знімає рівно один вибір.
 *
 * @module @wwwuabot/ui/messages/view.test
 */

import { describe, expect, it } from "vitest";
import type { Conversation, MessagePeer } from "@wwwuabot/shared/messages";
import { DEFAULT_MESSAGES_VIEW, type MessagesView } from "./types";
import {
  EMPTY_THREADS_LABEL,
  buildConversationGroups,
  conversationViewChips,
  filterConversations,
  sortConversations,
} from "./view";

function peer(patch: Partial<MessagePeer> = {}): MessagePeer {
  return {
    id: 42,
    firstName: null,
    lastName: null,
    username: null,
    platformUsername: null,
    contactName: null,
    photoUrl: null,
    ...patch,
  };
}

function conversation(patch: Partial<Conversation> = {}): Conversation {
  return {
    peer: peer(),
    lastMessageAt: "2026-09-19 12:00:00",
    lastMessageText: "привіт",
    lastSenderId: 42,
    unread: 0,
    ...patch,
  };
}

function view(patch: Partial<MessagesView> = {}): MessagesView {
  return { ...DEFAULT_MESSAGES_VIEW, ...patch };
}

const NOW = new Date("2026-09-19T15:00:00").getTime();

describe("порядок розмов", () => {
  it("розмова без повідомлень стоїть унизу, а не «нуль років тому»", () => {
    const old = conversation({
      peer: peer({ id: 1, contactName: "Старий" }),
      lastMessageAt: "2026-01-01 10:00:00",
    });
    const fresh = conversation({
      peer: peer({ id: 2, contactName: "Свіжий" }),
      lastMessageAt: "2026-09-19 14:00:00",
    });
    const empty = conversation({
      peer: peer({ id: 3, contactName: "Порожній" }),
      lastMessageAt: null,
      lastMessageText: null,
      lastSenderId: null,
    });

    expect(sortConversations([empty, old, fresh], "recent").map((c) => c.peer.id)).toEqual([
      2, 1, 3,
    ]);
  });

  it("«непрочитані спершу» не переставляє решту", () => {
    const read = conversation({
      peer: peer({ id: 1 }),
      lastMessageAt: "2026-09-19 14:00:00",
    });
    const unreadOld = conversation({
      peer: peer({ id: 2 }),
      lastMessageAt: "2026-09-18 14:00:00",
      unread: 2,
    });
    const unreadNew = conversation({
      peer: peer({ id: 3 }),
      lastMessageAt: "2026-09-19 13:00:00",
      unread: 5,
    });

    expect(sortConversations([read, unreadOld, unreadNew], "unread").map((c) => c.peer.id)).toEqual(
      [3, 2, 1],
    );
  });

  it("за іменем — за абеткою того підпису, який видно", () => {
    const names = ["Явір", "Богдан", "Анна"].map((contactName, index) =>
      conversation({ peer: peer({ id: index + 1, contactName }) }),
    );

    expect(sortConversations(names, "name").map((c) => c.peer.contactName)).toEqual([
      "Анна",
      "Богдан",
      "Явір",
    ]);
  });

  it("сортування не чіпає вхідний масив", () => {
    const input = [
      conversation({ peer: peer({ id: 2 }) }),
      conversation({ peer: peer({ id: 1 }) }),
    ];
    sortConversations(input, "recent");
    expect(input.map((c) => c.peer.id)).toEqual([2, 1]);
  });
});

describe("пошук і фільтр", () => {
  const karas = conversation({
    peer: peer({
      id: 1,
      contactName: "Карась Х",
      platformUsername: "karas",
      username: "BotChannel",
    }),
    lastMessageText: "Прикольно",
  });

  it("знаходить і за нашим іменем, і за хендлом, і за текстом повідомлення", () => {
    // Людина може пам'ятати будь-що з трьох: ім'я, яке дала сама, нік — який
    // бачила в Telegram, і слово з останнього листа.
    for (const query of ["карась", "karas", "botchannel", "прикольно"]) {
      expect(filterConversations([karas], view({ query }))).toHaveLength(1);
    }
    expect(filterConversations([karas], view({ query: "нема" }))).toHaveLength(0);
  });

  it("кілька слів з'єднуються через «і», а не «або»", () => {
    expect(filterConversations([karas], view({ query: "карась прикольно" }))).toHaveLength(1);
    expect(filterConversations([karas], view({ query: "карась інше" }))).toHaveLength(0);
  });

  it("«непрочитані» лишає лише ті, де є що читати", () => {
    const read = conversation({ peer: peer({ id: 1 }), unread: 0 });
    const unread = conversation({ peer: peer({ id: 2 }), unread: 1 });

    expect(
      filterConversations([read, unread], view({ filter: "unread" })).map((c) => c.peer.id),
    ).toEqual([2]);
  });

  it("«без повідомлень» лишає ті, з яких ще тільки починають", () => {
    // Це фільтр, а не порядок: «порожні згори» показало б ті самі розмови.
    const started = conversation({ peer: peer({ id: 1 }) });
    const empty = conversation({
      peer: peer({ id: 2 }),
      lastMessageAt: null,
      lastMessageText: null,
      lastSenderId: null,
    });

    expect(
      filterConversations([started, empty], view({ filter: "empty" })).map((c) => c.peer.id),
    ).toEqual([2]);
  });
});

describe("групи", () => {
  const today = conversation({
    peer: peer({ id: 1, contactName: "Сьогоднішній" }),
    lastMessageAt: "2026-09-19 14:00:00",
  });
  const yesterday = conversation({
    peer: peer({ id: 2, contactName: "Вчорашній" }),
    lastMessageAt: "2026-09-18 14:00:00",
  });
  const empty = conversation({
    peer: peer({ id: 3, contactName: "Без повідомлень" }),
    lastMessageAt: null,
    lastMessageText: null,
    lastSenderId: null,
  });

  it("типово груп немає — один титул, який екран не показує", () => {
    const groups = buildConversationGroups([today, yesterday], view(), NOW);

    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("none");
    expect(groups[0].conversations).toHaveLength(2);
  });

  it("у «днях» розмова без повідомлень не зникає — вона окремою групою внизу", () => {
    const groups = buildConversationGroups(
      [today, yesterday, empty],
      view({ groupBy: "day" }),
      NOW,
    );

    expect(groups.map((group) => group.label)).toEqual(["Сьогодні", "Вчора", EMPTY_THREADS_LABEL]);
    expect(groups.at(-1)?.conversations.map((c) => c.peer.id)).toEqual([3]);
  });

  it("нічого не знайшлось — жодної групи, а не порожня", () => {
    // Порожня група в розмітці дала б титул над нічим.
    expect(buildConversationGroups([today], view({ query: "нема такого" }), NOW)).toEqual([]);
  });
});

describe("чипи вибраного", () => {
  it("типовий вигляд — жодного чипа", () => {
    expect(conversationViewChips(view())).toEqual([]);
  });

  it("кожен вибір — свій чип, і фільтр стоїть одразу після пошуку", () => {
    const chips = conversationViewChips(
      view({
        query: "карась",
        filter: "unread",
        sort: "name",
        groupBy: "day",
        layout: "cards",
        columns: 2,
      }),
    );

    expect(chips.map((chip) => chip.key)).toEqual(["query", "filter", "sort", "group", "layout"]);
    // Скидання чипа чіпає РІВНО один вибір.
    expect(chips.map((chip) => Object.keys(chip.reset))).toEqual([
      ["query"],
      ["filter"],
      ["sort"],
      ["groupBy"],
      ["layout", "columns"],
    ]);
  });

  it("зняття чипа вертає типовий вибір, а не порожнечу", () => {
    const [chip] = conversationViewChips(view({ filter: "empty" }));

    expect(chip.label).toBe("Порожні");
    expect({ ...view(), ...chip.reset }).toEqual(DEFAULT_MESSAGES_VIEW);
  });

  it("«усі розмови» — не вибір: чипа немає", () => {
    expect(conversationViewChips(view({ filter: "all" }))).toEqual([]);
  });
});
