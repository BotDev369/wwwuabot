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
  peerLabel,
  type Conversation,
  type Message,
  type MessageDraft,
  type MessagePeer,
} from "@wwwuabot/shared/messages";
import { DEFAULT_COLLECTION_VIEW } from "../collection";
import { ConversationList } from "./ConversationList";
import { DraftList } from "./DraftList";
import { MessagesToolbar } from "./MessagesToolbar";
import { NewMessagePicker } from "./NewMessagePicker";
import { NewMessageSheet } from "./NewMessageSheet";
import { DRAFTS_GROUP_LABEL, NO_RECIPIENT_LABEL, draftRecipientLabel } from "./drafts";
import { ThreadSheet } from "./ThreadSheet";
import { DEFAULT_MESSAGES_VIEW } from "./types";
import { NO_PEERS_HINT, NO_PEERS_TITLE } from "./empty";
import { conversationLine, draftLine } from "./lines";
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
    body: "#karas запрошує до конфіденційної бесіди",
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

describe("рядок чернетки", () => {
  const draft: MessageDraft = {
    id: 1,
    peerId: PEER.id,
    body: "  Хай, вася\n))  ",
    updatedAt: "2026-09-19 13:00:00",
  };

  it("показує свій текст одним рядком — переноси не ламають список", () => {
    expect(draftLine(draft)).toBe("Хай, вася ))");
  });

  it("адресат підписаний тим самим словом, що в листуванні", () => {
    // Інакше та сама людина в списку чернеток і в розмові звалася б по-різному.
    expect(draftRecipientLabel(draft, [PEER])).toBe("#karas");
    expect(draftRecipientLabel(draft, [PEER])).toBe(peerLabel(PEER));
  });

  it("чернетка без адресата — не порожня клітинка, а чесний стан", () => {
    // Лист без «кому» людина справді завела: місце адресата ще не вибрано, і
    // сказати про це треба словом, а не порожнечею.
    expect(draftRecipientLabel({ ...draft, peerId: null }, [PEER])).toBe(NO_RECIPIENT_LABEL);
  });
});

describe("блок чернеток", () => {
  const drafts: MessageDraft[] = [
    { id: 1, peerId: PEER.id, body: "перша", updatedAt: "2026-09-19 13:00:00" },
    { id: 2, peerId: null, body: "друга", updatedAt: "2026-09-19 12:00:00" },
  ];

  function block(items: readonly MessageDraft[], peers: readonly MessagePeer[] = [PEER]): string {
    return renderToStaticMarkup(
      <DraftList
        drafts={items}
        peers={peers}
        onOpen={() => {}}
        collection={DEFAULT_COLLECTION_VIEW}
      />,
    );
  }

  it("немає чернеток — немає й блока: заголовок без вмісту нічого не каже", () => {
    expect(block([])).toBe("");
  });

  it("кожна чернетка — свій рядок: одна людина може мати їх кілька", () => {
    const html = block([...drafts, { ...drafts[0], id: 3, body: "третя" }]);

    expect(html).toContain(DRAFTS_GROUP_LABEL);
    expect(html).toContain("перша");
    expect(html).toContain("третя");
  });

  it("адресат і «без отримувача» стоять в одному блоці", () => {
    const html = block(drafts);

    expect(html).toContain("#karas");
    expect(html).toContain(NO_RECIPIENT_LABEL);
    expect(html).toContain("друга");
  });

  it("розкладка приходить класом кирпичика, а не другим списком", () => {
    const html = renderToStaticMarkup(
      <DraftList
        drafts={drafts}
        peers={[PEER]}
        onOpen={() => {}}
        collection={{ layout: "cards", columns: 2 }}
      />,
    );

    expect(html).toContain("wb-collection--cards");
    expect(html).toContain("wb-conv-name");
  });
});

