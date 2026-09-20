/**
 * Правила повідомлень: тіло, пара розмови, підпис і час.
 *
 * Це чисті функції, і саме тому вони тут, а не «десь у компоненті»: кожна з них
 * ламається мовчки. `conversationPair` — розмова стає двома рядками (і кожен
 * бачить половину переписки); `sanitizeMessageBody` — обрізаний текст у базі;
 * `peerLabel` — чуже ім'я замість того, яким людину назвав той, хто дивиться
 * (AGENTS.md §2); `peerPublicLabel(..., "telegram")` — позначка перед іменем на
 * платформі, з якої Telegram робить або посилання (`@`), або хештег (`#`).
 *
 * @module @wwwuabot/shared/messages/rules.test
 */

import { describe, expect, it } from "vitest";
import {
  conversationPair,
  isSendableBody,
  messagePreview,
  peerOf,
  sanitizeMessageBody,
  MAX_MESSAGE_BODY,
} from "./fields";
import { peerInitial, peerLabel, peerPublicLabel, peerSecondary } from "./peer";
import { messageClock, messageTime } from "./time";
import type { MessagePeer } from "./types";

const PEER: MessagePeer = {
  id: 42,
  firstName: "Сергій",
  lastName: "Дискант",
  username: "serg",
  platformUsername: "karas",
  contactName: null,
  photoUrl: null,
};

describe("тіло повідомлення", () => {
  it("притискає краї й має стелю", () => {
    expect(sanitizeMessageBody("  Куку   ")).toBe("Куку");
    expect(sanitizeMessageBody("я".repeat(MAX_MESSAGE_BODY + 100))).toHaveLength(MAX_MESSAGE_BODY);
    expect(sanitizeMessageBody(null)).toBe("");
    expect(sanitizeMessageBody(7)).toBe("");
  });

  it("самих пробілів не досить, щоб надіслати", () => {
    expect(isSendableBody("   ")).toBe(false);
    expect(isSendableBody("\n\t")).toBe(false);
    expect(isSendableBody("привіт")).toBe(true);
  });

  it("рядок списку — один рядок: переноси згортаються, довге ріжеться", () => {
    expect(messagePreview("перше\n\nдруге")).toBe("перше друге");
    expect(messagePreview("я".repeat(200))).toHaveLength(80);
    expect(messagePreview("я".repeat(200)).endsWith("…")).toBe(true);
    // Коротке лишається як є — і без хвостового многоточія.
    expect(messagePreview("привіт")).toBe("привіт");
  });
});

describe("пара розмови", () => {
  it("порядок не залежить від того, хто пише першим", () => {
    expect(conversationPair(42, 7)).toEqual([7, 42]);
    expect(conversationPair(7, 42)).toEqual([7, 42]);
    // Той самий id — теж пара: окремого випадку тут бути не мусить.
    expect(conversationPair(7, 7)).toEqual([7, 7]);
  });

  it("співрозмовник — той, хто не я", () => {
    expect(peerOf(7, 42, 7)).toBe(42);
    expect(peerOf(7, 42, 42)).toBe(7);
  });
});

describe("підпис співрозмовника", () => {
  // Наше ім'я першим — воно є іменем людини в продукті **для того, хто
  // дивиться**; далі її власне ім'я на платформі, і лише потім Telegram.
  it("ім'я зі свого довідника йде першим", () => {
    expect(peerLabel({ ...PEER, contactName: "Карась Х" })).toBe("Карась Х");
    // Другий рядок тоді — хто це на платформі, а не ім'я з Telegram.
    expect(peerSecondary({ ...PEER, contactName: "Карась Х" })).toBe("#karas");
  });

  it("без свого імені — ім'я на платформі, далі Telegram-хендл, і лише потім ім'я з Telegram", () => {
    expect(peerLabel(PEER)).toBe("#karas");
    expect(peerLabel({ ...PEER, platformUsername: null })).toBe("@serg");
    expect(peerLabel({ ...PEER, platformUsername: null, username: null })).toBe("Сергій Дискант");
    expect(peerLabel(null)).toBe("Невідомий");
  });

  it("другий рядок — наступний підпис, і лише коли він не вже перший", () => {
    expect(peerSecondary(PEER)).toBe("@serg");
    // Хендл уже стоїть підписом — другий такий самий рядок був би шумом.
    const telegramOnly = { ...PEER, platformUsername: null, firstName: null, lastName: null };
    expect(peerSecondary(telegramOnly)).toBeNull();
  });

  it("позначка імені залежить від поверхні", () => {
    // `@` — синтаксис Telegram: клієнт робить із нього посилання на акаунт, а
    // `#` — хештег. Ім'я на платформі акаунтом не є, тож у тексті для бота
    // воно йде зовсім без позначки...
    expect(peerPublicLabel(PEER, "telegram")).toBe("karas");
    // ...а хендл її зберігає: він і є акаунт, посилання веде за адресою.
    expect(peerPublicLabel({ ...PEER, platformUsername: null }, "telegram")).toBe("@serg");
    // На наших поверхнях ім'я на платформі позначене `#` — поруч із `@` видно,
    // котре з них наше, а котре з Telegram.
    expect(peerPublicLabel(PEER)).toBe("#karas");
  });

  it("літера для аватара збігається з тим, що видно поруч", () => {
    expect(peerInitial(PEER)).toBe("K");
    expect(peerInitial({ ...PEER, contactName: "карась" })).toBe("К");
    expect(peerInitial(null)).toBe("?");
  });
});

describe("час повідомлення", () => {
  const now = new Date("2026-09-19T15:00:00Z");

  it("сьогодні — години й хвилини, цього року — дата, давніше — дата з роком", () => {
    const today = new Date(now);
    today.setHours(9, 5, 0, 0);
    const thisYear = new Date(now);
    thisYear.setMonth(0, 3);
    thisYear.setHours(8, 0, 0, 0);

    expect(messageTime(today.toISOString(), now)).toBe("09:05");
    expect(messageTime(thisYear.toISOString(), now)).toMatch(/^03\.01$/);
    expect(messageTime("2025-03-03 08:00:00", now)).toMatch(/^03\.03\.2025$/);
  });

  it("непорозуміла дата мовчить, а не показує сирий рядок", () => {
    expect(messageTime("не дата", now)).toBe("");
    expect(messageTime(null, now)).toBe("");
    expect(messageClock("")).toBe("");
  });

  it("під бульбашкою — завжди години й хвилини: місця там досить", () => {
    expect(messageClock("2025-03-03 08:07:00")).toBe("08:07");
  });
});
