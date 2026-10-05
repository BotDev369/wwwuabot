/**
 * Межа тіла дат: **яку саме дату ми правимо**.
 *
 * `id` дати — рядок: число в `id` не знаходило нічого і повертало `404`
 * «Not found», наче дати не існувало. Раніше це був `as Partial<MyDateItem>` —
 * твердження, яке компілятор не перевіряв; тепер тип перевіряє схема.
 *
 * @module api-dev/src/controllers/my-dates.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleMyDates, type MyDateItem } from "./my-dates.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

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

function makeDb(): { env: Env; statements: Captured[]; rows: MyDateItem[] } {
  const statements: Captured[] = [];
  const rows: MyDateItem[] = [SAVED];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        // Умова власника виконується: чужий рядок не знаходиться ані в списку,
        // ані при правці — інакше «404 на неіснуючу дату» нічого не значила б.
        first: async () => {
          const [userId, id] = record.binds;
          return rows.find((row) => row.user_id === userId && row.id === id) ?? null;
        },
        all: async () => {
          const userId = record.binds[0];
          const owned = rows.filter((row) => row.user_id === userId);
          return {
            results: /ORDER BY date/.test(sql)
              ? [...owned].sort((l, r) => l.date.localeCompare(r.date))
              : owned,
          };
        },
        run: async () => {
          // Умова власника в DELETE виконується: чужий рядок лишається на місці,
          // тож тест на `404` не перетворився б на перевірку самого фейка.
          if (/^\s*DELETE FROM my_dates/i.test(sql)) {
            const [userId, ...ids] = record.binds;
            let changes = 0;
            for (let i = rows.length - 1; i >= 0; i--) {
              const row = rows[i];
              if (row.user_id === userId && ids.includes(row.id)) {
                rows.splice(i, 1);
                changes++;
              }
            }
            return { meta: { changes, last_row_id: 0 } };
          }
          return { meta: { changes: 1, last_row_id: 1 } };
        },
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements, rows };
}

/** Чи дійшов запис до `my_dates` — а не у колонку `users.my_dates`. */
function wroteDates(db: { statements: Captured[] }): boolean {
  return db.statements.some((s) => /INSERT INTO my_dates/i.test(s.sql));
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

  // Дату порівнює й сортує сам SQL, тож «03.03.1980» у тій самій колонці була б
  // другою алфавітою, а не тим самим значенням.
  it("дата не в `рррр-мм-дд` не зберігається", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("POST", { date: "03.03.1980", name: "Народження" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "date is required" });
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
  it("нову дату пишемо рядком у `my_dates`", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("POST", { date: "2026-03-03", name: "Свято" }, await signedInitData()),
      db.env,
    );
    const body = (await res.json()) as { ok: boolean; id: string };

    expect(res.status).toBe(200);
    expect(body.id).toBeTruthy();
    expect(wroteDates(db)).toBe(true);
    // Рядок у базі належить людині, а не «масиву дат» у її рядку.
    const insert = db.statements.find((s) => /INSERT INTO my_dates/i.test(s.sql));
    expect(insert?.binds[0]).toBe(USER_ID);
  });

  it("список віддає лише дати цієї людини", async () => {
    const db = makeDb();
    db.rows.push({ ...SAVED, id: "чужа", user_id: 999 });

    const res = await handleMyDates(request("GET", undefined, await signedInitData()), db.env);
    const body = (await res.json()) as { dates: MyDateItem[] };

    expect(res.status).toBe(200);
    expect(body.dates.map((date) => date.id)).toEqual(["abc123"]);
  });

  // Чужий рядок не знаходиться зовсім: `404` на нього такий самий, як на
  // неіснуючий, інакше відповідь стала б відмовою від існування (§7).
  it("правка чужої дати — той самий `404`, що й на неіснуючу", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("PUT", { id: SAVED.id, date: "2026-02-02", name: "Моя" }, await signedInitData(999)),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(db.rows[0].name).toBe(SAVED.name);
  });

  it("правки неіснуючої дати не стає — `404`, а не новий рядок", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request("PUT", { id: "немає-такої", date: "2026-02-02" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, error: "Not found" });
    expect(wroteDates(db)).toBe(false);
  });

  it("старий формат приймається: `alias` — це `name`, `category` — один тег", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      request(
        "POST",
        { id: "стара", date: "2026-04-04", alias: "Старе ім'я", category: "весілля" },
        await signedInitData(),
      ),
      db.env,
    );

    expect(res.status).toBe(200);
    const insert = db.statements.find((s) => /INSERT INTO my_dates/i.test(s.sql));
    expect(insert?.binds[4]).toBe("Старе ім'я");
    expect(insert?.binds[5]).toBe('["весілля"]');
  });

  // Чужого рядка немає «у моїх датах», тож і видалення такого номера — не
  // знахідка: інакше відповідь була б відмовою від існування (§7).
  it("видалення чужого або неіснуючого номера — `404`", async () => {
    const db = makeDb();
    const other = await handleMyDates(
      new Request("https://api.example.com/api/mydate/dates?id=abc123", {
        method: "DELETE",
        headers: { [INIT_DATA_HEADER]: await signedInitData(999) },
      }),
      db.env,
    );
    const missing = await handleMyDates(
      new Request("https://api.example.com/api/mydate/dates?id=немає", {
        method: "DELETE",
        headers: { [INIT_DATA_HEADER]: await signedInitData() },
      }),
      db.env,
    );

    expect(other.status).toBe(404);
    expect(missing.status).toBe(404);
  });

  it("видалення каже, скільки рядків зникло насправді", async () => {
    const db = makeDb();
    const res = await handleMyDates(
      new Request("https://api.example.com/api/mydate/dates?id=abc123", {
        method: "DELETE",
        headers: { [INIT_DATA_HEADER]: await signedInitData() },
      }),
      db.env,
    );

    expect(res.status).toBe(200);
    // Число реально видалених рядків: список на екрані оновлюється за ним.
    expect(await res.json()).toEqual({ ok: true, deleted: 1 });
    expect(db.rows).toHaveLength(0);
  });
});
