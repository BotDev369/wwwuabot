/**
 * Вітання пари й адреса розмови — правила, які ламаються мовчки.
 *
 * Вітання: ланцюг підписів у ньому публічний, тож ім'я з довідника туди
 * потрапити не може (AGENTS.md §2) — інакше одну людину названо так, як її
 * назвав інший, а читають цей рядок обоє.
 *
 * Адреса: ту саму `/messages?peer=` складає бот і читає платформа, і помилка в
 * ній веде не в помилку, а в порожній список — тобто виглядає як «щось не
 * завантажилось».
 *
 * @module @wwwuabot/shared/messages/greeting.test
 */

import { describe, expect, it } from "vitest";
import { conversationGreeting, greetingNotes } from "./greeting";
import { peerPublicLabel } from "./peer";
import { MESSAGES_PATH, messagesPeerPath, readMessagesPeer } from "./route";
import { SYSTEM_SENDER_ID } from "./fields";
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

describe("вітання пари", () => {
  it("називає того, хто запросив, і каже про встановлений контакт", () => {
    const greeting = conversationGreeting("#karas");

    expect(greeting.invited).toContain("#karas");
    expect(greeting.invited).toContain("запрошує");
    expect(greeting.connected).toContain("Контакт встановлено");
  });

  it("у стрічку кладуться обидві позначки, і саме в цьому порядку", () => {
    const [invited, connected] = greetingNotes("#karas");

    expect(invited).toContain("запрошує");
    expect(connected).toContain("Контакт встановлено");
  });

  it("ім'я в спільному рядку публічне: довідник належить тому, хто дивиться", () => {
    // Ім'я «Карась Х» людині дав хтось інший — показати його третій особі не
    // можна, тож публічний підпис іде без нього.
    expect(peerPublicLabel({ ...PEER, contactName: "Карась Х" })).toBe("#karas");
    expect(peerPublicLabel({ ...PEER, platformUsername: null })).toBe("@serg");
    expect(peerPublicLabel({ ...PEER, platformUsername: null, username: null })).toBe(
      "Сергій Дискант",
    );
    expect(peerPublicLabel(null)).toBe("Невідомий");
  });

  it("системний автор — не людина: Telegram-id завжди додатний", () => {
    expect(SYSTEM_SENDER_ID).toBe(0);
  });
});

describe("адреса розмови", () => {
  it("складається тим самим шляхом, що читає екран", () => {
    expect(messagesPeerPath(42)).toBe(`${MESSAGES_PATH}?peer=42`);
    expect(readMessagesPeer("42")).toBe(42);
  });

  it("без номера в адресі розмови немає — і це не «нульовий співрозмовник»", () => {
    expect(readMessagesPeer(null)).toBeNull();
    expect(readMessagesPeer(undefined)).toBeNull();
    expect(readMessagesPeer("")).toBeNull();
    expect(readMessagesPeer("0")).toBeNull();
    expect(readMessagesPeer("-7")).toBeNull();
    expect(readMessagesPeer("12abc")).toBeNull();
  });
});
