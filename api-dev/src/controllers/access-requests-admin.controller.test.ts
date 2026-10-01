/**
 * Пошта про звернення: що адмін може зробити з повідомленням і чого не може.
 *
 * Головне, що тут фіксується: правило **одне** для чотирьох дій (межа тексту,
 * неіснуючий номер — завжди 404) і те, що створити можна лише від імені людини,
 * яка реально є в базі: `user_id` обов'язковий, а рядок-сирота прочитати вже
 * неможливо (AGENTS.md §7).
 *
 * @module api-dev/src/controllers/access-requests-admin.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { ACCESS_REQUEST_MAX } from "@wwwuabot/shared/access-requests";
import {
  handleAccessRequestsList,
  handleAccessRequestCreate,
  handleAccessRequestUpdate,
  handleAccessRequestDelete,
} from "./access-requests-admin.controller";

interface Captured {
  sql: string;
  binds: unknown[];
}

/** Колонки `access_requests` — щоб `ensureTables` не вигадував `ALTER`. */
const COLUMNS = ["id", "user_id", "text", "created_at"];

function makeDb(
  options: { rows?: unknown[]; row?: unknown; exists?: boolean; changes?: number } = {},
): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        // `first()` — це і перевірка «людина існує», і читання рядка після
        // запису; за замовчуванням людина є, щоб тест списку не залежав від неї.
        first: async () => {
          if (options.exists === false) return null;
          return options.row ?? { user_id: 1 };
        },
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: COLUMNS.map((name) => ({ name })) }
            : { results: options.rows ?? [] },
        run: async () => ({ meta: { changes: options.changes ?? 1, last_row_id: 12 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db } as unknown as Env, statements };
}

function dataStatement(db: { statements: Captured[] }, keyword: "INSERT" | "UPDATE" | "DELETE") {
  const match = [...db.statements]
    .reverse()
    .find((s) => s.sql.trimStart().toUpperCase().startsWith(keyword));
  if (!match) throw new Error(`у заглушці немає запиту ${keyword}`);
  return match;
}

function post(path: string, body: unknown, method = "POST"): Request {
  return new Request(`https://api.example.com${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Список ───────────────────────────────────────────────────────
describe("список звернень", () => {
  it("⛔ SELECT * на таблиці з важкими JSON-колонками не пишемо", async () => {
    const db = makeDb({ rows: [] });
    await handleAccessRequestsList(
      new Request("https://api.example.com/api/admin/access-requests", { method: "GET" }),
      db.env,
    );

    const select = [...db.statements].reverse().find((s) => s.sql.includes("access_requests"));
    expect(select?.sql).not.toMatch(/SELECT \*/);
  });

  it("бере автора ліворуч: звернення лишається, навіть якщо людини немає", async () => {
    const db = makeDb({ rows: [] });
    await handleAccessRequestsList(
      new Request("https://api.example.com/api/admin/access-requests", { method: "GET" }),
      db.env,
    );

    const select = [...db.statements].reverse().find((s) => s.sql.includes("FROM access_requests"));
    expect(select?.sql).toMatch(/LEFT JOIN users ON users\.user_id = access_requests\.user_id/);
  });

  it("віддає список новішими першими", async () => {
    const db = makeDb({
      rows: [
        {
          id: 1,
          user_id: 42,
          text: "Куку",
          created_at: "2026-10-01 09:00:00",
          first_name: "Тест",
          last_name: null,
          username: "test",
          platform_username: null,
        },
      ],
    });
    const res = await handleAccessRequestsList(
      new Request("https://api.example.com/api/admin/access-requests", { method: "GET" }),
      db.env,
    );

    const body = (await res.json()) as { ok: boolean; items: { text: string; username: string }[] };
    expect(body.ok).toBe(true);
    expect(body.items[0].text).toBe("Куку");
    expect(body.items[0].username).toBe("test");
  });
});

// ── Створення ────────────────────────────────────────────────────
describe("створення звернення", () => {
  it("пише від імені наявної людини", async () => {
    const db = makeDb({ exists: true });
    const res = await handleAccessRequestCreate(
      post("/api/admin/access-requests", { user_id: 42, text: "  Куку  " }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(dataStatement(db, "INSERT").binds).toEqual([42, "Куку"]);
  });

  it("⛔ без автора нічого не пише", async () => {
    const db = makeDb({ exists: true });
    const res = await handleAccessRequestCreate(
      post("/api/admin/access-requests", { text: "Куку" }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^INSERT/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("⛔ невідома людина — 404, а не рядок-сирота", async () => {
    const db = makeDb({ exists: false });
    const res = await handleAccessRequestCreate(
      post("/api/admin/access-requests", { user_id: 999, text: "Куку" }),
      db.env,
    );

    expect(res.status).toBe(404);
    expect(db.statements.some((s) => /^INSERT/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("⛔ довший текст обрізається тією самою межею, що й при прийомі", async () => {
    const db = makeDb({ exists: true });
    await handleAccessRequestCreate(
      post("/api/admin/access-requests", {
        user_id: 42,
        text: "а".repeat(ACCESS_REQUEST_MAX + 30),
      }),
      db.env,
    );

    expect(String(dataStatement(db, "INSERT").binds[1])).toHaveLength(ACCESS_REQUEST_MAX);
  });

  it("⛔ порожнє повідомлення не варте рядка", async () => {
    const db = makeDb({ exists: true });
    const res = await handleAccessRequestCreate(
      post("/api/admin/access-requests", { user_id: 42, text: "   " }),
      db.env,
    );

    expect(res.status).toBe(400);
  });
});

// ── Правка ───────────────────────────────────────────────────────
describe("правка звернення", () => {
  it("міняє лише текст: автор лишається тим, хто сказав", async () => {
    const db = makeDb({ exists: true });
    const res = await handleAccessRequestUpdate(
      post("/api/admin/access-requests/update", { id: 5, text: "виправлено" }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update.sql).toMatch(/UPDATE access_requests SET text = \? WHERE id = \?/);
    expect(update.binds).toEqual(["виправлено", 5]);
  });

  it("⛔ неіснуючий або чужий номер — однакова 404", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleAccessRequestUpdate(
      post("/api/admin/access-requests/update", { id: 42, text: "текст" }),
      db.env,
    );

    expect(res.status).toBe(404);
  });

  it("⛔ без номера — 400, а не правка всього", async () => {
    const db = makeDb({ exists: true });
    const res = await handleAccessRequestUpdate(
      post("/api/admin/access-requests/update", { text: "текст" }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^UPDATE/i.test(s.sql.trimStart()))).toBe(false);
  });
});

// ── Видалення ────────────────────────────────────────────────────
describe("видалення звернення", () => {
  it("прибирає рядок за номером", async () => {
    const db = makeDb();
    const res = await handleAccessRequestDelete(
      new Request("https://api.example.com/api/admin/access-requests?id=5", { method: "DELETE" }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(dataStatement(db, "DELETE").binds).toEqual([5]);
  });

  it("⛔ без номера — 400, а не «видалено все»", async () => {
    const db = makeDb();
    const res = await handleAccessRequestDelete(
      new Request("https://api.example.com/api/admin/access-requests", { method: "DELETE" }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements.some((s) => /^DELETE/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("⛔ неіснуючий номер — 404", async () => {
    const db = makeDb({ changes: 0 });
    const res = await handleAccessRequestDelete(
      new Request("https://api.example.com/api/admin/access-requests?id=42", { method: "DELETE" }),
      db.env,
    );

    expect(res.status).toBe(404);
  });
});