describe("список розмов", () => {
  it("ім'я — наше, другим рядком ім'я на платформі, і це видно того, хто не бачить", () => {
    const html = list([conversation({ peer: { ...PEER, contactName: "Карась Х" } })]);

    expect(html).toContain("Карась Х");
    expect(html).toContain("#karas");
    expect(html).toContain('aria-label="Карась Х. привіт"');
  });

  it("без свого імені — ім'я на платформі, Telegram — другим рядком", () => {
    const html = list([conversation()]);

    expect(html).toContain("#karas");
    expect(html).toContain("@serg");
    expect(html).toContain('aria-label="#karas. привіт"');
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

  it("вибір людини показує тих, кому лист дійде, а не всіх підряд", () => {
    // Перелік дає сервер (зв'язані через контакти), і других дверей до людей
    // тут немає.
    const html = renderToStaticMarkup(
      <NewMessagePicker recipients={[PEER]} onSelect={() => {}} onClose={() => {}} />,
    );

    expect(html).toContain("Нове повідомлення");
    expect(html).toContain("#karas");
  });

  it("порядок у виборі не переставляємо: його задає сервер одним правилом", () => {
    // Друге сортування в клієнті означало б, що один список виглядає по-різному
    // залежно від того, хто його намалював.
    const people: MessagePeer[] = [
      { ...PEER, id: 1, contactName: "Явір" },
      { ...PEER, id: 2, contactName: "Анна" },
    ];

    const html = renderToStaticMarkup(
      <NewMessagePicker recipients={people} onSelect={() => {}} onClose={() => {}} />,
    );

    expect(html.indexOf("Явір")).toBeLessThan(html.indexOf("Анна"));
  });

  it("вибір без жодного співрозмовника каже, чому людей немає, а не малює порожню поверхню", () => {
    // «+» стоїть на екрані завжди (смуга керування — хром), тож її натискають
    // і тоді, коли писати нікому. Порожня поверхня в цей момент читалася б як
    // зламана кнопка.
    const html = renderToStaticMarkup(
      <NewMessagePicker recipients={[]} onSelect={() => {}} onClose={() => {}} />,
    );

    expect(html).toContain(NO_PEERS_TITLE);
    expect(html).toContain("Контакти");
  });

  it("обраного адресата можна **прибрати** — лист без «кому» це стан", () => {
    // Вибір мусить мати шлях назад: інакше лист із випадково обраним адресатом
    // довелося б писати саме йому.
    const html = renderToStaticMarkup(
      <NewMessagePicker
        recipients={[PEER]}
        onSelect={() => {}}
        onClear={() => {}}
        onClose={() => {}}
      />,
    );

    expect(html).toContain(NO_RECIPIENT_LABEL);
    expect(html).toContain(peerLabel(PEER));
  });

  it("нікого не обрано — пункту «без отримувача» немає: він нічого не робив би", () => {
    const html = renderToStaticMarkup(
      <NewMessagePicker recipients={[PEER]} onSelect={() => {}} onClose={() => {}} />,
    );

    expect(html).not.toContain(NO_RECIPIENT_LABEL);
  });

  it("той самий текст, що в порожньому списку: один стан — одні слова", () => {
    // `renderToStaticMarkup` екранує апострофи (`&#x27;`), тож порівнюємо з
    // текстом у тому вигляді, у якому його прочитає людина.
    const empty = list([]).replace(/&#x27;/g, "'");

    expect(empty).toContain(NO_PEERS_TITLE);
    expect(empty).toContain(NO_PEERS_HINT);
  });
});

describe("форма нового повідомлення", () => {
  function sheet(recipients: readonly MessagePeer[], draft: MessageDraft | null = null): string {
    return renderToStaticMarkup(
      <NewMessageSheet
        recipients={recipients}
        draft={draft}
        onSaveDraft={async () => true}
        onSend={async () => true}
        onDeleteDraft={async () => true}
        onClose={() => {}}
      />,
    );
  }

  it("це форма: адресат, тіло й дві різні дії — надіслати чи зберегти", () => {
    const html = sheet([PEER]);

    expect(html).toContain("Кому");
    expect(html).toContain("Тіло");
    expect(html).toContain("Зберегти чернетку");
    expect(html).toContain("Надіслати");
  });

  it("«+» відкриває **чистий** лист: ні адресата, ні тексту з чернеток", () => {
    // Саме на цьому й спіткнулась робота: «+» підставляв найсвіжу чернетку, і
    // почати новий лист було нічим. Форму з чернеткою відкриває її рядок.
    const html = sheet([PEER]);

    expect(html).toContain(NO_RECIPIENT_LABEL);
    // Обидві дії гаснуть: ні адресата, ні тексту — ні надіслати, ні зберегти.
    expect(html.match(/disabled=""/g)).toHaveLength(2);
  });

  it("чернетку без адресата **можна зберегти** — текст уже написано", () => {
    // Саме тому адресат необов'язковий: лист буває початий до рішення про «кому».
    const draft: MessageDraft = {
      id: 3,
      peerId: null,
      body: "комусь, потім вирішу",
      updatedAt: "2026-09-19 12:00:00",
    };

    const html = sheet([PEER], draft);

    expect(html).toContain(NO_RECIPIENT_LABEL);
    expect(html).toContain("комусь, потім вирішу");
    // Зберегти можна навіть без адресата — а надіслати ні (одна гасла, друга ні).
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });

  it("чернетка з рядка приходить у форму зі своїм адресатом і текстом", () => {
    const draft: MessageDraft = {
      id: 7,
      peerId: PEER.id,
      body: "його текст",
      updatedAt: "2026-09-19 09:00:00",
    };

    const html = sheet([PEER], draft);

    expect(html).toContain("#karas");
    expect(html).toContain("його текст");
    // Обидві дії живі: і надіслати, і зберегти.
    expect(html).not.toContain("disabled");
  });

  it("у наявної чернетки кнопка збереження жива навіть із порожнім текстом", () => {
    // Ця сама дія її й прибирає: чернетка без тексту не несе нічого, і лишати
    // по собі порожній рядок нема чого.
    const html = sheet([PEER], {
      id: 4,
      peerId: PEER.id,
      body: "   ",
      updatedAt: "2026-09-19 12:00:00",
    });

    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });

  it("прибрати чернетку можна лише в наявної, і ця дія названа словом", () => {
    // Ненадісланий лист зникає назавжди, тож прибирання мусить бути видно й
    // названо — а не через здогад «стерти все поле й зберегти».
    const draft: MessageDraft = {
      id: 9,
      peerId: PEER.id,
      body: "ще не пішло",
      updatedAt: "2026-09-19 12:00:00",
    };

    expect(sheet([PEER], draft)).toContain("Видалити");
    // А новому листу прибирати нічого: кнопка, що нічого не робить, — це кнопка,
    // яку тицяють даремно.
    expect(sheet([PEER])).not.toContain("Видалити");
  });

  it("писати нікому — форма лишається: чернетку все одно можна завести", () => {
    // Адресата взяти ніде, але текст — це те, що людина написала: форма мусить
    // його прийняти, а не підмінятися порожнім станом.
    const html = sheet([]);

    expect(html).toContain("Зберегти чернетку");
    expect(html).toContain(NO_RECIPIENT_LABEL);
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
    expect(html).toContain("#karas");
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
    expect(html.indexOf("#karas")).toBeLessThan(html.indexOf("wb-thread-actions"));
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
