/**
 * Межа повідомлень: **кому можна писати й хто стоїть автором**.
 *
 * Тут фіксується те, що ламається мовчки:
 *
 * 1. **Автор — із підписаного `initData`**, а не з тіла: у запитах немає «від
 *    кого», і підробити автора нічим.
 * 2. **Зв'язок перевіряється ПЕРЕД будь-яким пошуком розмови.** Інакше код
 *    відповіді (404 проти 400) сам казав би, чи існує чужа переписка — той
 *    самий витік, який у проєкті вже ловили (AGENTS.md §7).
 * 3. **Порожнє тіло не стає повідомленням** і не створює розмову.
 * 4. **Своє не позначається прочитаним** (`sender_id <> ?`): інакше бейдж
 *    зникав би від того, що автор відкрив власну розмову.
 *
 * @module api-dev/src/controllers/messages.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import {
  handleMessageBadge,
  handleMessageRead,
  handleMessageSend,
  handleMessages,
  handleMessageThread,
} from "./messages.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const ME = 777;
const PEER = 4242;

interface Captured {
  sql: string;
  binds: unknown[];
}

/** Колонки наших таблиць — щоб `ensureTables` не додавав `ALTER` на кожну. */
const COLUMNS: Record<string, string[]> = {
  conversations: [
    "id",
    "peer_a",
    "peer_b",
    "last_message_at",
    "last_message_text",
    "last_sender_id",
    "created_at",
  ],
  messages: ["id", "conversation_id", "sender_id", "body", "created_at", "read_at"],
  contacts: ["id", "owner_id", "joined_user_id"],
};

// ── Підпис initData ───────────────────────────────────────────────
// Копія зі `notes.controller.test.ts` навмисно: це фікстура тесту, а не код
// продукту. Підписувач у `shared/src` умів би підробити ідентичність.

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signedInitData(userId = ME): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

// ── Заглушка D1 ───────────────────────────────────────────────────

interface DbOptions {
  /** Відповідь `first()` — SQL у аргументі, бо той самий метод обслуговує й зв'язок. */
  first?: (sql: string, binds: unknown[]) => unknown;
  all?: (sql: string) => unknown[];
}

