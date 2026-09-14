/**
 * Межа портального CRUD: **чим** адресується рядок.
 *
 * Головне, що тут фіксується: `update` без номера не працює взагалі, а з
 * номером — може змінити саму адресу. Без цього перейменування сторінки
 * неможливе, а «перейменування» через UPSERT створило б другий рядок.
 *
 * @module api-dev/src/controllers/scenarios-portal.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { handleDelete, handleRead, handleUpdate, handleWrite } from "./scenarios-portal.controller";

interface Captured {
  sql: string;
  binds: unknown[];
}

interface FakeDb {
  env: Env;
  statements: Captured[];
}

/** Заглушка D1: запам'ятовує SQL і дозволяє підмінити результат. */
function makeDb(
  options: { row?: Record<string, unknown> | null; runError?: Error; changes?: number } = {},
): FakeDb {
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
        all: async () => ({ results: [] }),
        run: async () => {
          // Помилку підкидаємо лише на запит до даних: DDL від `ensureTables`
          // виконується до `try` і зламав би сценарій перевірки.
          const isData = /^(UPDATE|DELETE|INSERT)/i.test(sql.trimStart());
          if (options.runError && isData) throw options.runError;
          return { meta: { changes: options.changes ?? 1, last_row_id: 42 } };
        },
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db } as unknown as Env, statements };
}

function post(path: string, body: unknown): Request {
  return new Request(`https://api.example.com/api/portal/scenarios/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Останній запит, що змінює або читає дані (DDL від `ensureTables` не рахуємо). */
function dataStatement(db: FakeDb, keyword: "UPDATE" | "DELETE" | "SELECT"): Captured {
  const match = [...db.statements]
    .reverse()
    .find((s) => s.sql.trimStart().toUpperCase().startsWith(keyword));
  if (!match) throw new Error(`у заглушці немає запиту ${keyword}`);
  return match;
}

describe("handleUpdate", () => {
  it("без номера відповідає 400 — адреса не може бути ключем оновлення", async () => {
    const db = makeDb();
    const res = await handleUpdate(post("update", { slug: "mydate", title: "x" }), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "id required" });
    expect(db.statements).toHaveLength(0);
  });

  it("оновлює рядок за номером; адреса в тілі — значення, а не ключ пошуку", async () => {
    const db = makeDb({ row: { id: 7, slug: "mydate" } });
    const res = await handleUpdate(
      post("update", { id: 7, slug: "mydate", title: "Нове" }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update.sql).toContain('UPDATE "scenarios" SET title = ?, slug = ?, updated_at = ?');
    expect(update.sql.endsWith("WHERE id = ?")).toBe(true);
    expect(update.binds.at(-1)).toBe(7);
  });

  it("перейменовує: адреса стає полем, а не ключем пошуку", async () => {
    const db = makeDb();
    const res = await handleUpdate(
      post("update", { id: 7, slug: "mydate/2026", caption_top: "Привіт" }),
      db.env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(
      expect.objectContaining({ success: true, id: 7, slug: "mydate/2026" }),
    );

    const update = dataStatement(db, "UPDATE");
    expect(update.binds).toContain("mydate/2026");
    expect(update.binds).not.toContain("mydate");
    expect(update.sql.endsWith("WHERE id = ?")).toBe(true);
    expect(update.binds.at(-1)).toBe(7);
  });

  it("не пропускає адресу, яка не стане діплінком", async () => {
    const db = makeDb();
    const res = await handleUpdate(post("update", { id: 7, slug: "my_date" }), db.env);

    expect(res.status).toBe(400);
    expect(db.statements).toHaveLength(0);
  });

  it("порожня адреса — це головна, а не помилка", async () => {
    const db = makeDb();
    const res = await handleUpdate(post("update", { id: 1, slug: "" }), db.env);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(expect.objectContaining({ id: 1, slug: "" }));
  });

  it("на зайняту адресу відповідає 409 із поясненням, а не 500", async () => {
    const db = makeDb({
      runError: new Error("D1_ERROR: UNIQUE constraint failed: scenarios.slug"),
    });
    const res = await handleUpdate(post("update", { id: 7, slug: "richtest" }), db.env);

    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("richtest");
  });

  it("без полів для запису відповідає 400", async () => {
    const db = makeDb();
    const res = await handleUpdate(post("update", { id: 7 }), db.env);

    expect(res.status).toBe(400);
  });

  it("ігнорує невідомі колонки, а не віддає 500 з SQL", async () => {
    const db = makeDb();
    const res = await handleUpdate(post("update", { id: 7, title: "Нове", id_extra: 1 }), db.env);

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update.sql).not.toContain("id_extra");
    expect(update.binds).toContain("Нове");
  });
});

describe("handleRead / handleDelete", () => {
  it("читає за номером, коли він переданий", async () => {
    const db = makeDb({ row: { id: 7, slug: "mydate" } });
    const res = await handleRead(post("read", { id: 7, slug: "щось-інше" }), db.env);

    expect(res.status).toBe(200);
    const select = dataStatement(db, "SELECT");
    expect(select.sql).toContain("WHERE id = ?");
    expect(select.binds).toEqual([7]);
  });

  it("читає головну сторінку за порожньою адресою", async () => {
    const db = makeDb({ row: { id: 1, slug: "" } });
    const res = await handleRead(post("read", { slug: "" }), db.env);

    expect(res.status).toBe(200);
    const select = dataStatement(db, "SELECT");
    expect(select.sql).toContain("WHERE slug = ?");
    expect(select.binds).toEqual([""]);
  });

  it("без номера й адреси відповідає 400", async () => {
    const db = makeDb();
    const res = await handleRead(post("read", {}), db.env);
    expect(res.status).toBe(400);
  });

  it("видаляє за номером або адресою", async () => {
    const byId = makeDb();
    await handleDelete(post("delete", { id: 7 }), byId.env);
    expect(dataStatement(byId, "DELETE").sql).toContain("WHERE id = ?");
    expect(dataStatement(byId, "DELETE").binds).toEqual([7]);

    const bySlug = makeDb();
    await handleDelete(post("delete", { slug: "mydate" }), bySlug.env);
    expect(dataStatement(bySlug, "DELETE").sql).toContain("WHERE slug = ?");
    expect(dataStatement(bySlug, "DELETE").binds).toEqual(["mydate"]);
  });
});

describe("handleWrite", () => {
  it("лишається UPSERT-ом за адресою — так створюється рядок", async () => {
    const db = makeDb();
    const res = await handleWrite(post("write", { slug: "newpage", title: "newpage" }), db.env);

    expect(res.status).toBe(200);
    // Номер у відповіді відсутній навмисно: у гілці `DO UPDATE` `last_row_id`
    // показав би чужий рядок.
    expect(await res.json()).toEqual({
      success: true,
      slug: "newpage",
      updated_at: expect.any(String),
    });

    const insert = db.statements.find((s) => s.sql.includes("ON CONFLICT(slug) DO UPDATE"));
    expect(insert?.sql).toContain('INSERT INTO "scenarios" (slug, title, updated_at)');
    expect(insert?.binds).toEqual(["newpage", "newpage", expect.any(String)]);
  });

  it("не переписує адресу через SET — вона лише ключ створення", async () => {
    const db = makeDb();
    await handleWrite(post("write", { slug: "mydate", title: "x" }), db.env);
    const sql = db.statements.find((s) => s.sql.includes("ON CONFLICT"))?.sql ?? "";
    expect(sql.match(/slug = excluded\.slug/)).toBeNull();
  });
});
