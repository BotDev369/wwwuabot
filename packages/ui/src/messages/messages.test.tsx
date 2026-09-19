/**
 * Розмітка повідомлень: **що видно в рядку розмови й де стоїть бульбашка**.
 *
 * Перевіряємо те, що ламається тихо: ім'я береться в правильному порядку (спершу
 * те, яким людину назвав той, хто дивиться); своє позначається словом «Ви:»;
 * число непрочитаних з'являється лише тоді, коли воно є (нуль на іконці читався
 * б як «щось є»); бульбашка автора — праворуч, чужа — ліворуч (у переписці «хто
 * сказав» — половина змісту); кнопка надсилання гасне на порожньому полі, а не
 * зникає; два порожніх стани кажуть **різне** — «немає з ким» і «нічого не
 * знайдено».
 *
 * @module @wwwuabot/ui/messages/messages.test
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  SYSTEM_SENDER_ID,
  type Conversation,
  type Message,
  type MessagePeer,
} from "@wwwuabot/shared/messages";
import { DEFAULT_COLLECTION_VIEW } from "../collection";
import { ConversationList } from "./ConversationList";
import { MessagesToolbar } from "./MessagesToolbar";
import { NewMessagePicker } from "./NewMessagePicker";
import { ThreadSheet } from "./ThreadSheet";
import { DEFAULT_MESSAGES_VIEW } from "./types";
import { conversationLine } from "./lines";
import { buildConversationGroups } from "./view";

const ME = 7;
const PEER: MessagePeer = {
  id: 42,
  firstName: "Сергій",
  lastName: null,
  username: "serg",
  platformUsername: "karas",
  contactName: null,
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

/** Екран зводить список саме так: спільні правила — а тоді розмітка. */
function list(
  conversations: readonly Conversation[],
  props: { collection?: typeof DEFAULT_COLLECTION_VIEW } = {},
): string {
  return renderToStaticMarkup(
    <ConversationList
      groups={buildConversationGroups(conversations, DEFAULT_MESSAGES_VIEW)}
      total={conversations.length}
      meId={ME}
      onOpen={() => {}}
      collection={props.collection ?? DEFAULT_COLLECTION_VIEW}
    />,
  );
}

const MESSAGES: Message[] = [
  { id: 1, senderId: PEER.id, body: "привіт", createdAt: "", readAt: null, system: false },
  { id: 2, senderId: ME, body: "ага", createdAt: "", readAt: null, system: false },
];

/** Стрічка, яку відкриває запрошення: дві позначки платформи й жодної репліки. */
const GREETED: Message[] = [
  {
    id: 1,
    senderId: SYSTEM_SENDER_ID,
    body: "@karas запрошує до конфіденційної бесіди",
    createdAt: "",
    readAt: "",
    system: true,
  },
  {
    id: 2,
    senderId: SYSTEM_SENDER_ID,
    body: "Контакт встановлено — тепер ви на зв'язку одне з одним",
    createdAt: "",
    readAt: "",
    system: true,
  },
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
  it("ім'я — наше, другим рядком ім'я на платформі, і це видно того, хто не бачить", () => {
    const html = list([conversation({ peer: { ...PEER, contactName: "Карась Х" } })]);

    expect(html).toContain("Карась Х");
    expect(html).toContain("@karas");
    expect(html).toContain('aria-label="Карась Х. привіт"');
  });

  it("без свого імені — ім'я на платформі, Telegram — другим рядком", () => {
    const html = list([conversation()]);

    expect(html).toContain("@karas");
    expect(html).toContain("@serg");
    expect(html).toContain('aria-label="@karas. привіт"');
  });

  it("число непрочитаних — лише коли воно є", () => {
    expect(list([conversation()])).not.toContain("wb-conv-unread");
    // Нуль на іконці читався б як «щось є» — тому або число, або нічого.
    expect(list([conversation({ unread: 0 })])).not.toContain("wb-conv-unread");

    const unread = list([conversation({ unread: 3 })]);
    expect(unread).toContain("wb-conv-unread");
    expect(unread).toContain(">3<");
  });

  it("розкладка приходить класом кирпичика, а не другим списком", () => {
    // Та сама розмітка з різною розкладкою: другий набір розмітки розійшовся б
    // із першим на першій же правці.
    const cards = list([conversation()], {
      collection: { layout: "cards", columns: 2 },
    });

    expect(cards).toContain("wb-collection--cards");
    expect(cards).toContain("wb-collection--cols-2");
    expect(cards).toContain("wb-conv-name");
  });

  it("порожній список каже, що писати нікому, і як це змінити", () => {
    // Список показує й тих, із ким розмова ще не почата, тож цей стан — саме
    // «немає з ким», а не «немає повідомлень».
    const html = list([]);

    expect(html).toContain("Ще немає з ким листуватись");
    expect(html).toContain("контакти");
  });

  it("«нічого не знайдено» — не те саме, що «немає з ким»", () => {
    // Розмови є, але їх відсіяли: сказати тут «немає з ким» означало б збрехати
    // й не лишити виходу.
    const html = renderToStaticMarkup(
      <ConversationList
        groups={[]}
        total={3}
        meId={ME}
        onOpen={() => {}}
        collection={DEFAULT_COLLECTION_VIEW}
        onReset={() => {}}
      />,
    );

    expect(html).toContain("Нічого не знайдено");
    expect(html).toContain("Скинути пошук і фільтри");
    expect(html).not.toContain("Ще немає з ким листуватись");
  });

  it("розмова без жодного повідомлення чекає першого", () => {
    const html = list([
      conversation({ lastMessageAt: null, lastMessageText: null, lastSenderId: null }),
    ]);

    expect(html).toContain("Почніть розмову");
  });
});