function makeDb(options: DbOptions = {}): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => options.first?.(sql, record.binds) ?? null,
        all: async () => {
          const pragma = /PRAGMA table_info\("?(\w+)"?\)/.exec(sql);
          if (pragma) return { results: (COLUMNS[pragma[1]] ?? []).map((name) => ({ name })) };
          return { results: options.all?.(sql) ?? [] };
        },
        run: async () => ({ meta: { changes: 1, last_row_id: 11 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

/** Запит до даних (DDL, прагми й `CREATE INDEX` від `ensureTables` не рахуємо). */
function dataStatement(db: { statements: Captured[] }, keyword: string): Captured | undefined {
  return [...db.statements]
    .reverse()
    .find((s) => s.sql.trimStart().toUpperCase().startsWith(keyword));
}

function request(
  path: string,
  init: { method?: string; body?: unknown; initData?: string } = {},
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init.initData) headers.set(INIT_DATA_HEADER, init.initData);
  return new Request(`https://api.example.com${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

/** Людина зв'язана через контакти — те, що повертає `areLinked`. */
const LINKED: DbOptions = { first: (sql) => (/FROM contacts/.test(sql) ? { id: 1 } : { id: 3 }) };

// ── Ідентичність ──────────────────────────────────────────────────

describe("повідомлення: хто пише", () => {
  it("⛔ без підписаного initData не пишеться й не читається нічого", async () => {
    const db = makeDb(LINKED);

    expect((await handleMessages(request("/api/messages"), db.env)).status).toBe(401);
    expect(
      (
        await handleMessageSend(
          request("/api/messages/send", { method: "POST", body: { peer: PEER, body: "привіт" } }),
          db.env,
        )
      ).status,
    ).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("заголовок із чужим id нічого не змінює", async () => {
    const db = makeDb(LINKED);
    const req = new Request("https://api.example.com/api/messages/badge", {
      headers: { "X-Telegram-User-Id": String(PEER) },
    });

    expect((await handleMessageBadge(req, db.env)).status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });
});

// ── Зв'язок ───────────────────────────────────────────────────────

describe("повідомлення: кому можна писати", () => {
  it("⛔ без зв'язку через контакти — 404 і жодного запису", async () => {
    const db = makeDb({ first: () => null });
    const res = await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { peer: PEER, body: "чуже" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(404);
    // Головне: розмову навіть не шукали — зв'язок перевірено першим (§7).
    expect(dataStatement(db, "INSERT")).toBeUndefined();
    expect(db.statements.some((s) => /FROM conversations/.test(s.sql))).toBe(false);
  });

  it("зв'язок читається в обидва боки: той, кого запросили, теж пише", async () => {
    const db = makeDb(LINKED);
    await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { peer: PEER, body: "відповідь" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    const link = db.statements.find((s) => /FROM contacts/.test(s.sql));
    // (я, він) або (він, я) — інакше відповісти запрошувачу не міг би ніхто.
    expect(link?.binds).toEqual([ME, PEER, PEER, ME]);
  });
});

// ── Запис ─────────────────────────────────────────────────────────

describe("надсилання", () => {
  it("пише автор із підпису, притискає краї й оновлює останок розмови", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { peer: PEER, body: "  Куку   " },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const insert = dataStatement(db, "INSERT");
    // conversation_id, sender_id, body, created_at
    expect(insert?.sql).toMatch(/INTO messages/);
    expect(insert?.binds.slice(0, 3)).toEqual([3, ME, "Куку"]);

    // Список розмов читає `last_message_*`, тож оновлює їх саме надсилання.
    const update = dataStatement(db, "UPDATE");
    expect(update?.sql).toMatch(/UPDATE conversations SET last_message_at/);
    expect(update?.binds[2]).toBe(ME);
  });

  it("порожнє тіло — 400, і розмова не створюється", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { peer: PEER, body: "   " },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(dataStatement(db, "INSERT")).toBeUndefined();
  });

  it("тіло довше за стелю обрізається на записі, а не на показі", async () => {
    const db = makeDb(LINKED);
    await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { peer: PEER, body: "я".repeat(5000) },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect((dataStatement(db, "INSERT")?.binds[2] as string).length).toBe(2000);
  });

  it("без `peer` — 400, а не «надіслати всім»", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { body: "привіт" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(dataStatement(db, "INSERT")).toBeUndefined();
  });
});

// ── Прочитане ─────────────────────────────────────────────────────

describe("прочитане", () => {
  it("позначає лише чуже й лише непрочитане", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageRead(
      request("/api/messages/read", {
        method: "POST",
        body: { peer: PEER },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update?.sql).toMatch(/SET read_at = \?/);
    expect(update?.sql).toMatch(/sender_id <> \? AND read_at IS NULL/);
    expect(update?.binds).toEqual([expect.any(String), 3, ME]);
  });
});

// ── Читання ───────────────────────────────────────────────────────

describe("список розмов", () => {
  it("питає лише свої розмови й віддає співрозмовника з іменем на платформі", async () => {
    const db = makeDb({
      ...LINKED,
      all: (sql) => {
        if (/FROM conversations/.test(sql)) {
          return [
            {
              id: 3,
              peer_a: ME,
              peer_b: PEER,
              last_message_at: "2026-09-19 12:00:00",
              last_message_text: "привіт",
              last_sender_id: PEER,
            },
          ];
        }
        if (/FROM messages/.test(sql)) return [{ conversation_id: 3, total: 2 }];
        if (/FROM users/.test(sql)) {
          return [
            {
              user_id: PEER,
              first_name: "Сергій",
              last_name: null,
              username: "serg",
              platform_username: "karas",
              telegram_json: JSON.stringify({ photo_url: "https://t.me/p.jpg" }),
            },
          ];
        }
        return [];
      },
    });

    const res = await handleMessages(
      request("/api/messages", { initData: await signedInitData() }),
      db.env,
    );
    const body = (await res.json()) as { conversations?: unknown[] };

    const select = db.statements.find((s) => /FROM conversations/.test(s.sql));
    expect(select?.sql).toMatch(/WHERE peer_a = \? OR peer_b = \?/);
    expect(select?.binds).toEqual([ME, ME, 100]);

    expect(body.conversations).toEqual([
      {
        peer: {
          id: PEER,
          firstName: "Сергій",
          lastName: null,
          username: "serg",
          platformUsername: "karas",
          photoUrl: "https://t.me/p.jpg",
        },
        lastMessageAt: "2026-09-19 12:00:00",
        lastMessageText: "привіт",
        lastSenderId: PEER,
        unread: 2,
      },
    ]);
  });

  it("розмова зниклого контакту лишається в списку — без імені, але не зникає", async () => {
    const db = makeDb({
      ...LINKED,
      all: (sql) =>
        /FROM conversations/.test(sql)
          ? [{ id: 3, peer_a: PEER, peer_b: ME, last_message_text: null, last_sender_id: null }]
          : [],
    });

    const res = await handleMessages(
      request("/api/messages", { initData: await signedInitData() }),
      db.env,
    );
    const body = (await res.json()) as { conversations?: { peer: { id: number } }[] };

    expect(body.conversations?.[0]?.peer.id).toBe(PEER);
  });

  it("бейдж рахує лише чуже непрочитане", async () => {
    const db = makeDb({
      first: (sql) =>
        /FROM contacts/.test(sql) ? { id: 1 } : /COUNT\(\*\)/.test(sql) ? { total: 5 } : null,
    });

    const res = await handleMessageBadge(
      request("/api/messages/badge", { initData: await signedInitData() }),
      db.env,
    );

    expect(await res.json()).toEqual({ ok: true, unread: 5 });
    const count = db.statements.find((s) => /COUNT\(\*\)/.test(s.sql));
    expect(count?.binds).toEqual([ME, ME, ME]);
  });

  it("розмова без `peer` — 400", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageThread(
      request("/api/messages/thread", { initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /FROM contacts/.test(s.sql))).toBe(false);
  });
});
