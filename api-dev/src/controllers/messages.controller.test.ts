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
 * 5. **Вітання ставиться рівно раз і лише тому, хто прийшов за лінком**: воно
 *    видно обоє, тож помилка тут — це чуже ім'я в спільному рядку або друге
 *    вітання поверх живої переписки.
 * 6. **Стирання й видалення — у обох і тільки після перевірки зв'язку.** Рядок
 *    переписки один на пару, тож ці дії знищують **чуже** теж: без перевірки
 *    «чи зв'язані» чужого `peer` вони б витирали чужу історію, а код відповіді
 *    (404 проти 400) підказував би, що вона існує.
 *
 * @module api-dev/src/controllers/messages.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import type { Conversation } from "@wwwuabot/shared/messages";
import {
  handleMessageBadge,
  handleMessageClear,
  handleMessageDelete,
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
    "hidden_a",
    "hidden_b",
    "created_at",
  ],
  messages: ["id", "conversation_id", "sender_id", "body", "created_at", "read_at"],
  contacts: ["id", "owner_id", "joined_user_id", "name"],
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
  /** Результат `run()`; типово — один змінений рядок. */
  run?: (sql: string) => { changes: number; last_row_id: number } | undefined;
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
        run: async () => ({ meta: options.run?.(sql) ?? { changes: 1, last_row_id: 11 } }),
      };
      statements.push(record);
      return statement;
    },
    // `batch` потрібен вітанню: ним воно кладе обидві позначки й останок
    // розмови одним заходом. Запити вже зібрані в `statements`, тож методу
    // досить існувати.
    batch: async () => [],
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
const LINKED: DbOptions = {
  first: (sql) => {
    if (/FROM contacts/.test(sql)) return { id: 1 };
    // Стрічка порожня: вітання має що сказати (перевірку наявних повідомлень
    // `openThread` робить саме таким запитом).
    if (/FROM messages/.test(sql)) return null;
    return { id: 3 };
  },
};

/**
 * Мене запросили саме цією людиною — і стрічка порожня.
 *
 * Обидва запити до `contacts` слугують різним правилам, тож фікстура їх
 * розрізняє: зв'язок шукає обидва напрямки (`OR`), запрошення — лише один.
 */
