/**
 * Список розмов: два джерела в одному списку й прибране, яке не повертається.
 *
 * П'ять рішень, які роблять список «кому я можу поговорити», а не «що вже лежить
 * у базі»:
 *
 * 1. **Пара впорядкована** (`conversationPair`). Порівняння «`peer_a` — це я» на
 *    місці дало б другу розмову в того, хто написав першим: рядок один на пару.
 * 2. **Прибрана розмова ховається на стороні**, і фільтр стоїть у **обох**
 *    джерелах списку — інакше вона поверталася б другим із них як «Почніть
 *    розмову». Прапорці приходять з міграції як `NULL`, тому фільтр з `COALESCE`:
 *    без нього кожна жива розмова зникла б зі списку.
 * 3. **Останнє повідомлення лежить у розмові**, а не вибирається з `messages`, і
 *    непрочитані рахуються запитом: обидва числа мають бути правдою, а не другим
 *    сховищем.
 * 4. **Ті, з ким розмови ще немає, стоять унизу за абеткою** — інакше список
 *    переставлявся б сам собою від кожного відкриття.
 * 5. **`listRecipients` прибраних не відсікає**: прибрати розмову не означає
 *    «заборонити писати» — інакше пара мовчала б назавжди.
 *
 * D1 — фейковий: перевіряються рішення сервісу (умови в SQL, порядок, склад
 * списку), а не сервер SQLite.
 *
 * @module api-dev/src/services/messages/conversations.test
 */

import { describe, expect, it } from "vitest";

import {
  ensureConversation,
  findConversationId,
  listConversations,
  listRecipients,
  unreadTotal,
} from "./conversations";
import type { Env } from "../../shared/types";

const ME = 1;

interface Captured {
  sql: string;
  binds: unknown[];
}

interface ConversationRow {
  id: number;
  peer_a: number;
  peer_b: number;
  last_message_at: string | null;
  last_message_text: string | null;
  last_sender_id: number | null;
  hidden_a?: number | null;
  hidden_b?: number | null;
}

interface UserRow {
  user_id: number;
  first_name: string | null;
  platform_username: string | null;
}

/** Прапорці приходять з міграції як `NULL` — так і виглядає старий рядок. */
function conversation(overrides: Partial<ConversationRow> = {}): ConversationRow {
  return {
    id: 10,
    peer_a: ME,
    peer_b: 2,
    last_message_at: "2026-01-05 10:00:00",
    last_message_text: "Привіт",
    last_sender_id: 2,
    hidden_a: null,
    hidden_b: null,
    ...overrides,
  };
}

function user(id: number, name: string, platform: string | null = null): UserRow {
  return { user_id: id, first_name: name, platform_username: platform };
}

