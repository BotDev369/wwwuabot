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
import type { Env } from "../../shared/types";
import { readCodes, readRecipients } from "./analytics";

interface Captured {
  sql: string;
  binds: unknown[];
}

/** Рядок платежу в тому вигляді, у якому його віддає D1. */
function windowRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    trans_date: "2026-10-30",
    amount: 100,
    kekv: "2111",
    kpk: "0118240",
    budget_code: "1051500000",
    payer_edrpou: "04360586",
    payer_name: "Бучанська рада",
    recipt_edrpou: "39894111",
    recipt_name: "ТОВ",
    ...over,
  };
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

/** Env без KV: межі тоді сканує сам розріз — саме це й перевіряють тести. */
const envOf = (db: D1Database): Env => ({ DB: db }) as unknown as Env;

describe("readCodes", () => {
  it("три класифікації — з одного проходу, порожній код лишається рядком", async () => {
    const { db, statements } = fakeDb(() => ({
      rows: [
        windowRow({ kekv: "2111", amount: 300 }),
        windowRow({ kekv: "2111", amount: 200 }),
        windowRow({ kekv: "", amount: 100 }),
      ],
    }));

    const codes = await readCodes(db, "2026-10");

    expect(codes.period).toBe("2026-10");
    expect(codes.from).toBe("2026-10-01");
    expect(codes.to).toBe("2026-10-31");
    expect(codes.kekv).toEqual([
      { code: "2111", count: 2, amount: 500 },
      { code: "", count: 1, amount: 100 },
    ]);
    expect(codes.totals).toEqual({ count: 3, amount: 600 });
    expect(codes.kpk).toEqual([{ code: "0118240", count: 3, amount: 600 }]);
    expect(codes.budget[0]?.code).toBe("1051500000");

    // Один запит на весь розріз: раніше їх було чотири, і кожен читав таблицю.
    expect(statements).toHaveLength(1);
    expect(statements[0]?.sql).toMatch(/ORDER BY rowid/);
    expect(statements[0]?.binds).toEqual(["2026-10-01", "2026-10-31"]);
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
    const { db } = fakeDb((sql) =>
      sql.includes("MIN(trans_date)")
        ? { row: { first_date: "2026-09-01", last_date: "2026-10-30" } }
        : {
            rows: [
              windowRow({ trans_date: "2026-10-30", amount: 200 }),
              windowRow({ trans_date: "2026-10-30", amount: 100 }),
              windowRow({
                trans_date: "2026-10-30",
                amount: 50,
                recipt_edrpou: "",
                recipt_name: "",
              }),
            ],
          },
    );

    const view = await readRecipients(envOf(db), "month");
    expect(view.from).toBe("2026-10-01");
    expect(view.to).toBe("2026-10-31");
    expect(view.bucket).toBe("day");
    expect(view.buckets).toHaveLength(31);
    expect(view.buckets[29]).toEqual({ key: "2026-10-30", count: 3, amount: 350 });
    expect(view.buckets[0]).toEqual({ key: "2026-10-01", count: 0, amount: 0 });
    expect(view.totals).toEqual({ count: 3, amount: 350, recipients: 2 });
    // Порожній ЄДРПОУ в топ не потрапляє, хоч у підсумок вікна входить.
    expect(view.rows).toEqual([{ edrpou: "39894111", name: "ТОВ", count: 2, amount: 300 }]);
  });

  it("рік — дванадцять місяців назад від останньої дати, з нулями", async () => {
    const { db } = fakeDb((sql) =>
      sql.includes("MIN(trans_date)")
        ? { row: { first_date: "2025-01-05", last_date: "2026-10-30" } }
        : { rows: [windowRow({ trans_date: "2026-10-30", amount: 500 })] },
    );

    const view = await readRecipients(envOf(db), "year");
    expect(view.from).toBe("2025-11-01");
    expect(view.to).toBe("2026-10-30");
    expect(view.bucket).toBe("month");
    expect(view.buckets).toHaveLength(12);
    expect(view.buckets[0]).toEqual({ key: "2025-11", count: 0, amount: 0 });
    expect(view.buckets[11]).toEqual({ key: "2026-10", count: 1, amount: 500 });
  });

  it("«останній день» — одна дата, і вона ж кінець вікна", async () => {
    const { db } = fakeDb((sql) =>
      sql.includes("MIN(trans_date)")
        ? { row: { first_date: "2026-09-01", last_date: "2026-10-30" } }
        : { rows: [windowRow({ trans_date: "2026-10-30", amount: 50 })] },
    );

    const view = await readRecipients(envOf(db), "day");
    expect(view).toMatchObject({ from: "2026-10-30", to: "2026-10-30", bucket: "day" });
    expect(view.buckets).toEqual([{ key: "2026-10-30", count: 1, amount: 50 }]);
  });

  it("порожня база — нулі й жодного запиту по діапазону", async () => {
    const { db, statements } = fakeDb(() => ({ row: { first_date: null, last_date: null } }));
    const view = await readRecipients(envOf(db), "all");
    expect(statements).toHaveLength(1);
    expect(statements[0]?.sql).toContain(RANGE);
    expect(view).toMatchObject({ from: null, totals: { count: 0, amount: 0, recipients: 0 } });
    expect(view.buckets).toEqual([]);
  });
});
