/**
 * Розмітка повідомлень: **що видно в рядку розмови й де стоїть бульбашка**.
 *
 * Перевіряємо те, що ламається тихо: своє позначається словом «Ви:»; число
 * непрочитаних з'являється лише тоді, коли воно є (нуль на іконці читався б як
 * «щось є»); бульбашка автора — праворуч, чужа — ліворуч (у переписці «хто
 * сказав» — половина змісту); кнопка надсилання гасне на порожньому полі, а не
 * зникає.
 *
 * @module @wwwuabot/ui/messages/messages.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Conversation, Message, MessagePeer } from "@wwwuabot/shared/messages";
import { ConversationList } from "./ConversationList";
import { ThreadSheet } from "./ThreadSheet";
import { conversationLine } from "./lines";

const ME = 7;
const PEER: MessagePeer = {
  id: 42,
  firstName: "Сергій",
  lastName: null,
  username: "serg",
  platformUsername: "karas",
  photoUrl: null,
};

function conversation(patch: Partial<Conversation> = {}): Conversation {
  return {
    peer: PEER,
    lastMessageAt: "2026-09-19 12:00:00",
    lastMessageText: "привіт",
    lastSenderId: PEER.id,
    unread: 0,
    ...patch,
  };
}

const MESSAGES: Message[] = [
  { id: 1, senderId: PEER.id, body: "привіт", createdAt: "", readAt: null },
  { id: 2, senderId: ME, body: "ага", createdAt: "", readAt: null },
];

describe("conversationLine", () => {
  it("своє позначає словом «Ви:» — інакше чуже читалось би як своє", () => {
    expect(conversationLine(conversation({ lastSenderId: ME }), ME)).toBe("Ви: привіт");
    expect(conversationLine(conversation(), ME)).toBe("привіт");
  });

  it("порожня розмова каже, що з неї почати", () => {
    expect(conversationLine(conversation({ lastMessageText: null, lastSenderId: null }), ME)).toBe(
      "Почніть розмову",
    );
  });
});

describe("список розмов", () => {
  it("ім'я — з платформи, Telegram — другим рядком, і це видно того, хто не бачить", () => {
    const html = renderToStaticMarkup(
      <ConversationList conversations={[conversation()]} meId={ME} onOpen={() => {}} />,
    );

    expect(html).toContain("@karas");
    expect(html).toContain("@serg");
    expect(html).toContain('aria-label="@karas. привіт"');
  });

  it("число непрочитаних — лише коли воно є", () => {
    const read = renderToStaticMarkup(
      <ConversationList conversations={[conversation()]} meId={ME} onOpen={() => {}} />,
    );
    const unread = renderToStaticMarkup(
      <ConversationList
        conversations={[conversation({ unread: 3 })]}
        meId={ME}
        onOpen={() => {}}
      />,
    );

    expect(read).not.toContain("wb-conv-unread");
    // Нуль на іконці читався б як «щось є» — тому або число, або нічого.
    expect(
      renderToStaticMarkup(
        <ConversationList
          conversations={[conversation({ unread: 0 })]}
          meId={ME}
          onOpen={() => {}}
        />,
      ),
    ).not.toContain("wb-conv-unread");
    expect(unread).toContain("wb-conv-unread");
    expect(unread).toContain(">3<");
  });

  it("порожній список каже, що писати нікому, і як це змінити", () => {
    // Список показує й тих, із ким розмова ще не почата, тож цей стан — саме
    // «немає з ким», а не «немає повідомлень».
    const html = renderToStaticMarkup(
      <ConversationList conversations={[]} meId={ME} onOpen={() => {}} />,
    );

    expect(html).toContain("Ще немає з ким листуватись");
    expect(html).toContain("контакти");
  });

  it("розмова без жодного повідомлення чекає першого", () => {
    const html = renderToStaticMarkup(
      <ConversationList
        conversations={[
          conversation({ lastMessageAt: null, lastMessageText: null, lastSenderId: null }),
        ]}
        meId={ME}
        onOpen={() => {}}
      />,
    );

    expect(html).toContain("Почніть розмову");
  });
});

describe("поверхня розмови", () => {
  it("своя бульбашка — праворуч, чужа — ліворуч", () => {
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={MESSAGES}
        onSend={async () => true}
        onClose={() => {}}
      />,
    );

    expect(html).toContain("wb-bubble--in");
    expect(html).toContain("wb-bubble--out");
    // Порядок у стрічці: чуже («привіт») — першим, своє («ага») — другим.
    expect(html.indexOf("привіт")).toBeLessThan(html.indexOf("ага"));
  });

  it("шапка називає співрозмовника й несе «назад» замість виходу", () => {
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={MESSAGES}
        onSend={async () => true}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Назад"');
    expect(html).toContain('aria-label="@karas"');
  });

  it("порожня розмова — не порожній екран: каже, що робити", () => {
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={[]}
        onSend={async () => true}
        onClose={() => {}}
      />,
    );

    expect(html).toContain("Напишіть перше");
  });

  it("кнопка надсилання гасне на порожньому полі, а не зникає", () => {
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={[]}
        onSend={async () => true}
        onClose={() => {}}
      />,
    );

    // На телефоні hover не існує, тож дія мусить бути видимою завжди (§3).
    expect(html).toContain('aria-label="Надіслати"');
    expect(html).toContain("disabled");
  });
});
