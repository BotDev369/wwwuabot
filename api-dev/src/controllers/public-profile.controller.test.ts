/**
 * Межа тіла профілю: **відкритий профіль чи ні**.
 *
 * Головне, що тут фіксується: `public` мусить бути булевим. Рядок `"false"`
 * легко надіслати випадково (форма, тест, чужий скрипт), і він відкрив би
 * профіль замість закриття — без жодної помилки. Тип перевіряє схема, тож такий
 * запит не доходить до `UPDATE users`.
 *
 * @module api-dev/src/controllers/public-profile.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleUserAbout, handleUserVisibility } from "./public-profile.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `users` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const USER_COLUMNS = [
  "user_id",
  "first_name",
  "last_name",
  "username",
  "language",
  "role",
  "tariff",
  "status",
  "discount",
  "permissions",
  "is_blocked",
  "platform_username",
  "photo_url",
  "about",
  "profile_public",
  "profile_public_fields",
  "telegram_json",
  "created_at",
  "updated_at",
];

interface Captured {
  sql: string;
  binds: unknown[];
}

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

function makeDb(row: unknown = { user_id: USER_ID, profile_public: 0 }): {
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
        first: async () => row,
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: USER_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: 1, last_row_id: 1 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

/** Чи писав контролер у `users` (DDL і прагми від `ensureTables` не рахуємо). */
function wroteUsers(db: { statements: Captured[] }): boolean {
  return db.statements.some((s) => /^UPDATE\s+users\b/i.test(s.sql.trimStart()));
}

function request(path: string, body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request(`https://api.example.com${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("без підписаного initData не пишемо нічого, навіть з валідним тілом", async () => {
    const db = makeDb();
    const res = await handleUserVisibility(
      request("/api/user/visibility", { public: true, fields: [] }),
      db.env,
    );

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("не-об'єкт у тілі відкидає розбір, а не бізнес-правило", async () => {
    const db = makeDb();
    const res = await handleUserAbout(
      request("/api/user/about", `"про себе"`, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteUsers(db)).toBe(false);
  });

  // Регресія: рядок `"false"` відкрив би профіль замість закриття.
  it("`public` як рядок не відкриває профіль", async () => {
    const db = makeDb();
    const res = await handleUserVisibility(
      request("/api/user/visibility", { public: "false", fields: [] }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(wroteUsers(db)).toBe(false);
  });

  it("відсутність `public` теж не проходить: мовчазно нічого не міняємо", async () => {
    const db = makeDb();
    const res = await handleUserVisibility(
      request("/api/user/visibility", { fields: ["about"] }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(wroteUsers(db)).toBe(false);
  });
});

// ── Дія, яка має дійти ────────────────────────────────────────────

describe("видимість зберігається", () => {
  it("булеве `false` пише нуль у базу, а не лишає попереднє значення", async () => {
    const db = makeDb();
    const res = await handleUserVisibility(
      request("/api/user/visibility", { public: false, fields: [] }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = db.statements.find((s) => /^UPDATE\s+users/i.test(s.sql.trimStart()));
    expect(update?.binds[0]).toBe(0);
    expect(update?.binds.at(-1)).toBe(USER_ID);
  });
});
