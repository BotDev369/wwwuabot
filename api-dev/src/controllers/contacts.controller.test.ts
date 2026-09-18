/**
 * Межа контактів: **чиї вони, що в них пишуть і коли лінк не видається**.
 *
 * Перевіряється те, що не видно очима: власник береться з підписаного
 * `initData` (жоден заголовок його не підміняє), чужий номер контакту
 * відповідає так само, як неіснуючий, **код**, який повертає сервер, проходить
 * перевірку payload бота — інакше лінк вів би в нікуди, а Telegram обрізав би
 * параметр мовчки.
 *
 * Окремо — два правила самої моделі: контакт **створюється без лінка** (лінк
 * це окрема дія) і **приєднаному контакту лінк не видається**, бо закріплення
 * стається лише раз і таке посилання не закріпило б нікого.
 *
 * @module api-dev/src/controllers/contacts.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { isInviteCode } from "@wwwuabot/shared/contacts";
import { isValidBotPayload } from "@wwwuabot/shared/content";
import { handleContactLink, handleContacts } from "./contacts.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `contacts` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const CONTACT_COLUMNS = [
  "id",
  "owner_id",
  "name",
  "username",
  "joined_user_id",
  "tags",
  "notes",
  "code",
  "joined_bot_at",
  "joined_platform_at",
  "created_at",
  "updated_at",
];

interface Captured {
  sql: string;
  binds: unknown[];
}

// ── Підпис initData ───────────────────────────────────────────────
// Копія зі `security/telegram.test.ts` навмисно: це фікстура тесту, а не код
// продукту — у `shared/src` підписувач умів би підробити ідентичність.

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

async function signedInitData(userId = USER_ID): Promise<string> {
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

// ── Заглушка D1 і KV ──────────────────────────────────────────────

interface DbStub {
  env: Env;
  statements: Captured[];
}

function makeDb(
  options: { changes?: number; rows?: unknown[]; row?: unknown; counts?: unknown[] } = {},
): DbStub {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => options.row ?? null,
        all: async () => {
          if (/^PRAGMA/i.test(sql.trimStart())) {
            return { results: CONTACT_COLUMNS.map((name) => ({ name })) };
          }
          // Другий рівень схеми рахує сервер — окремим запитом із `COUNT(*)`.
          if (/COUNT\(\*\)/i.test(sql)) return { results: options.counts ?? [] };
          return { results: options.rows ?? [] };
        },
        run: async () => ({ meta: { changes: options.changes ?? 1, last_row_id: 7 } }),
      };
      statements.push(record);
      return statement;
    },
  };

  // Ім'я бота приходить із кеша — без нього лінк не зібрати, і тест ходив би
  // у Telegram.
  const kv = {
    get: async () => "wwwuabot",
    put: async () => undefined,
  };

  return { env: { DB: db, CONTENT_KV: kv, BOT_TOKEN } as unknown as Env, statements };
}

/** Запит до даних контактів (DDL від `ensureTables` не рахуємо). */
function dataStatement(db: DbStub, keyword: "INSERT" | "UPDATE" | "SELECT" | "DELETE" | "COUNT") {
  const match = [...db.statements].reverse().find((s) => {
    const sql = s.sql.trimStart().toUpperCase();
    return keyword === "COUNT"
      ? sql.startsWith("SELECT") && sql.includes("COUNT(*)")
      : sql.startsWith(keyword);
  });
  if (!match) throw new Error(`у заглушці немає запиту ${keyword}`);
  return match;
}

