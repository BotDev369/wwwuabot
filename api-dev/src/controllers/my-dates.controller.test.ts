/**
 * Межа тіла дат: **яку саме дату ми правимо**.
 *
 * Тут фіксується те, що ламалося мовчки. `id` дати — рядок, і `findIndex`
 * порівнює саме рядки: число в `id` не знаходило нічого і повертало `404`
 * «Not found», наче дати не існувало. Раніше це був `as Partial<MyDateItem>` — твердження,
 * яке компілятор не перевіряв. Тепер тип перевіряє схема, тож
 * такий запит одразу каже, що `id` некоректний.
 *
 * @module api-dev/src/controllers/my-dates.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleMyDates, type MyDateItem } from "./my-dates.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `users` — щоб `withAutoMigrate` не додавав `ALTER` на кожен прогін. */
const USER_COLUMNS = ["user_id", "my_dates", "created_at", "updated_at"];

const SAVED: MyDateItem = {
  id: "abc123",
  user_id: USER_ID,
  date: "2026-01-01",
  type: "other",
  name: "Новий рік",
  tags: [],
  notes: "",
  created_at: "2026-01-01 00:00:00",
  updated_at: "2026-01-01 00:00:00",
};

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
  const row = { user_id: USER_ID, my_dates: JSON.stringify({ items: [SAVED] }) };
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

/** Чи записував контролер `my_dates` у рядок користувача. */
function wroteDates(db: { statements: Captured[] }): boolean {
  return db.statements.some((s) => /UPDATE\s+users\s+SET\s+my_dates/i.test(s.sql));
}

function request(method: string, body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request("https://api.example.com/api/mydate/dates", {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("без підписаного initData не пишемо нічого", async () => {
    const db = makeDb();
    const res = await handleMyDates(request("PUT", { id: SAVED.id, date: "2026-02-02" }), db.env);

    expect(res.status).toBe(401);
    expect(wroteDates(db)).toBe(false);
  });

  it("не-об'єкт у тілі відкидає розбір, а не бізнес-правило", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("POST", `"2026-01-01"`, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteDates(db)).toBe(false);
  });

  // Регресія: число в `id` не знаходилося й віддавало `404` «Not found», наче
  // дати не існувало. Тепер це помилка запиту, а не «не знайдено».
  it("число в `id` не стає «не знайдено» — це некоректний запит", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("PUT", { id: 123, date: "2026-02-02" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteDates(db)).toBe(false);
  });

  it("число в `date` не потрапляє в рядок дати", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("POST", { date: 20260101 }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteDates(db)).toBe(false);
  });

  it("без `id` причина лишається людською: без `date` — теж", async () => {
    const db = makeDb();
    const noId = await handleMyDates(
      request("PUT", { date: "2026-02-02" }, await signedInitData()),
      db.env,
    );
    const noDate = await handleMyDates(
      request("POST", { name: "Без дати" }, await signedInitData()),
      db.env,
    );

    expect(await noId.json()).toEqual({ ok: false, error: "id is required" });
    expect(await noDate.json()).toEqual({ ok: false, error: "date is required" });
    expect(wroteDates(db)).toBe(false);
  });
});

// ── Дія, яка має дійти ────────────────────────────────────────────

describe("дата зберігається", () => {
  it("нову дату пишемо в рядок користувача", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("POST", { date: "2026-03-03", name: "Свято" }, await signedInitData()),
      db.env,
    );
    const body = (await res.json()) as { ok: boolean; id: string };

    expect(res.status).toBe(200);
    expect(body.id).toBeTruthy();
    expect(wroteDates(db)).toBe(true);
  });

  it("правку чужої дати не знаходимо, а створюємо нову замість неї", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("PUT", { id: "немає-такої", date: "2026-02-02" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "Not found" });
    expect(wroteDates(db)).toBe(false);
  });
});
