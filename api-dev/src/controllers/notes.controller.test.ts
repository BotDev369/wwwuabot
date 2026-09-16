/**
 * Межа нотаток: **чиї вони й кому належать**.
 *
 * Головне, що тут фіксується: власник береться завжди — із підписаного
 * `initData` у платформі та з акаунта сесії в панелі, — а оновлення **й
 * видалення** рядка можливе лише тоді, коли його номер належить саме цьому
 * власнику. Це той самий IDOR, який колись знайшли тести домену «сайтів»
 * (AGENTS.md §7): «контейнер мій» не означає «вкладений об'єкт мій».
 *
 * @module api-dev/src/controllers/notes.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleAdminNotes, handleNotes } from "./notes.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `notes` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const NOTE_COLUMNS = ["id", "scope", "owner_id", "text", "tags", "created_at", "updated_at"];

interface Captured {
  sql: string;
  binds: unknown[];
}

// ── Підпис initData ───────────────────────────────────────────────
// Копія зі `security/telegram.test.ts` навмисно: це фікстура тесту, а не код
// продукту. У `shared/src` підписувач жив би в бандлі воркера — тобто вмів би
// підробити ідентичність, чого в продукті не має вміти ніщо.

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

/** Підписаний `initData` тим самим алгоритмом, що й Telegram. */
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

// ── Заглушка D1 ───────────────────────────────────────────────────

