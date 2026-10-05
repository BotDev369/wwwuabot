/**
 * Розмова зі співрозмовником: читання, надсилання, чистка й прочитане.
 *
 * Чотири рішення, які коштують чужої переписки або чужого листа:
 *
 * 1. **Перевірка зв'язку — перша, в кожному методі.** Чужий `peer` дістає ту саму
 *    404, що й неіснуюча розмова, і — головне — **не виконує жодного запису** до
 *    розмови: інший код відповіді був би підказкою про існування чужого листа.
 * 2. **Надсилане повертає той рядок, який ліг у базу**, і воно ж оновлює останнє
 *    повідомлення розмови — список розмов читає саме ці колонки.
 * 3. **Надіслане прибирає ту чернетку, з якої надіслали**, за номером: чернеток
 *    одній людині може бути кілька, решта — це те, що вона ще пише.
 * 4. **«Видалити» приховує розмову в обох, «очистити» — ні.** Рядок лишається в обох
 *    випадках: без нього в пари не було б жодного входу.
 *
 * D1 — фейковий: перевіряються рішення сервісу (умови в SQL, склад тіла), а не
 * сервер SQLite.
 *
 * @module api-dev/src/services/messages/thread.test
 */

import { describe, expect, it } from "vitest";

import { clearThread, markRead, readThread, sendMessage } from "./thread";
import type { Env } from "../../shared/types";

const ME = 1;
const PEER = 2;
const CONVERSATION_ID = 7;

interface Captured {
  sql: string;
  binds: unknown[];
}

interface MessageRow {
  id: number;
  sender_id: number;
  body: string | null;
  created_at: string | null;
  read_at: string | null;
  is_system?: number | null;
}

function makeEnv(options: {
  linked?: boolean;
  conversationId?: number | null;
  messages?: MessageRow[];
  insertedId?: number;
  deletedChanges?: number;
  readChanges?: number;
}): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const messages = options.messages ?? [];
  const conversationId =
    options.conversationId === undefined ? CONVERSATION_ID : options.conversationId;

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
          if (/FROM contacts/.test(sql)) return options.linked === false ? null : { id: 1 };
          if (/FROM shop_orders/.test(sql)) return null;
          if (/FROM conversations WHERE peer_a/.test(sql)) {
            return conversationId === null ? null : { id: conversationId };
          }
          if (/INSERT INTO conversations/.test(sql)) return { id: conversationId ?? 0 };
          return null;
        },
        all: async () => {
          if (/FROM users/.test(sql)) {
            return {
              results: [
                {
                  user_id: PEER,
                  first_name: "Олесь",
                  last_name: null,
                  username: "oles",
                  platform_username: "karas",
                  telegram_json: JSON.stringify({ photo_url: "https://tg/a.png" }),
                },
              ],
            };
          }
          if (/FROM messages/.test(sql) && /ORDER BY m\.id DESC/.test(sql)) {
            const before = record.binds.length > 2 ? Number(record.binds[1]) : null;
            const sorted = [...messages]
              .filter((row) => before === null || row.id < before)
              .sort((left, right) => right.id - left.id);
            return { results: sorted };
          }
          if (/FROM messages/.test(sql)) return { results: messages };
          if (/FROM contacts/.test(sql)) return { results: [{ peer_id: PEER, name: "Олесь" }] };
          return { results: [] };
        },
        run: async () => {
          if (/^\s*DELETE FROM messages/.test(sql)) {
            return { meta: { changes: options.deletedChanges ?? messages.length } };
          }
          if (/UPDATE messages SET read_at/.test(sql)) {
            return { meta: { changes: options.readChanges ?? 0 } };
          }
          if (/^\s*INSERT INTO messages/.test(sql)) {
            return { meta: { changes: 1, last_row_id: options.insertedId ?? 99 } };
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };

  return { env: { DB: db } as unknown as Env, statements };
}

/** Чи бачив сервер розмову чи її листи: для чужого `peer` цього бути не мусить. */
function touchedThread(statements: Captured[]): boolean {
  return statements.some(
    (statement) =>
      /FROM conversations WHERE peer_a/.test(statement.sql) ||
      /^\s*DELETE FROM messages/.test(statement.sql) ||
      /^\s*INSERT INTO messages/.test(statement.sql) ||
      /UPDATE messages SET read_at/.test(statement.sql),
  );
}

