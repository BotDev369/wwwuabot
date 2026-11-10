/**
 * Межі дат: кеш у KV проти скану таблиці.
 *
 * Тест тримає дві межі: гарячий шлях не ходить у D1, а пошкоджене або старе
 * значення не стає даними — воно або перечитується, або прибирається синком.
 *
 * @module api-dev/src/services/spending/range.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../../shared/types";
import { DATA_RANGE_KEY } from "./config";
import { readRange, refreshRange } from "./range";

function fakeDb(row: unknown): { db: D1Database; statements: string[] } {
  const statements: string[] = [];
  const db = {
    prepare(sql: string) {
      statements.push(sql);
      const statement = {
        bind() {
          return statement;
        },
        first: async () => row,
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, statements };
}

function fakeKv(initial?: unknown): {
  kv: KVNamespace;
  calls: string[];
  store: Map<string, unknown>;
} {
  const calls: string[] = [];
  const store = new Map<string, unknown>();
  if (initial !== undefined) store.set(DATA_RANGE_KEY, initial);
  const kv = {
    get: async (key: string) => {
      calls.push(`get:${key}`);
      return store.get(key) ?? null;
    },
    put: async (key: string, value: string) => {
      calls.push(`put:${key}`);
      store.set(key, JSON.parse(value));
    },
    delete: async (key: string) => {
      calls.push(`delete:${key}`);
      store.delete(key);
    },
  };
  return { kv: kv as unknown as KVNamespace, calls, store };
}

const envOf = (db: D1Database, kv?: KVNamespace): Env =>
  ({ DB: db, CONTENT_KV: kv }) as unknown as Env;

describe("readRange", () => {
  it("влучання в KV — жодного запиту в D1", async () => {
    const { db, statements } = fakeDb(null);
    const { kv } = fakeKv({ from: "2026-09-01", to: "2026-10-30" });

    expect(await readRange(envOf(db, kv))).toEqual({ from: "2026-09-01", to: "2026-10-30" });
    expect(statements).toHaveLength(0);
  });

  it("промах — один скан і запис у KV", async () => {
    const { db, statements } = fakeDb({ first_date: "2026-09-01", last_date: "2026-10-30" });
    const { kv, calls } = fakeKv();

    expect(await readRange(envOf(db, kv))).toEqual({ from: "2026-09-01", to: "2026-10-30" });
    expect(statements).toHaveLength(1);
    expect(calls).toContain(`put:${DATA_RANGE_KEY}`);
  });

  it("зіпсоване значення — промах, а не дані", async () => {
    const { db } = fakeDb({ first_date: "2026-09-01", last_date: "2026-10-30" });
    const { kv } = fakeKv({ from: "не дата", to: "2026-10-30" });

    expect(await readRange(envOf(db, kv))).toEqual({ from: "2026-09-01", to: "2026-10-30" });
  });

  it("порожня таблиця — `null` і без запису", async () => {
    const { db } = fakeDb({ first_date: null, last_date: null });
    const { kv, calls } = fakeKv();

    expect(await readRange(envOf(db, kv))).toBeNull();
    expect(calls.some((call) => call.startsWith("put:"))).toBe(false);
  });

  it("межі шукаються двома скалярними підзапитами — спільний MIN/MAX сканує таблицю", async () => {
    // Один `MIN(...), MAX(...)` SQLite не вміє стрибнути в обидва кінці індексу:
    // він читає всі 1 789 рядків навіть з індексом по `trans_date`.
    const { db, statements } = fakeDb({ first_date: "2026-09-01", last_date: "2026-10-30" });

    await readRange(envOf(db));

    expect(statements[0]).toMatch(/\(SELECT MIN\(trans_date\)/);
    expect(statements[0]).toMatch(/\(SELECT MAX\(trans_date\)/);
  });

  it("не позичає в псевдоніма ключове слово SQL — інакше D1 валить запит", async () => {
    // `AS from` — синтаксична помилка D1, а не порожній результат: саме через це
    // розріз за отримувачами віддавав 500, хоч локальний фейк мовчав.
    const { db, statements } = fakeDb(null);
    await readRange(envOf(db));
    expect(statements[0]).not.toMatch(/\bAS\s+(from|to|where|group|order)\b/i);
  });
});

describe("refreshRange", () => {
  it("перезаписує межі після синку", async () => {
    const { db } = fakeDb({ first_date: "2026-08-01", last_date: "2026-11-09" });
    const { kv, store } = fakeKv({ from: "2026-09-01", to: "2026-10-30" });

    await refreshRange(envOf(db, kv));

    expect(store.get(DATA_RANGE_KEY)).toEqual({ from: "2026-08-01", to: "2026-11-09" });
  });

  it("порожня таблиця прибирає ключ", async () => {
    const { db } = fakeDb({ first_date: null, last_date: null });
    const { kv, calls } = fakeKv({ from: "2026-09-01", to: "2026-10-30" });

    await refreshRange(envOf(db, kv));

    expect(calls).toContain(`delete:${DATA_RANGE_KEY}`);
  });
});