describe("нове повідомлення", () => {
  it("«+» у смузі — це дія, і вона називає себе словом", () => {
    // У ряду клітинок знак без підпису, тож ім'я мусить бути в `aria-label`: без
    // нього кнопка не має назви для того, хто не бачить знака.
    const html = renderToStaticMarkup(
      <MessagesToolbar
        view={DEFAULT_MESSAGES_VIEW}
        onChange={() => {}}
        shown={1}
        total={1}
        onNew={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Нове повідомлення"');
    expect(html).toContain("wb-tools-add");
  });

  it("вибір людини йде за абеткою: тут шукають людину, а не останнє повідомлення", () => {
    const people = [
      conversation({ peer: { ...PEER, id: 1, contactName: "Явір" } }),
      conversation({ peer: { ...PEER, id: 2, contactName: "Анна" } }),
    ];

    const html = renderToStaticMarkup(
      <NewMessagePicker conversations={people} onOpen={() => {}} onClose={() => {}} />,
    );

    expect(html).toContain("Нове повідомлення");
    expect(html.indexOf("Анна")).toBeLessThan(html.indexOf("Явір"));
  });

  it("вибір показує тих, кому лист дійде, а не всіх підряд", () => {
    // Список приходить із того самого джерела, що список розмов («кому я можу
    // писати»), і других дверей до людей тут немає.
    const html = renderToStaticMarkup(
      <NewMessagePicker conversations={[conversation()]} onOpen={() => {}} onClose={() => {}} />,
    );

    expect(html).toContain("@karas");
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
        onClear={() => {}}
        onDelete={() => {}}
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
        peer={{ ...PEER, contactName: "Карась Х" }}
        meId={ME}
        messages={MESSAGES}
        onSend={async () => true}
        onClear={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Назад"');
    expect(html).toContain('aria-label="Карась Х"');
    expect(html).toContain("@karas");
  });

  it("порожня розмова — не порожній екран: каже, що робити", () => {
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={[]}
        onSend={async () => true}
        onClear={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain("Напишіть перше");
  });

  it("дії над перепискою — у шапці, поруч з іменем і двома різними знаками", () => {
    // Знак без підпису мусить мати ім'я: інакше для того, хто не бачить іконки,
    // кнопка без назви. І їх саме **дві** — стирання й видалення це різні дії з
    // різними наслідками, тож одна кнопка на обидві змушувала б угадувати.
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={MESSAGES}
        onSend={async () => true}
        onClear={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain('aria-label="Очистити переписку"');
    expect(html).toContain('aria-label="Видалити розмову"');
    expect(html).toContain("wb-thread-actions");
    // Ім'я стоїть **до** дій: шапка читається як «з ким я говорю», а не як рядок
    // кнопок із підписом десь усередині.
    expect(html.indexOf("@karas")).toBeLessThan(html.indexOf("wb-thread-actions"));
  });

  it("кнопка надсилання гасне на порожньому полі, а не зникає", () => {
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={[]}
        onSend={async () => true}
        onClear={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    // На телефоні hover не існує, тож дія мусить бути видимою завжди (§3).
    expect(html).toContain('aria-label="Надіслати"');
    expect(html).toContain("disabled");
  });

  it("позначка платформи — не бульбашка: у переписці бік означає автора", () => {
    // Якби вітання виглядало як репліка, людина приписала б його співрозмовнику
    // — а воно від платформи, і автора в нього немає.
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={GREETED}
        onSend={async () => true}
        onClear={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain("wb-thread-system");
    expect(html).not.toContain("wb-bubble--out");
    expect(html).not.toContain("wb-bubble--in");
  });

  it("розмова, що почалась із запрошення, не каже «напишіть перше»", () => {
    // Ці два стани різні: порожня стрічка — новина для людини, а стрічка з
    // вітанням уже розповіла, хто на іншому кінці.
    const html = renderToStaticMarkup(
      <ThreadSheet
        peer={PEER}
        meId={ME}
        messages={GREETED}
        onSend={async () => true}
        onClear={() => {}}
        onDelete={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).not.toContain("Напишіть перше");
    expect(html).toContain("Контакт встановлено");
  });
});
