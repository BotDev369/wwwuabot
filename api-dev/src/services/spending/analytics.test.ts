/**
 * Аналітика платежів: що саме повертає розріз і чого в ньому немає.
 *
 * Тест тримає три пастки: порожній код — це рядок розрізу, а не «немає
 * даних»; вікно рахується від останньої дати в базі; дні й місяці без
 * платежів лишаються нулями, бо пропуск читався б як розрив збору.
 *
 * @module api-dev/src/services/spending/analytics.test
 */

import { describe, expect, it } from "vitest";
import { dataRange, readCodes, readRecipients } from "./analytics";

interface Captured {
  sql: string;
  binds: unknown[];
}

/** D1 у мініатюрі: відповідь залежить від SQL, а не від порядку виклику. */
function fakeDb(handler: (sql: string) => { rows?: unknown[]; row?: unknown }): {
  db: D1Database;
  statements: Captured[];
} {
  const statements: Captured[] = [];
  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind(...args: unknown[]) {
          record.binds = args;
          return statement;
        },
        first: async () => handler(sql).row ?? null,
        all: async () => ({ results: handler(sql).rows ?? [] }),
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, statements };
}

const RANGE = "FROM spending_transactions";

describe("dataRange", () => {
  it("бере межі з бази, а не з годинника", async () => {
    const { db } = fakeDb(() => ({ row: { first_date: "2026-09-01", last_date: "2026-10-30" } }));
    expect(await dataRange(db)).toEqual({ from: "2026-09-01", to: "2026-10-30" });
  });

  it("порожня таблиця — `null`, а не дата сьогодні", async () => {
    const { db } = fakeDb(() => ({ row: { first_date: null, last_date: null } }));
    expect(await dataRange(db)).toBeNull();
  });

  it("не позичає в псевдоніма ключове слово SQL — інакше D1 валить запит", async () => {
    // `AS from` — синтаксична помилка D1, а не порожній результат: саме через це
    // розріз за отримувачами віддавав 500, хоч локальний фейк мовчав.
    const { db, statements } = fakeDb(() => ({ row: null }));
    await dataRange(db);
    expect(statements[0]?.sql).not.toMatch(/\bAS\s+(from|to|where|group|order)\b/i);
  });
});

describe("readCodes", () => {
  it("три класифікації читаються окремо, порожній код лишається рядком", async () => {
    const { db } = fakeDb((sql) => {
      if (sql.includes("COUNT(DISTINCT")) return { row: { count: 3, amount: 600 } };
      if (sql.includes("kekv")) {
        return {
          rows: [
            { code: "2111", count: 2, amount: 500 },
            { code: "", count: 1, amount: 100 },
          ],
        };
      }
      if (sql.includes("kpk")) return { rows: [{ code: "0118240", count: 3, amount: 600 }] };
      return { rows: [{ code: "1051500000", count: 3, amount: 600 }] };
    });

    const codes = await readCodes(db, "2026-10");
    expect(codes.period).toBe("2026-10");
    expect(codes.from).toBe("2026-10-01");
    expect(codes.to).toBe("2026-10-31");
    expect(codes.kekv).toEqual([
      { code: "2111", count: 2, amount: 500 },
      { code: "", count: 1, amount: 100 },
    ]);
    expect(codes.kpk).toHaveLength(1);
    expect(codes.budget[0]?.code).toBe("1051500000");
  });

  it("без періоду база не читається взагалі", async () => {
    const { db, statements } = fakeDb(() => ({}));
    const codes = await readCodes(db, null);
    expect(statements).toHaveLength(0);
    expect(codes).toMatchObject({ period: null, totals: { count: 0, amount: 0 }, kekv: [] });
  });
});

describe("readRecipients", () => {
  it("місяць — це дні календаря, а не лише дні з платежами", async () => {
    const { db } = fakeDb((sql) => {
      if (sql.includes("MIN(trans_date)")) {
        return { row: { first_date: "2026-09-01", last_date: "2026-10-30" } };
      }
      if (sql.includes("COUNT(DISTINCT recipt_edrpou)")) {
        return { row: { count: 2, amount: 300, recipients: 1 } };
      }
      if (sql.includes("GROUP BY trans_date")) {
        return { rows: [{ key: "2026-10-30", count: 2, amount: 300 }] };
      }
      return { rows: [{ edrpou: "39894111", name: "ТОВ", count: 2, amount: 300 }] };
    });

    const view = await readRecipients(db, "month");
    expect(view.from).toBe("2026-10-01");
    expect(view.to).toBe("2026-10-31");
    expect(view.bucket).toBe("day");
    expect(view.buckets).toHaveLength(31);
    expect(view.buckets[29]).toEqual({ key: "2026-10-30", count: 2, amount: 300 });
    expect(view.buckets[0]).toEqual({ key: "2026-10-01", count: 0, amount: 0 });
    expect(view.rows[0]).toEqual({ edrpou: "39894111", name: "ТОВ", count: 2, amount: 300 });
  });

  it("рік — дванадцять місяців назад від останньої дати, з нулями", async () => {
    const { db } = fakeDb((sql) => {
      if (sql.includes("MIN(trans_date)")) {
        return { row: { first_date: "2025-01-05", last_date: "2026-10-30" } };
      }
      if (sql.includes("COUNT(DISTINCT recipt_edrpou)")) {
        return { row: { count: 5, amount: 500, recipients: 2 } };
      }
      if (sql.includes("substr(trans_date, 1, 7)")) {
        return { rows: [{ key: "2026-10", count: 5, amount: 500 }] };
      }
      return { rows: [] };
    });

    const view = await readRecipients(db, "year");
    expect(view.from).toBe("2025-11-01");
    expect(view.to).toBe("2026-10-30");
    expect(view.bucket).toBe("month");
    expect(view.buckets).toHaveLength(12);
    expect(view.buckets[0]).toEqual({ key: "2025-11", count: 0, amount: 0 });
    expect(view.buckets[11]).toEqual({ key: "2026-10", count: 5, amount: 500 });
  });

  it("«останній день» — одна дата, і вона ж кінець вікна", async () => {
    const { db } = fakeDb((sql) => {
      if (sql.includes("MIN(trans_date)")) {
        return { row: { first_date: "2026-09-01", last_date: "2026-10-30" } };
      }
      if (sql.includes("COUNT(DISTINCT recipt_edrpou)")) {
        return { row: { count: 1, amount: 50, recipients: 1 } };
      }
      if (sql.includes("GROUP BY trans_date")) {
        return { rows: [{ key: "2026-10-30", count: 1, amount: 50 }] };
      }
      return { rows: [] };
    });

    const view = await readRecipients(db, "day");
    expect(view).toMatchObject({ from: "2026-10-30", to: "2026-10-30", bucket: "day" });
    expect(view.buckets).toEqual([{ key: "2026-10-30", count: 1, amount: 50 }]);
  });

  it("порожня база — нулі й жодного запиту по діапазону", async () => {
    const { db, statements } = fakeDb(() => ({ row: { first_date: null, last_date: null } }));
    const view = await readRecipients(db, "all");
    expect(statements).toHaveLength(1);
    expect(statements[0]?.sql).toContain(RANGE);
    expect(view).toMatchObject({ from: null, totals: { count: 0, amount: 0, recipients: 0 } });
    expect(view.buckets).toEqual([]);
  });
});