function makeEnv(options: {
  conversations?: ConversationRow[];
  linked?: number[];
  users?: UserRow[];
  unread?: { conversation_id: number; total: number }[];
  unreadTotal?: number;
}): { env: Env; statements: Captured[] } {
  const conversations = options.conversations ?? [];
  const statements: Captured[] = [];

  /** Мій бік у парі: `peer_a` — це я, коли `me` менший за співрозмовника. */
  const mySide = (row: ConversationRow): "a" | "b" => (row.peer_a === ME ? "a" : "b");
  const other = (row: ConversationRow): number =>
    mySide(row) === "a" ? Number(row.peer_b) : Number(row.peer_a);

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => {
          // Рахуємо бейдж першим: його запит містить `SELECT id FROM conversations`
          // підзапитом, тож перевірку номера розмови треба вести по початку рядка.
          if (/COUNT\(\*\) AS total FROM messages/.test(sql)) {
            return { total: options.unreadTotal ?? 0 };
          }
          if (/^\s*SELECT id FROM conversations WHERE peer_a/.test(sql)) {
            const [a, b] = record.binds;
            const hit = conversations.find((row) => row.peer_a === a && row.peer_b === b);
            return hit ? { id: hit.id } : null;
          }
          if (/INSERT INTO conversations/.test(sql)) return { id: 99 };
          return null;
        },
        all: async () => {
          if (/COALESCE\(hidden_a, 0\) = 1\).*OR \(peer_b = \? AND COALESCE\(hidden_b/.test(sql)) {
            // Запит прибраних: сторони не важливі, важливий мій бік.
            const hidden = conversations.filter(
              (row) => (mySide(row) === "a" ? row.hidden_a : row.hidden_b) === 1,
            );
            return {
              results: hidden.map((row) => ({ peer_a: row.peer_a, peer_b: row.peer_b })),
            };
          }
          if (/CASE WHEN owner_id = \? THEN joined_user_id/.test(sql)) {
            return { results: (options.linked ?? []).map((id) => ({ peer_id: id })) };
          }
          if (/FROM conversations/.test(sql) && /ORDER BY COALESCE\(last_message_at/.test(sql)) {
            // Основне джерело: моя сторона не прибрана, порядок — свіжий згори.
            const visible = conversations.filter(
              (row) => (mySide(row) === "a" ? row.hidden_a : row.hidden_b) !== 1,
            );
            return {
              results: visible.sort(
                (left, right) =>
                  String(right.last_message_at).localeCompare(String(left.last_message_at)) ||
                  right.id - left.id,
              ),
            };
          }
          if (/FROM messages/.test(sql)) return { results: options.unread ?? [] };
          if (/FROM users/.test(sql)) return { results: options.users ?? [] };
          if (/FROM contacts/.test(sql)) return { results: [] };
          return { results: [] };
        },
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };

  return { env: { DB: db } as unknown as Env, statements };
}

describe("номер розмови", () => {
  it("пара береться впорядкованою: той, хто написав першим, не отримує другої розмови", async () => {
    const { env, statements } = makeEnv({ conversations: [] });
    await findConversationId(env.DB, 5, 2);

    expect(statements[0].binds).toEqual([2, 5]);
  });

  it("розмови ще немає — це null, а не нуль", async () => {
    const { env } = makeEnv({ conversations: [] });
    expect(await findConversationId(env.DB, ME, 2)).toBeNull();
  });

  it("наявна розмова повертає свій номер", async () => {
    const { env } = makeEnv({ conversations: [conversation({ id: 10 })] });
    expect(await findConversationId(env.DB, ME, 2)).toBe(10);
  });

  it("створення йде одним запитом: два INSERT без UNIQUE дали б дві розмови на пару", async () => {
    const { env, statements } = makeEnv({});
    const id = await ensureConversation(env.DB, 5, 2);

    const insert = statements[0];
    expect(insert.sql).toContain("ON CONFLICT(peer_a, peer_b) DO UPDATE");
    expect(insert.binds.slice(0, 2)).toEqual([2, 5]);
    expect(id).toBe(99);
  });
});

describe("список розмов", () => {
  it("порядок і стеля задає сервер, а не клієнт", async () => {
    const { env, statements } = makeEnv({ conversations: [] });
    await listConversations(env, ME);

    const query = statements.find((s) => /ORDER BY COALESCE\(last_message_at/.test(s.sql));
    expect(query?.binds).toEqual([ME, ME, 100]);
    // Розмова без повідомлень має бути в списку — вона сортується за часом створення.
    expect(query?.sql).toContain("COALESCE(last_message_at, created_at) DESC");
  });

  it("прибрана з мого боку розмова не повертається другим джерелом", async () => {
    const { env } = makeEnv({
      conversations: [conversation({ id: 10, hidden_a: 1 })],
      linked: [2],
      users: [user(2, "Олесь")],
    });

    const list = await listConversations(env, ME);
    expect(list.map((item) => item.peer.id)).toEqual([]);
  });

  it("прихована сторона чужа: її розмова для мене лишається", async () => {
    const { env } = makeEnv({
      conversations: [conversation({ id: 10, peer_a: ME, peer_b: 2, hidden_b: 1 })],
      users: [user(2, "Олесь")],
    });

    const list = await listConversations(env, ME);
    expect(list.map((item) => item.peer.id)).toEqual([2]);
  });

  it("старий рядок із NULL у прапорцях не зникає зі списку", async () => {
    const { env } = makeEnv({
      conversations: [conversation({ hidden_a: null })],
      users: [user(2, "Олесь")],
    });

    const list = await listConversations(env, ME);
    expect(list.map((item) => item.peer.id)).toEqual([2]);
  });

  it("ті, з ким розмови ще немає, потрапляють у список — написати першим мусить хтось", async () => {
    const { env } = makeEnv({
      conversations: [],
      linked: [2, 3],
      users: [user(2, "Ярема"), user(3, "Андрій")],
    });

    const list = await listConversations(env, ME);
    expect(list.map((item) => item.peer.id)).toEqual([3, 2]);
    expect(list.every((item) => item.lastMessageAt === null && item.unread === 0)).toBe(true);
  });

  it("зв'язаний, з ким розмова вже є, не дублюється другим джерелом", async () => {
    const { env } = makeEnv({
      conversations: [conversation({ id: 10 })],
      linked: [2],
      users: [user(2, "Олесь")],
    });

    const list = await listConversations(env, ME);
    expect(list).toHaveLength(1);
  });

  it("непрочитані рахуються запитом, а не колонкою в розмові", async () => {
    const { env } = makeEnv({
      conversations: [conversation({ id: 10 })],
      users: [user(2, "Олесь")],
      unread: [{ conversation_id: 10, total: 3 }],
    });

    const list = await listConversations(env, ME);
    expect(list[0].unread).toBe(3);
    expect(list[0].lastMessageText).toBe("Привіт");
    expect(list[0].lastSenderId).toBe(2);
  });

  it("розмова без непрочитаних має нуль, а не undefined", async () => {
    const { env } = makeEnv({
      conversations: [conversation({ id: 10 })],
      users: [user(2, "Олесь")],
      unread: [],
    });

    const list = await listConversations(env, ME);
    expect(list[0].unread).toBe(0);
  });

  it("співрозмовника, якого вже немає в базі, розмова не втрачає", async () => {
    const { env } = makeEnv({ conversations: [conversation({ id: 10 })], users: [] });

    const list = await listConversations(env, ME);
    expect(list).toHaveLength(1);
    expect(list[0].peer.id).toBe(2);
  });
});

describe("кому можна писати", () => {
  it("прибрані розмови тут **лишаються**: іншого входу в пару немає", async () => {
    const { env, statements } = makeEnv({ conversations: [conversation({ hidden_a: 1 })] });
    await listRecipients(env, ME);

    const hiddenQuery = statements.find((s) => /COALESCE\(hidden_a, 0\) = 1\).*OR/.test(s.sql));
    expect(hiddenQuery).toBeUndefined();
  });

  it("порядок — за абеткою підпису, і він не залежить від оболонки", async () => {
    const { env } = makeEnv({
      linked: [2, 3],
      users: [user(2, "Ярема"), user(3, "Андрій")],
    });

    const recipients = await listRecipients(env, ME);
    expect(recipients.map((peer) => peer.firstName)).toEqual(["Андрій", "Ярема"]);
  });

  it("я сам не співрозмовник — переписка із собою не має ні рядка, ні списку", async () => {
    const { env } = makeEnv({ linked: [ME, 2], users: [user(2, "Олесь")] });
    const recipients = await listRecipients(env, ME);

    expect(recipients.map((peer) => peer.id)).toEqual([2]);
  });

  it("контакт без входу не пропонується — писати йому нема з ким", async () => {
    const { env, statements } = makeEnv({ linked: [2] });
    const recipients = await listRecipients(env, ME);

    const query = statements.find((s) => /CASE WHEN owner_id/.test(s.sql));
    expect(query?.sql).toContain("joined_user_id IS NOT NULL");
    // Людина, якої немає серед `users`, лишається доступною: `unknownPeer` зберігає id.
    expect(recipients.map((peer) => peer.id)).toEqual([2]);
  });
});

describe("бейдж непрочитаних", () => {
  it("одним COUNT замість списку: бейдж питається часто", async () => {
    const { env, statements } = makeEnv({ unreadTotal: 4 });

    expect(await unreadTotal(env, ME)).toBe(4);
    const query = statements.find((s) => /COUNT\(\*\) AS total/.test(s.sql));
    expect(query?.binds).toEqual([ME, ME, ME]);
    expect(query?.sql).toContain("sender_id <> ?");
    expect(query?.sql).toContain("read_at IS NULL");
  });

  it("порожнього числа немає — лише нуль", async () => {
    const { env } = makeEnv({});
    expect(await unreadTotal(env, ME)).toBe(0);
  });
});
