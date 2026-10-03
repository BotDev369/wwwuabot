/**
 * Межа тіла схеми теми: **схема форми — не правило**.
 *
 * Усі поля теми перевіряє спільне `validateThemeScheme`, і його ж повторювати в
 * zod-схемі не можна: друга копія розійшлася б з першою мовчки. Тому схема
 * тут робить рівно одне — каже, що це об'єкт. Тест це й фіксує: не-об'єкт
 * відпадає на розборі, а зміст відповідає **правило**, а не схема.
 *
 * @module api-dev/src/controllers/themes.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleUserThemes } from "./themes.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

const SCHEME_COLUMNS = ["id", "owner_id", "name", "colors_json", "font", "is_public", "created_at"];

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
            ? { results: SCHEME_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: 1, last_row_id: 4 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

function wroteSchemes(db: { statements: Captured[] }): boolean {
  return db.statements.some((s) =>
    /^(INSERT INTO|UPDATE|DELETE FROM)\s+theme_schemes\b/i.test(s.sql.trimStart()),
  );
}

function request(body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request("https://api.example.com/api/user/themes", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("без підписаного initData не пишемо нічого", async () => {
    const db = makeDb();
    const res = await handleUserThemes(request({ name: "Моя" }), db.env);

    expect(res.status).toBe(401);
    expect(wroteSchemes(db)).toBe(false);
  });

  it("не-об'єкт у тілі відкидає розбір, а не правило теми", async () => {
    const db = makeDb();
    const res = await handleUserThemes(request(`"Моя тема"`, await signedInitData()), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteSchemes(db)).toBe(false);
  });
});

describe("зміст відповідає спільне правило", () => {
  it("порожня схема відхиляється `validateThemeScheme`, а не розбором", async () => {
    const db = makeDb();
    const res = await handleUserThemes(request({ name: "" }, await signedInitData()), db.env);
    const body = (await res.json()) as { ok?: boolean; error?: string };

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).not.toBe("Invalid body");
    expect(wroteSchemes(db)).toBe(false);
  });
});