function makeDb(options: { changes?: number; rows?: unknown[]; row?: unknown } = {}): {
  env: Env;
  statements: Captured[];
} {
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
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: NOTE_COLUMNS.map((name) => ({ name })) }
            : { results: options.rows ?? [] },
        run: async () => ({ meta: { changes: options.changes ?? 1, last_row_id: 7 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

/** Запит до даних нотаток (DDL від `ensureTables` не рахуємо). */
function dataStatement(
  db: { statements: Captured[] },
  keyword: "INSERT" | "UPDATE" | "SELECT" | "DELETE",
) {
  const match = [...db.statements]
    .reverse()
    .find((s) => s.sql.trimStart().toUpperCase().startsWith(keyword));
  if (!match) throw new Error(`у заглушці немає запиту ${keyword}`);
  return match;
}

function request(
  path: string,
  init: { method?: string; body?: unknown; initData?: string } = {},
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (init.initData) headers.set(INIT_DATA_HEADER, init.initData);
  return new Request(`https://api.example.com${path}`, {
    method: init.method ?? "POST",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

// ── Ідентичність ──────────────────────────────────────────────────

describe("чиї нотатки", () => {
  it("⛔ платформа без підписаного initData не пише нічого", async () => {
    const db = makeDb();
    const res = await handleNotes(request("/api/notes", { body: { text: "таємне" } }), db.env);

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("⛔ заголовок з чужим id не робить власником чужу людину", async () => {
    const db = makeDb();
    const req = new Request("https://api.example.com/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-User-Id": "999" },
      body: JSON.stringify({ text: "привіт" }),
    });
    const res = await handleNotes(req, db.env);

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("платформа пише нотатку на id із підпису", async () => {
    const db = makeDb();
    const res = await handleNotes(
      request("/api/notes", {
        body: { text: " Куку ", tags: ["#Київ"] },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const insert = dataStatement(db, "INSERT");
    expect(insert.sql).toMatch(/INTO notes/);
    // scope, owner_id, text, tags, created_at, updated_at
    expect(insert.binds.slice(0, 4)).toEqual(["user", String(USER_ID), "Куку", '["київ"]']);
  });

  it("панель пише нотатку на акаунт сесії, а не на людину", async () => {
    const db = makeDb();
    const res = await handleAdminNotes(
      request("/api/admin/notes", { body: { text: "план на тиждень" } }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(dataStatement(db, "INSERT").binds.slice(0, 4)).toEqual([
      "admin",
      "shared",
      "план на тиждень",
      "[]",
    ]);
  });
});

// ── Запис ─────────────────────────────────────────────────────────

describe("запис нотатки", () => {
  it("правка тримає власника в самому WHERE, а не окремою перевіркою", async () => {
    const db = makeDb({ row: { id: 5, scope: "user", owner_id: String(USER_ID) } });
    const res = await handleNotes(
      request("/api/notes", {
        body: { id: 5, text: "оновлено" },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update.sql).toMatch(/WHERE id = \? AND scope = \? AND owner_id = \?/);
    expect(update.binds.slice(-3)).toEqual([5, "user", String(USER_ID)]);
  });

  it("⛔ чужий або неіснуючий номер — однакова відповідь 404", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleNotes(
      request("/api/notes", { body: { id: 42, text: "чуже" }, initData: await signedInitData() }),
      db.env,
    );

    // Різні коди для «немає» й «чужий» теж були б витоком (§7).
    expect(res.status).toBe(404);
    expect(dataStatement(db, "UPDATE").binds).toContain(String(USER_ID));
  });

  it("порожню нотатку не пише", async () => {
    const db = makeDb();
    const res = await handleNotes(
      request("/api/notes", {
        body: { text: "   ", tags: ["#"] },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^INSERT/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("хибні хештеги нормалізуються перед записом", async () => {
    const db = makeDb();
    await handleNotes(
      request("/api/notes", {
        body: { text: "текст", tags: ["#Київ", "київ", 7, " Свято"] },
        initData: await signedInitData(),
      }),
      db.env,
    );

    expect(dataStatement(db, "INSERT").binds[3]).toBe('["київ","свято"]');
  });
});

// ── Видалення ─────────────────────────────────────────────────────

describe("видалення нотатки", () => {
  it("прибирає рядок лише свого простору й власника", async () => {
    const db = makeDb();
    const res = await handleNotes(
      request("/api/notes?id=5", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(200);
    const remove = dataStatement(db, "DELETE");
    expect(remove.sql).toMatch(/DELETE FROM notes WHERE id = \? AND scope = \? AND owner_id = \?/);
    expect(remove.binds).toEqual([5, "user", String(USER_ID)]);
  });

  it("⛔ чужий або неіснуючий номер — та сама 404", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleNotes(
      request("/api/notes?id=42", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(404);
    // Власник усе одно стоїть у запиті: саме він і зробив видалення нічим.
    expect(dataStatement(db, "DELETE").binds).toContain(String(USER_ID));
  });

  it("⛔ без підписаного initData не видаляється нічого", async () => {
    const db = makeDb();
    const res = await handleNotes(request("/api/notes?id=5", { method: "DELETE" }), db.env);

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("без `id` — 400, а не «видалено все»", async () => {
    // `Number(null)` — це 0, а `DELETE` без умови зніс би всі нотатки.
    const db = makeDb();
    const res = await handleNotes(
      request("/api/notes", { method: "DELETE", initData: await signedInitData() }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^DELETE/i.test(s.sql.trimStart()))).toBe(false);
  });
});

// ── Читання ───────────────────────────────────────────────────────

describe("список нотаток", () => {
  it("питає лише свій простір і свого власника", async () => {
    const db = makeDb({ rows: [] });
    await handleNotes(
      request("/api/notes", { method: "GET", initData: await signedInitData() }),
      db.env,
    );

    const select = dataStatement(db, "SELECT");
    expect(select.sql).toMatch(/FROM notes WHERE scope = \? AND owner_id = \?/);
    expect(select.binds[0]).toBe("user");
    expect(select.binds[1]).toBe(String(USER_ID));
  });

  it("віддає хештеги масивом, а не рядком JSON", async () => {
    const db = makeDb({
      rows: [
        {
          id: 1,
          scope: "user",
          owner_id: String(USER_ID),
          text: "Куку",
          tags: '["київ"]',
          created_at: "2026-09-16 10:00:00",
          updated_at: "2026-09-16 10:00:00",
        },
      ],
    });
    const res = await handleNotes(
      request("/api/notes", { method: "GET", initData: await signedInitData() }),
      db.env,
    );

    expect(await res.json()).toEqual({
      ok: true,
      notes: [
        {
          id: 1,
          scope: "user",
          owner_id: String(USER_ID),
          text: "Куку",
          tags: ["київ"],
          created_at: "2026-09-16 10:00:00",
          updated_at: "2026-09-16 10:00:00",
        },
      ],
    });
  });
});