function request(path: string, init: { method?: string; body?: unknown; initData?: string } = {}) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init.initData) headers.set(INIT_DATA_HEADER, init.initData);
  return new Request(`https://api.example.com${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

/** Рядок контакту так, як його віддає D1. */
function row(over: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: "Карас",
    username: null,
    tags: "[]",
    notes: "",
    code: null,
    joined_user_id: null,
    joined_bot_at: null,
    joined_platform_at: null,
    created_at: "2026-09-18 09:00:00",
    updated_at: "2026-09-18 09:00:00",
    ...over,
  };
}

// ── Ідентичність ──────────────────────────────────────────────────

describe("чиї контакти", () => {
  it("⛔ без підписаного initData контакти не читаються й не створюються", async () => {
    const db = makeDb();
    const read = await handleContacts(request("/api/contacts"), db.env);
    const created = await handleContacts(
      request("/api/contacts", { method: "POST", body: { name: "Карас" } }),
      db.env,
    );

    expect(read.status).toBe(401);
    expect(created.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("⛔ заголовок із чужим id власником не робить", async () => {
    const db = makeDb();
    const req = new Request("https://api.example.com/api/contacts", {
      headers: { "X-Telegram-User-Id": "999" },
    });

    expect((await handleContacts(req, db.env)).status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("список питає лише свого власника", async () => {
    const db = makeDb({ rows: [] });
    const res = await handleContacts(
      request("/api/contacts", { initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, contacts: [] });
    expect(dataStatement(db, "SELECT").binds[0]).toBe(USER_ID);
  });
});

// ── Створення ─────────────────────────────────────────────────────

describe("створення контакту", () => {
  it("пише власника з підпису й **не складає лінка**", async () => {
    const db = makeDb({ row: row({ name: "Карас" }) });
    const res = await handleContacts(
      request("/api/contacts", {
        method: "POST",
        body: {
          name: "  Карас  ",
          username: "@Karas_2",
          tags: ["Друг"],
          notes: "  телефон у примітці  ",
        },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const insert = dataStatement(db, "INSERT");
    expect(insert.sql).toMatch(/INTO contacts/);
    // Лінк — окрема дія: у створенні його немає навіть колонкою.
    expect(insert.sql).not.toMatch(/code/i);
    expect(insert.binds[0]).toBe(USER_ID);
    expect(insert.binds[1]).toBe("Карас");
    expect(insert.binds[2]).toBe("karas_2");
    expect(insert.binds[3]).toBe('["друг"]');
    expect(insert.binds[4]).toBe("телефон у примітці");
    // Id людини у створенні немає: його пише бот, коли вона прийде за лінком.
    expect(insert.sql).not.toMatch(/joined_/);
  });

  it("⛔ порожнє ім'я контакту не створює", async () => {
    const db = makeDb();
    const res = await handleContacts(
      request("/api/contacts", {
        method: "POST",
        body: { name: "   " },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^INSERT/i.test(s.sql.trimStart()))).toBe(false);
  });
});

// ── Список ────────────────────────────────────────────────────────

describe("список контактів", () => {
  it("готовий діплінк, хештеги й глибина гілки — від сервера", async () => {
    const db = makeDb({
      rows: [
        row({
          id: 1,
          name: "Карас молодший",
          username: "karas",
          tags: '["друг"]',
          code: "inv-8f3k2q",
          joined_user_id: 555,
          joined_bot_at: "2026-09-17 10:00:00",
        }),
      ],
      counts: [{ owner_id: 555, total: 2 }],
    });
    const res = await handleContacts(
      request("/api/contacts", { initData: await signedInitData() }),
      db.env,
    );
    const body = (await res.json()) as { contacts: { deepLink: string; invitedCount: number }[] };

    expect(body.contacts[0].deepLink).toBe("https://t.me/wwwuabot?start=inv-8f3k2q");
    expect(body.contacts[0].invitedCount).toBe(2);
    // Другий рівень рахується одним запитом на весь список.
    expect(dataStatement(db, "COUNT").sql).toMatch(/GROUP BY owner_id/);
  });

  it("контакт без лінка не вигадує ні коду, ні діплінка", async () => {
    const db = makeDb({ rows: [row({ id: 2, name: "Карас", code: null })] });
    const res = await handleContacts(
      request("/api/contacts", { initData: await signedInitData() }),
      db.env,
    );
    const body = (await res.json()) as { contacts: { code: unknown; deepLink: unknown }[] };

    expect(body.contacts[0].code).toBeNull();
    expect(body.contacts[0].deepLink).toBeNull();
    expect(dataStatement(db, "SELECT").sql).not.toMatch(/JOIN/);
  });
});

// ── Правка ────────────────────────────────────────────────────────

describe("правка контакту", () => {
  it("пише всі поля власника у свій рядок — власник у самому WHERE", async () => {
    const db = makeDb({ row: row({ name: "Карас Новий" }) });
    const res = await handleContacts(
      request("/api/contacts?id=5", {
        method: "PATCH",
        body: { name: "  Карас   Новий ", username: "karas", tags: [], notes: "" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update.sql).toMatch(
      /UPDATE contacts SET name = \?, username = \?, tags = \?, notes = \?, updated_at = \?\s+WHERE id = \? AND owner_id = \?/,
    );
    expect(update.binds[0]).toBe("Карас Новий");
    expect(update.binds[1]).toBe("karas");
    expect(update.binds[5]).toBe(5);
    expect(update.binds[6]).toBe(USER_ID);
    // Дати приєднання правкою не чіпаються: їх ставить той, хто бачив перехід.
    // Поки id був редагованим, власник міг стерти його й зняти заборону лінка.
    expect(update.sql).not.toMatch(/joined_user_id = \?/);
    expect(update.sql).not.toMatch(/joined_bot_at = \?/);
    expect(update.sql).not.toMatch(/joined_platform_at = \?/);
  });

  it("⛔ чужий або неіснуючий номер — та сама 404, що й у видаленні", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleContacts(
      request("/api/contacts?id=42", {
        method: "PATCH",
        body: { name: "Карас" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(dataStatement(db, "UPDATE").binds).toContain(USER_ID);
  });

  it("⛔ порожнє ім'я правки не робить", async () => {
    const db = makeDb();
    const res = await handleContacts(
      request("/api/contacts?id=5", {
        method: "PATCH",
        body: { name: "   " },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^UPDATE/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("без `id` — 400, а не «оновлено все»", async () => {
    const db = makeDb();
    const res = await handleContacts(
      request("/api/contacts", {
        method: "PATCH",
        body: { name: "Карас" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^UPDATE/i.test(s.sql.trimStart()))).toBe(false);
  });
});

// ── Лінк ──────────────────────────────────────────────────────────

describe("особистий лінк контакту", () => {
  it("складає код, який проходить payload бота", async () => {
    const db = makeDb({ row: row({ id: 5, joined_bot_at: null }) });
    const res = await handleContactLink(
      request("/api/contacts/link?id=5", { method: "POST", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update.sql).toMatch(
      /UPDATE contacts SET code = \?, updated_at = \? WHERE id = \? AND owner_id = \?/,
    );

    // Код — це адреса входу в бот: він мусить проходити payload бота.
    const code = String(update.binds[0]);
    expect(isInviteCode(code)).toBe(true);
    expect(isValidBotPayload(code)).toBe(true);
    expect(update.binds[2]).toBe(5);
    expect(update.binds[3]).toBe(USER_ID);
  });

  it("⛔ тому, хто вже зайшов у бота, лінк не видається — він нікого не закріпить", async () => {
    const db = makeDb({
      row: row({
        id: 5,
        joined_user_id: 6281898553,
        joined_bot_at: "2026-09-17 10:00:00",
      }),
    });
    const res = await handleContactLink(
      request("/api/contacts/link?id=5", { method: "POST", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^UPDATE/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("⛔ чужого контакту лінк не скласти", async () => {
    const db = makeDb({ row: null });
    const res = await handleContactLink(
      request("/api/contacts/link?id=42", { method: "POST", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(db.statements.some((s) => /^UPDATE/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("без `id` — 400", async () => {
    const db = makeDb();
    const res = await handleContactLink(
      request("/api/contacts/link", { method: "POST", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(400);
  });
});

// ── Видалення ─────────────────────────────────────────────────────

describe("видалення контакту", () => {
  it("прибирає рядок лише свого власника", async () => {
    const db = makeDb();
    const res = await handleContacts(
      request("/api/contacts?id=5", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    const remove = dataStatement(db, "DELETE");
    expect(remove.sql).toMatch(/DELETE FROM contacts WHERE id = \? AND owner_id = \?/);
    expect(remove.binds).toEqual([5, USER_ID]);
  });

  it("⛔ чужий або неіснуючий номер — однакова 404", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleContacts(
      request("/api/contacts?id=42", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(dataStatement(db, "DELETE").binds).toContain(USER_ID);
  });

  it("без `id` — 400, а не «видалено все»", async () => {
    const db = makeDb();
    const res = await handleContacts(
      request("/api/contacts", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^DELETE/i.test(s.sql.trimStart()))).toBe(false);
  });
});
