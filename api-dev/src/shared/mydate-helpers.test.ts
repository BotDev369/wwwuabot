/**
 * Розрахунок і кеш аналізу дати.
 *
 * **Кеш — це два шари, і обидва мають бути живіми.** KV швидший, D1 — надійний:
 * тому «немає в KV» не означає «немає результату», а поламаний JSON не має
 * відповідати помилкою замість порожнього аналізу.
 *
 * Д1 — фейковий: перевіряється логіка шару й кешу, а не сервер SQLite.
 *
 * @module api-dev/src/shared/mydate-helpers.test
 */

import { describe, expect, it } from "vitest";
import { calculateWesternAstrology, getAnalysis, saveAnalysis } from "./mydate-helpers";

interface Captured {
  sql: string;
  binds: unknown[];
}

function makeD1(row: { systems_data?: string } | null = null): {
  db: D1Database;
  statements: Captured[];
} {
  const statements: Captured[] = [];
  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => (/SELECT systems_data/.test(sql) ? row : null),
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { db: db as unknown as D1Database, statements };
}

function makeKv(seed: Record<string, string> = {}): {
  kv: KVNamespace;
  store: Map<string, string>;
} {
  const store = new Map(Object.entries(seed));
  const kv = {
    get: async (key: string) => store.get(key) ?? null,
    put: async (key: string, value: string) => {
      store.set(key, value);
    },
  } as unknown as KVNamespace;
  return { kv, store };
}

describe("розрахунок western", () => {
  it("знак Сонця береться з дати, а не з порядку викликів", () => {
    expect(calculateWesternAstrology(21, 3).parameters?.[0]).toEqual({
      key: "sunSign",
      label: "Знак Сонця",
      value: "Овен",
    });
    expect(calculateWesternAstrology(23, 7).parameters?.[0].value).toBe("Лев");
  });

  // `SIGN_CUTOFFS` — межі знаків; без сортування перший збіг віддав би не той
  // знак, тож тест тримає саме межу, а не один «середній» випадок.
  it("межі знаків не з'їжджаються на стиках", () => {
    expect(calculateWesternAstrology(18, 2).parameters?.[0].value).toBe("Водолій");
    expect(calculateWesternAstrology(20, 3).parameters?.[0].value).toBe("Риби");
    expect(calculateWesternAstrology(21, 3).parameters?.[0].value).toBe("Овен");
  });

  it("результат має усі параметри й список ще не реалізованих планет", () => {
    const result = calculateWesternAstrology(15, 6);
    const keys = result.parameters?.map((p) => p.key);

    expect(keys).toContain("element");
    expect(keys).toContain("cusp");
    expect(result.comingSoon).toContain("Місяць");
  });
});

describe("читання аналізу", () => {
  it("кеш у KV віддається без читання D1", async () => {
    const { db, statements } = makeD1();
    const { kv, store } = makeKv({ "mydate:analysis:1980-03-03": '{"western":{"a":1}}' });

    expect(await getAnalysis(db, kv, "1980-03-03")).toEqual({ western: { a: 1 } });
    expect(statements.some((s) => /SELECT systems_data/.test(s.sql))).toBe(false);
    expect(store.size).toBe(1);
  });

  it("немає в KV — читаємо D1 і заповнюємо кеш", async () => {
    const { db } = makeD1({ systems_data: '{"western":{"b":2}}' });
    const { kv, store } = makeKv();

    expect(await getAnalysis(db, kv, "1980-03-03")).toEqual({ western: { b: 2 } });
    expect(store.get("mydate:analysis:1980-03-03")).toBe('{"western":{"b":2}}');
  });

  // Поламане значення не має відповідати помилкою: людині краще порожній
  // аналіз, ніж `500` посередині сторінки.
  it("поламаний JSON у D1 — це порожній аналіз, а не помилка", async () => {
    const { db } = makeD1({ systems_data: "{це не json" });
    const { kv } = makeKv();

    expect(await getAnalysis(db, kv, "1980-03-03")).toEqual({});
  });

  it("поламаний JSON у KV не зупиняє читання D1", async () => {
    const { db } = makeD1({ systems_data: '{"western":{"c":3}}' });
    const { kv, store } = makeKv({ "mydate:analysis:1980-03-03": "{обрізаний" });

    expect(await getAnalysis(db, kv, "1980-03-03")).toEqual({ western: { c: 3 } });
    expect(store.get("mydate:analysis:1980-03-03")).toBe('{"western":{"c":3}}');
  });

  it("дати без аналізу немає — це порожній об'єкт, а не `null`", async () => {
    const { db } = makeD1(null);
    const { kv } = makeKv();

    expect(await getAnalysis(db, kv, "1990-01-01")).toEqual({});
  });
});

describe("збереження аналізу", () => {
  it("дописує систему, не затираючи попередні", async () => {
    const { db, statements } = makeD1({ systems_data: '{"western":{"d":4}}' });
    const { kv } = makeKv();
    const result = { parameters: [{ key: "sunSign", value: "Лев" }] };

    const saved = await saveAnalysis(db, kv, "1980-03-03", "vedic", result);

    expect(Object.keys(saved)).toEqual(["western", "vedic"]);
    const upsert = statements.find((s) => /INSERT INTO mydate_analysis/.test(s.sql));
    expect(upsert?.binds[0]).toBe("1980-03-03");
  });

  it("повторний запис тієї самої системи не плодить ключі", async () => {
    const { db } = makeD1({ systems_data: '{"western":{"e":5}}' });
    const { kv } = makeKv();

    const saved = await saveAnalysis(db, kv, "1980-03-03", "western", { x: 1 });
    const again = await saveAnalysis(db, kv, "1980-03-03", "western", { x: 2 });

    expect(Object.keys(saved)).toEqual(["western"]);
    expect(again).toEqual({ western: { x: 2 } });
  });
});
