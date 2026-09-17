/**
 * Межа лінків-запрошень: **чиї лінки й кого вони закріплюють**.
 *
 * Лінк — це адреса входу в бот, тож тут перевіряється те, що не видно очима:
 * власник береться з підписаного `initData` (жоден заголовок його не підміняє),
 * чужий номер лінка відповідає так само, як неіснуючий, а **код**, який
 * повертає сервер, проходить перевірку payload бота — інакше лінк вів би в
 * нікуди, і Telegram обрізав би параметр мовчки.
 *
 * @module api-dev/src/controllers/invites.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { isInviteCode } from "@wwwuabot/shared/invites";
import { isValidBotPayload } from "@wwwuabot/shared/content";
import { handleInvites } from "./invites.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `invites` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const INVITE_COLUMNS = [
  "id",
  "owner_id",
  "code",
  "label",
  "invited_user_id",
  "invited_at",
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
            return { results: INVITE_COLUMNS.map((name) => ({ name })) };
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

/** Запит до даних лінків (DDL від `ensureTables` не рахуємо). */
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

// ── Ідентичність ──────────────────────────────────────────────────

describe("чиї лінки", () => {
  it("⛔ без підписаного initData лінки не читаються й не створюються", async () => {
    const db = makeDb();
    const read = await handleInvites(request("/api/invites"), db.env);
    const created = await handleInvites(
      request("/api/invites", { method: "POST", body: { label: "Карас" } }),
      db.env,
    );

    expect(read.status).toBe(401);
    expect(created.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("⛔ заголовок із чужим id власником не робить", async () => {
    const db = makeDb();
    const req = new Request("https://api.example.com/api/invites", {
      headers: { "X-Telegram-User-Id": "999" },
    });

    expect((await handleInvites(req, db.env)).status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("список питає лише свого власника", async () => {
    const db = makeDb({ rows: [] });
    const res = await handleInvites(
      request("/api/invites", { initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, links: [] });
    const select = dataStatement(db, "SELECT");
    expect(select.binds[0]).toBe(USER_ID);
  });
});

// ── Створення ─────────────────────────────────────────────────────

describe("створення лінка", () => {
  it("пише власника з підпису, а код складає сам", async () => {
    const db = makeDb({
      row: {
        id: 7,
        code: "inv-8f3k2q",
        label: "Карас",
        invited_user_id: null,
        invited_at: null,
        created_at: "2026-09-17 10:00:00",
        platform_username: null,
        first_name: null,
        last_name: null,
        username: null,
      },
    });
    const res = await handleInvites(
      request("/api/invites", {
        method: "POST",
        body: { label: "  Карас  " },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const insert = dataStatement(db, "INSERT");
    expect(insert.sql).toMatch(/INTO invites/);
    expect(insert.binds[0]).toBe(USER_ID);
    expect(insert.binds[2]).toBe("Карас");

    // Код — це адреса входу в бот: він мусить проходити payload бота.
    const code = String(insert.binds[1]);
    expect(isInviteCode(code)).toBe(true);
    expect(isValidBotPayload(code)).toBe(true);
  });

  it("⛔ порожній підпис лінка не створює", async () => {
    const db = makeDb();
    const res = await handleInvites(
      request("/api/invites", {
        method: "POST",
        body: { label: "   " },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^INSERT/i.test(s.sql.trimStart()))).toBe(false);
  });
});

// ── Список ────────────────────────────────────────────────────────

describe("список лінків", () => {
  it("готовий діплінк, ім'я контакту й глибина його гілки — від сервера", async () => {
    const db = makeDb({
      rows: [
        {
          id: 1,
          code: "inv-8f3k2q",
          label: "Карас",
          invited_user_id: 555,
          invited_at: "2026-09-17 10:00:00",
          created_at: "2026-09-17 09:00:00",
          platform_username: "Карас",
          first_name: "Sergiy",
          last_name: "Diskant",
          username: "karas",
        },
      ],
      counts: [{ owner_id: 555, total: 2 }],
    });
    const res = await handleInvites(
      request("/api/invites", { initData: await signedInitData() }),
      db.env,
    );
    const body = (await res.json()) as { links: { deepLink: string; contact: unknown }[] };

    expect(body.links[0].deepLink).toBe("https://t.me/wwwuabot?start=inv-8f3k2q");
    expect(body.links[0].contact).toEqual({
      userId: 555,
      name: "Карас",
      username: "karas",
      joinedAt: "2026-09-17 10:00:00",
      invitedCount: 2,
    });
    // Другий рівень рахується одним запитом на весь список.
    expect(dataStatement(db, "COUNT").sql).toMatch(/GROUP BY owner_id/);
  });

  it("лінк, за яким ще ніхто не прийшов, контакту не вигадує", async () => {
    const db = makeDb({
      rows: [
        {
          id: 2,
          code: "inv-zz9zz9",
          label: "Очікує",
          invited_user_id: null,
          invited_at: null,
          created_at: "2026-09-17 09:00:00",
        },
      ],
    });
    const res = await handleInvites(
      request("/api/invites", { initData: await signedInitData() }),
      db.env,
    );
    const body = (await res.json()) as { links: { contact: unknown }[] };

    expect(body.links[0].contact).toBeNull();
    expect(db.statements.some((s) => /COUNT\(\*\)/i.test(s.sql))).toBe(false);
  });
});

// ── Видалення ─────────────────────────────────────────────────────

describe("видалення лінка", () => {
  it("прибирає рядок лише свого власника", async () => {
    const db = makeDb();
    const res = await handleInvites(
      request("/api/invites?id=5", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    const remove = dataStatement(db, "DELETE");
    expect(remove.sql).toMatch(/DELETE FROM invites WHERE id = \? AND owner_id = \?/);
    expect(remove.binds).toEqual([5, USER_ID]);
  });

  it("⛔ чужий або неіснуючий номер — однакова 404", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleInvites(
      request("/api/invites?id=42", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(dataStatement(db, "DELETE").binds).toContain(USER_ID);
  });

  it("без `id` — 400, а не «видалено все»", async () => {
    const db = makeDb();
    const res = await handleInvites(
      request("/api/invites", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^DELETE/i.test(s.sql.trimStart()))).toBe(false);
  });
});
