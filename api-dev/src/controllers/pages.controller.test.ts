/**
 * Межа тіла сторінки й товару: **`id` вирішує, правка це чи створення**.
 *
 * Раніше `Number(body.id)` не відсікав не-число, а підставляв: `"5abc"` давало
 * `5`, тобто запит «оновити сторінку 5abc» тихо правив сторінку 5. Тепер таке
 * тіло відпадає цілому, щоб натомість не з'явилася сторінка-дубль.
 *
 * @module api-dev/src/controllers/pages.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleUserPages } from "./pages.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `scenarios` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const SCENARIO_COLUMNS = [
  "id",
  "slug",
  "owner_id",
  "is_public",
  "template_key",
  "page_data",
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
            ? { results: SCENARIO_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: 1, last_row_id: 5 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

/** Чи змінив контролер рядок сторінок (DDL і прагми не рахуємо). */
function wrotePages(db: { statements: Captured[] }): boolean {
  return db.statements.some((s) =>
    /^(INSERT INTO|UPDATE|DELETE FROM)\s+scenarios\b/i.test(s.sql.trimStart()),
  );
}

function request(body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request("https://api.example.com/api/user/pages", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("без підписаного initData не пишемо нічого", async () => {
    const db = makeDb();
    const res = await handleUserPages(request({ id: "5abc" }), db.env);

    expect(res.status).toBe(401);
    expect(wrotePages(db)).toBe(false);
  });

  it("не-об'єкт у тілі відкидає розбір, а не бізнес-правило", async () => {
    const db = makeDb();
    const res = await handleUserPages(request(`"сторінка"`, await signedInitData()), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wrotePages(db)).toBe(false);
  });

  // Регресія: `Number("5abc")` — це `5`, і запит правив би чужу сторінку.
  it("`id`, який не є числом, не стає номером іншої сторінки", async () => {
    const db = makeDb();
    const res = await handleUserPages(request({ id: "5abc" }, await signedInitData()), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wrotePages(db)).toBe(false);
  });

  it("причину відмови змісту віддає спільне правило, а не розбір тіла", async () => {
    const db = makeDb();
    const res = await handleUserPages(
      request({ template: "home" }, await signedInitData()),
      db.env,
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };

    // Правило змісту живе у `validatePageDraft`, тож його текст має дійти.
    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).not.toBe("Invalid body");
    expect(wrotePages(db)).toBe(false);
  });
});