const INVITED: DbOptions = {
  first: (sql) => {
    // Обидва запити до `contacts` знаходять рядок: зв'язок є, і запросив саме
    // він (`joined_user_id` — я).
    if (/FROM contacts/.test(sql)) return { id: 1 };
    if (/FROM messages/.test(sql)) return null;
    return { id: 3 };
  },
  all: (sql) =>
    /FROM users/.test(sql)
      ? [
          {
            user_id: PEER,
            first_name: "Сергій",
            last_name: null,
            username: "serg",
            platform_username: "karas",
            telegram_json: null,
          },
        ]
      : [],
};

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
        // Ім'я зі **свого** довідника читається окремим запитом, і тільки за
        // своїм боком (`owner_id = me`): чуже ім'я для мене — не моє.
        if (/AS peer_id, name/.test(sql)) return [{ peer_id: PEER, name: "Карась Х" }];
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
    // `COALESCE` тут не прикраса: колонка, додана наявній таблиці, приходить від
    // `ensureTables` як `DEFAULT NULL`, тож у старих рядках там `NULL` — і
    // порівняння з `0` напросто викинуло б зі списку **усі наявні розмови**.
    expect(select?.sql).toMatch(/COALESCE\(hidden_a, 0\) = 0/);
    expect(select?.sql).toMatch(/COALESCE\(hidden_b, 0\) = 0/);
    expect(select?.binds).toEqual([ME, ME, 100]);

    const names = db.statements.find((s) => /AS peer_id, name/.test(s.sql));
    expect(names?.sql).toMatch(/owner_id = \?/);
    expect(names?.binds).toEqual([ME, PEER]);

    expect(body.conversations).toEqual([
      {
        peer: {
          id: PEER,
          firstName: "Сергій",
          lastName: null,
          username: "serg",
          platformUsername: "karas",
          contactName: "Карась Х",
          photoUrl: "https://t.me/p.jpg",
        },
        lastMessageAt: "2026-09-19 12:00:00",
        lastMessageText: "привіт",
        lastSenderId: PEER,
        unread: 2,
      },
    ]);
  });

  it("зв'язаний контакт без жодного повідомлення теж у списку — інакше перше надіслати нічим", async () => {
    const db = makeDb({
      ...LINKED,
      all: (sql) => {
        // Розмов немає зовсім, але зв'язок через контакти є.
        if (/FROM contacts/.test(sql)) return [{ peer_id: PEER }];
        if (/FROM users/.test(sql)) {
          return [
            {
              user_id: PEER,
              first_name: "Сергій",
              last_name: null,
              username: null,
              platform_username: "karas",
              telegram_json: null,
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
    const body = (await res.json()) as { conversations?: Conversation[] };

    expect(body.conversations).toHaveLength(1);
    expect(body.conversations?.[0].peer.id).toBe(PEER);
    // Порожній рядок чекає першого повідомлення — і клієнт це скаже словами.
    expect(body.conversations?.[0].lastMessageText).toBeNull();
    expect(body.conversations?.[0].unread).toBe(0);

    // Список зв'язаних читає лише ті контакти, де хтось справді прийшов.
    const link = db.statements.find((s) => /CASE WHEN owner_id/.test(s.sql));
    expect(link?.sql).toMatch(/joined_user_id IS NOT NULL/);
    expect(link?.binds).toEqual([ME, ME, ME]);
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

// ── Вітання ───────────────────────────────────────────────────────

describe("вітання пари", () => {
  /** Позначки, покладені в стрічку цим відкриттям. */
  function notes(db: { statements: Captured[] }): Captured[] {
    return db.statements.filter((s) => /INTO messages/.test(s.sql));
  }

  it("тому, кого запросили, стрічка відкривається двома позначками платформи", async () => {
    const db = makeDb(INVITED);
    const res = await handleMessageThread(
      request(`/api/messages/thread?peer=${PEER}`, { initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    const inserted = notes(db);
    expect(inserted).toHaveLength(2);
    // Автор — платформа, а не людина: id у нього нульовий (`SYSTEM_SENDER_ID`).
    expect(inserted[0].binds[1]).toBe(0);
    expect(inserted[0].binds[2]).toContain("@karas");
    expect(inserted[1].binds[2]).toContain("Контакт встановлено");
    // Прочитані одразу: їх ніхто не писав, тож у бейджі їм нема чого робити.
    expect(inserted[0].binds[3]).toBe(inserted[0].binds[4]);
  });

  it("вітання ставиться заявкою в базі — один `UPDATE` виграє один раз", async () => {
    const db = makeDb(INVITED);
    await handleMessageThread(
      request(`/api/messages/thread?peer=${PEER}`, { initData: await signedInitData() }),
      db.env,
    );

    const claim = db.statements.find((s) => /SET greeted_at/.test(s.sql));
    expect(claim?.sql).toMatch(/greeted_at IS NULL/);
  });

  it("⛔ той, хто запросив, привітання не отримує", async () => {
    // Зв'язок симетричний, запрошення — ні: автор лінка відкриває розмову
    // такою ж людиною, але не «прийшов за запрошенням».
    const db = makeDb({
      first: (sql) => {
        if (/FROM contacts/.test(sql)) return /OR \(owner_id/.test(sql) ? { id: 1 } : null;
        if (/FROM messages/.test(sql)) return null;
        return { id: 3 };
      },
    });

    const res = await handleMessageThread(
      request(`/api/messages/thread?peer=${PEER}`, { initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(notes(db)).toHaveLength(0);
  });

  it("⛔ у живу переписку вітання не вставляється", async () => {
    const db = makeDb({
      ...INVITED,
      first: (sql) => {
        if (/FROM contacts/.test(sql)) return { id: 1 };
        if (/FROM messages/.test(sql)) return { id: 9 };
        return { id: 3 };
      },
    });

    await handleMessageThread(
      request(`/api/messages/thread?peer=${PEER}`, { initData: await signedInitData() }),
      db.env,
    );

    expect(notes(db)).toHaveLength(0);
    // Заявку навіть не брали: спершу «чи є що вітати», потім «чи вітаю я».
    expect(db.statements.some((s) => /SET greeted_at/.test(s.sql))).toBe(false);
  });

  it("⛔ коли вітання вже було, другого не буде", async () => {
    const db = makeDb({
      ...INVITED,
      run: (sql) => (/SET greeted_at/.test(sql) ? { changes: 0, last_row_id: 0 } : undefined),
    });

    await handleMessageThread(
      request(`/api/messages/thread?peer=${PEER}`, { initData: await signedInitData() }),
      db.env,
    );

    expect(notes(db)).toHaveLength(0);
  });
});

// ── Стерти переписку / прибрати розмову ────────────────────────

describe("переписка: стерти й прибрати", () => {
  /** Запити, які щось видаляють. */
  function deletes(db: { statements: Captured[] }): Captured[] {
    return db.statements.filter((s) => /^DELETE/.test(s.sql.trimStart()));
  }

  it("⛔ прибрана розмова не вертається у список через зв'язані контакти", async () => {
    // Список збирається з двох джерел, і друге (зв'язок через контакти) не знає
    // про приховування нічого. Без фільтра в ньому прибране поверталося б
    // назад як «Почніть розмову» — саме це й було видно на телефоні.
    const db = makeDb({
      first: (sql) => (/FROM contacts/.test(sql) ? { id: 1 } : null),
      all: (sql) => {
        if (/COALESCE\(hidden_a, 0\) = 1/.test(sql)) return [{ peer_a: ME, peer_b: PEER }];
        if (/FROM conversations/.test(sql)) return [];
        if (/FROM contacts/.test(sql)) return [{ peer_id: PEER }];
        return [];
      },
    });

    const res = await handleMessages(
      request("/api/messages", { initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, conversations: [] });
    // І фільтр стоїть в обох джерелах, а не лише в контактах.
    const started = db.statements.find((s) => /FROM conversations/.test(s.sql));
    expect(started?.sql).toMatch(/COALESCE\(hidden_a, 0\) = 0/);
  });

  it("«очистити» стирає повідомлення й останок, але саму розмову лишає", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageClear(
      request("/api/messages/clear", {
        method: "POST",
        body: { peer: PEER },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const [removed] = deletes(db);
    expect(removed.sql).toMatch(/DELETE FROM messages WHERE conversation_id = \?/);
    expect(removed.binds).toEqual([3]);
    // Чистка розмову **не** ховає: вона лишається у списку й можна писати далі.
    const summary = db.statements.find((s) => /SET last_message_at/.test(s.sql));
    expect(summary?.sql).toMatch(/last_message_text = NULL/);
    expect(summary?.sql).not.toContain("hidden_");
    expect(summary?.binds).toEqual([3]);
  });

  it("«видалити» ховає розмову обом, а рядок лишає на місці", async () => {
    // Рядка не видаляємо навмисно: без нього в пари не було б жодного входу в
    // розмову (вона зникає зі списку, а інших дверей немає). Прапорці ставимо
    // **разом**: переписка спільна, і та сама дія не може дати двом різний
    // результат — саме на цьому й спіткнулось «прибрати лише собі».
    const db = makeDb(LINKED);
    const res = await handleMessageDelete(
      request("/api/messages/delete", {
        method: "POST",
        body: { peer: PEER },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(deletes(db)).toHaveLength(1);
    expect(deletes(db)[0].sql).toMatch(/DELETE FROM messages/);
    expect(db.statements.some((s) => /DELETE FROM conversations/.test(s.sql))).toBe(false);
    const summary = db.statements.find((s) => /SET last_message_at/.test(s.sql));
    expect(summary?.sql).toMatch(/hidden_a = 1, hidden_b = 1/);
  });

  it("порядок пари на дію не впливає — ховаються обидві сторони", async () => {
    // Пара впорядкована за зростанням id (`conversationPair`), тож я можу бути і
    // `a`, і `b`. Прапорці ставляться разом, і саме тому сторона тут нічого не
    // вирішує.
    const db = makeDb({ first: (sql) => (/FROM contacts/.test(sql) ? { id: 1 } : { id: 3 }) });
    const res = await handleMessageDelete(
      request("/api/messages/delete", {
        method: "POST",
        body: { peer: ME - 1 },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const summary = db.statements.find((s) => /SET last_message_at/.test(s.sql));
    expect(summary?.sql).toMatch(/hidden_a = 1, hidden_b = 1/);
  });

  it("нове повідомлення вертає розмову обом — прибрана не лишається прибраною", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageSend(
      request("/api/messages/send", {
        method: "POST",
        body: { peer: PEER, body: "привіт" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const summary = db.statements.find((s) => /SET last_message_at/.test(s.sql));
    expect(summary?.sql).toMatch(/hidden_a = 0, hidden_b = 0/);
  });

  it("⛔ без зв'язку — 404, і не зникає ніщо", async () => {
    // Найважливіший рядок цього набору: помилка тут стирала б **чу-жу**
    // переписку (вона одна на пару), тож перевірка стоїть до будь-якого DELETE.
    const db = makeDb({ first: () => null });
    const body = { peer: PEER };
    const initData = await signedInitData();

    const clear = await handleMessageClear(
      request("/api/messages/clear", { method: "POST", body, initData }),
      db.env,
    );
    const remove = await handleMessageDelete(
      request("/api/messages/delete", { method: "POST", body, initData }),
      db.env,
    );

    expect(clear.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(deletes(db)).toHaveLength(0);
  });

  it("⛔ без підписаного initData не стирається нічого", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageDelete(
      request("/api/messages/delete", { method: "POST", body: { peer: PEER } }),
      db.env,
    );

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("без `peer` — 400, а не «стерти все»", async () => {
    // `Number(null)` — це 0, а `DELETE` без співрозмовника зніс би переписку
    // людини з усіма (та сама пастка, що в нотатках).
    const db = makeDb(LINKED);
    const res = await handleMessageClear(
      request("/api/messages/clear", {
        method: "POST",
        body: {},
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(deletes(db)).toHaveLength(0);
  });

  it("розмови ще немає — дія проходить, але стирати нічого", async () => {
    // Законний результат, а не помилка: у списку є ті, з ким листування лише
    // починається, і «очистити» в такому рядку не має виглядати як збій.
    const db = makeDb({ first: (sql) => (/FROM conversations/.test(sql) ? null : { id: 1 }) });
    const res = await handleMessageClear(
      request("/api/messages/clear", {
        method: "POST",
        body: { peer: PEER },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, removed: 0 });
    expect(deletes(db)).toHaveLength(0);
  });

  it("іншим методом — 405: дію не роблять випадковим GET", async () => {
    const db = makeDb(LINKED);
    const res = await handleMessageDelete(request("/api/messages/delete"), db.env);

    expect(res.status).toBe(405);
    expect(deletes(db)).toHaveLength(0);
  });
});
