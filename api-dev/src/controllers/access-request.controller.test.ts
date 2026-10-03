/**
 * Межа прохання: **що взагалі варто зберегти**.
 *
 * Тут розміщено дві різні відмови, які раніше ділили один `try`: зіпсане тіло —
 * це помилка запиту, а порожній текст — це «нічого не прийнято», і друге
 * жодного рядка в базі не варте. Злиті разом вони звуть однаково, тому людина
 * не розуміє, чи її лист не дійшов, чи його не було.
 *
 * @module api-dev/src/controllers/access-request.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleAccessRequest } from "./access-request.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

const REQUEST_COLUMNS = ["id", "user_id", "text", "status", "created_at"];

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

function makeDb(): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => null,
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: REQUEST_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: 1, last_row_id: 1 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

function inserts(db: { statements: Captured[] }): Captured[] {
  return db.statements.filter((s) => /^INSERT INTO/i.test(s.sql.trimStart()));
}

function request(body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request("https://api.example.com/api/user/access-request", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("без підписаного initData не пишемо нічого", async () => {
    const db = makeDb();
    const res = await handleAccessRequest(request({ text: "питання" }), db.env);

    expect(res.status).toBe(401);
    expect(inserts(db)).toHaveLength(0);
  });

  it("не-об'єкт у тілі — це помилка запиту, а не порожнє повідомлення", async () => {
    const db = makeDb();
    const res = await handleAccessRequest(request(`"питання"`, await signedInitData()), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(inserts(db)).toHaveLength(0);
  });
});

// ── Порожнє повідомлення ─────────────────────────────────────────

describe("порожнє повідомлення", () => {
  it("порожній текст не варте рядка в базі", async () => {
    const db = makeDb();
    const res = await handleAccessRequest(request({ text: "   " }, await signedInitData()), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Порожнє повідомлення" });
    expect(inserts(db)).toHaveLength(0);
  });
});

// ── Дія, яка має дійти ────────────────────────────────────────────

describe("прохання зберігається", () => {
  it("текст пишеться від того, хто підписаний, а не з тіла", async () => {
    const db = makeDb();
    const res = await handleAccessRequest(
      request({ text: "Не впускайте мене" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(inserts(db)).toHaveLength(1);
    expect(inserts(db)[0].binds).toEqual([USER_ID, "Не впускайте мене"]);
  });
});