describe("чужий співрозмовник", () => {
  it("читати — та сама відмова, що й неіснуюча розмова", async () => {
    const { env } = makeEnv({ linked: false });
    const result = await readThread(env, ME, 99);

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.status).toBe(404);
  });

  it("зв'язку немає — розмову не чіпаємо взагалі", async () => {
    const { env, statements } = makeEnv({ linked: false });
    await readThread(env, ME, 99);
    expect(touchedThread(statements)).toBe(false);
  });

  it("те саме для надсилання, чистки й прочитання", async () => {
    const send = makeEnv({ linked: false });
    await sendMessage(send.env, ME, 99, "Привіт");
    expect(touchedThread(send.statements)).toBe(false);

    const clear = makeEnv({ linked: false });
    await clearThread(clear.env, ME, 99, true);
    expect(touchedThread(clear.statements)).toBe(false);

    const read = makeEnv({ linked: false });
    await markRead(read.env, ME, 99);
    expect(touchedThread(read.statements)).toBe(false);
  });
});

describe("читання розмови", () => {
  it("повідомлення повертаються від старих до свіжих", async () => {
    const { env } = makeEnv({
      messages: [
        { id: 3, sender_id: PEER, body: "третє", created_at: "2026-01-03", read_at: null },
        { id: 1, sender_id: ME, body: "перше", created_at: "2026-01-01", read_at: null },
        { id: 2, sender_id: ME, body: "друге", created_at: "2026-01-02", read_at: null },
      ],
    });

    const result = await readThread(env, ME, PEER);
    expect(result.ok && result.thread.messages.map((m) => m.id)).toEqual([1, 2, 3]);
  });

  it("сторінка бере останні повідомлення, а не перші", async () => {
    const { env, statements } = makeEnv({ messages: [] });
    await readThread(env, ME, PEER);

    const query = statements.find(
      (s) => /FROM messages/.test(s.sql) && /ORDER BY m\.id DESC/.test(s.sql),
    );
    expect(query?.sql).toContain("ORDER BY m.id DESC");
    expect(query?.binds[0]).toBe(CONVERSATION_ID);
    expect(query?.binds[1]).toBe(50);
  });

  it("старіші сторінки — тим самим шляхом, з межею `before`", async () => {
    const { env, statements } = makeEnv({
      messages: [
        { id: 9, sender_id: PEER, body: "новіше", created_at: "2026-01-09", read_at: null },
        { id: 4, sender_id: PEER, body: "старіше", created_at: "2026-01-04", read_at: null },
      ],
    });

    const result = await readThread(env, ME, PEER, 5);
    expect(result.ok && result.thread.messages.map((m) => m.id)).toEqual([4]);

    const query = statements.find((s) => /m\.id < \?/.test(s.sql));
    expect(query?.binds[1]).toBe(5);
  });

  it("порожня розмова — не помилка", async () => {
    const { env } = makeEnv({ conversationId: null, messages: [] });
    const result = await readThread(env, ME, PEER);

    expect(result.ok).toBe(true);
    expect(result.ok && result.thread.messages).toEqual([]);
  });

  it("співрозмовник читається з його боку: ім'я з мого довідника", async () => {
    const { env } = makeEnv({ messages: [] });
    const result = await readThread(env, ME, PEER);

    expect(result.ok && result.thread.peer?.contactName).toBe("Олесь");
    expect(result.ok && result.thread.peer?.platformUsername).toBe("karas");
  });
});

