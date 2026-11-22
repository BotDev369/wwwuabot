/**
 * Сторінка переписки з ботом: 6 останніх, курсор за номером рядка, чесна
 * порожнеча без таблиці.
 *
 * D1 тут мінімальна: контролер робить один `SELECT`, і саме його SQL із
 * параметрами й перевіряється — цей SQL і є курсором.
 */

import { describe, expect, it } from "vitest";
import { handleUserMessages, USER_MESSAGES_PAGE_SIZE } from "./bot-messages.controller";
import type { Env } from "../shared/types";

interface Row {
  id: number;
  direction: string;
  message_id: number | null;
  kind: string;
  text: string;
  meta: string | null;
  created_at: string | null;
  edited_at: string | null;
  deleted_at: string | null;
}

function row(id: number): Row {
  return {
    id,
    direction: id % 2 === 0 ? "out" : "in",
    message_id: 100 + id,
    kind: "text",
    text: `msg-${id}`,
    meta: null,
    created_at: "2026-11-22 10:00:00",
    edited_at: null,
    deleted_at: null,
  };
}

/** Запити, які контролер справді зробив: SQL і зв'язані значення. */
function stubDb(result: { rows?: Row[]; error?: Error } = {}) {
  const queries: { sql: string; values: unknown[] }[] = [];
  let current = { sql: "", values: [] as unknown[] };

  const db = {
    prepare(sql: string) {
      current = { sql, values: [] };
      queries.push(current);
      const statement = {
        bind(...values: unknown[]) {
          current.values = values;
          return statement;
        },
        async all() {
          if (result.error) throw result.error;
          return { results: result.rows ?? [] };
        },
        async run() {
          return { success: true };
        },
      };
      return statement;
    },
  };

  return { env: { DB: db } as unknown as Env, queries };
}

function request(query = ""): Request {
  return new Request(`https://example.com/api/admin/users/7/messages${query}`);
}

describe("handleUserMessages", () => {
  it("віддає шість останніх у хронологічному порядку й курсор на старші", async () => {
    // Сім рядків — це «є ще»: контролер бере `limit + 1` і ріже до шести.
    const { env } = stubDb({ rows: [40, 39, 38, 37, 36, 35, 34].map(row) });

    const res = await handleUserMessages(request(), env, 7);
    const body = (await res.json()) as {
      ok: boolean;
      messages: Row[];
      hasMore: boolean;
      nextBefore: number | null;
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.messages).toHaveLength(USER_MESSAGES_PAGE_SIZE);
    expect(body.messages.map((message) => message.id)).toEqual([35, 36, 37, 38, 39, 40]);
    expect(body.hasMore).toBe(true);
    expect(body.nextBefore).toBe(35);
  });

  it("друга порція читає старші за курсором, а не ті самі", async () => {
    const { env, queries } = stubDb({ rows: [34, 33, 32].map(row) });

    const res = await handleUserMessages(request("?before=35"), env, 7);
    const body = (await res.json()) as {
      messages: Row[];
      hasMore: boolean;
      nextBefore: number | null;
    };

    expect(queries[0].sql).toContain("id < ?");
    expect(queries[0].values).toEqual([7, 35, USER_MESSAGES_PAGE_SIZE + 1]);
    expect(body.messages.map((message) => message.id)).toEqual([32, 33, 34]);
    expect(body.hasMore).toBe(false);
    expect(body.nextBefore).toBeNull();
  });

  it("кривий курсор — 400, а не порожня сторінка", async () => {
    const { env, queries } = stubDb();
    const res = await handleUserMessages(request("?before=abc"), env, 7);
    expect(res.status).toBe(400);
    expect(queries).toHaveLength(0);
  });

  it("без таблиці віддає порожню переписку, а не помилку", async () => {
    const { env } = stubDb({ error: new Error("D1_ERROR: no such table: bot_messages") });
    const res = await handleUserMessages(request(), env, 7);
    const body = (await res.json()) as { ok: boolean; messages: Row[]; hasMore: boolean };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.messages).toEqual([]);
    expect(body.hasMore).toBe(false);
  });

  it("запит обмежений людиною зі шляху", async () => {
    const { env, queries } = stubDb({ rows: [] });
    await handleUserMessages(request(), env, 42);
    expect(queries[0].values[0]).toBe(42);
    expect(queries[0].sql).toContain("WHERE user_id = ?");
  });
});