describe("надсилання", () => {
  it("порожнє тіло відхиляється словом, а не пише в базу", async () => {
    const { env, statements } = makeEnv({});
    const result = await sendMessage(env, ME, PEER, "   ");

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.status).toBe(400);
    expect(statements.some((s) => /INSERT INTO messages/.test(s.sql))).toBe(false);
  });

  it("повертається той рядок, який ліг у базу", async () => {
    const { env } = makeEnv({ insertedId: 512 });
    const result = await sendMessage(env, ME, PEER, "  Привіт  ");

    expect(result.ok && result.message).toMatchObject({
      id: 512,
      senderId: ME,
      body: "Привіт",
      readAt: null,
      system: false,
    });
  });

  it("останнє повідомлення розмови оновлює цей виклик, разом із поверненням у список", async () => {
    const { env, statements } = makeEnv({});
    await sendMessage(env, ME, PEER, "Привіт");

    const update = statements.find((s) => /UPDATE conversations SET last_message_at/.test(s.sql));
    expect(update?.binds[2]).toBe(ME);
    expect(update?.binds[3]).toBe(CONVERSATION_ID);
    // Прибрана розмова повертається обом, інакше їй немає жодного шляху назад.
    expect(update?.sql).toContain("hidden_a = 0");
    expect(update?.sql).toContain("hidden_b = 0");
  });

  it("чернетка прибирається та сама, з якої надіслали", async () => {
    const { env, statements } = makeEnv({});
    await sendMessage(env, ME, PEER, "Привіт", 55);

    const drop = statements.find((s) => /DELETE FROM message_drafts/.test(s.sql));
    expect(drop?.binds).toEqual([55, ME]);
  });

  it("надсилання з розмови не чіпає чернеток узагалі", async () => {
    const { env, statements } = makeEnv({});
    await sendMessage(env, ME, PEER, "Привіт");

    expect(statements.some((s) => /message_drafts/.test(s.sql))).toBe(false);
  });
});

describe("чистка розмови", () => {
  it("розмови ще немає — стирати нічого, і це не помилка", async () => {
    const { env } = makeEnv({ conversationId: null });
    expect(await clearThread(env, ME, PEER, true)).toEqual({ ok: true, removed: 0 });
  });

  it("очищення лишає розмову в списку в обох", async () => {
    const { env, statements } = makeEnv({
      messages: [
        { id: 4, sender_id: PEER, body: "старіше", created_at: "2026-01-04", read_at: null },
      ],
    });
    const result = await clearThread(env, ME, PEER);

    expect(result.ok && result.removed).toBe(1);
    const update = statements.find((s) => /UPDATE conversations SET last_message_at/.test(s.sql));
    expect(update?.sql).not.toContain("hidden_a = 1");
    expect(update?.sql).not.toContain("hidden_b = 1");
  });

  it("«Видалити» приховує розмову в обох, але рядок лишається", async () => {
    const { env, statements } = makeEnv({});
    await clearThread(env, ME, PEER, true);

    const update = statements.find((s) => /UPDATE conversations SET last_message_at/.test(s.sql));
    expect(update?.sql).toContain("hidden_a = 1");
    expect(update?.sql).toContain("hidden_b = 1");
  });

  it("останок у списку теж чиститься: текст лишився б у розмові, якої вже немає", async () => {
    const { env, statements } = makeEnv({});
    await clearThread(env, ME, PEER);

    const update = statements.find((s) => /UPDATE conversations SET last_message_at/.test(s.sql));
    expect(update?.sql).toContain("last_message_text = NULL");
    expect(update?.sql).toContain("last_sender_id = NULL");
  });
});

describe("прочитане", () => {
  it("своє не чіпається: бульбашка автора не стає прочитаною від його ж відкриття", async () => {
    const { env, statements } = makeEnv({ readChanges: 2 });
    const result = await markRead(env, ME, PEER);

    const update = statements.find((s) => /UPDATE messages SET read_at/.test(s.sql));
    expect(update?.sql).toContain("sender_id <> ?");
    expect(update?.binds[2]).toBe(ME);
    expect(result.ok && result.read).toBe(2);
  });

  it("число повертається саме те, що зніме бейдж", async () => {
    const { env } = makeEnv({ readChanges: 4 });
    const result = await markRead(env, ME, PEER);

    expect(result.ok && result.read).toBe(4);
  });

  it("розмови ще немає — прочитати нічого", async () => {
    const { env } = makeEnv({ conversationId: null });
    expect(await markRead(env, ME, PEER)).toEqual({ ok: true, read: 0 });
  });
});
