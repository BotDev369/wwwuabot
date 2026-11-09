/**
 * Вікно платежів: що читається, як згортаються групи й чому порядок рядків —
 * частина контракту (від нього залежить, чи збігаються суми зі старими).
 * @module api-dev/src/services/spending/window.test
 */

import { describe, expect, it } from "vitest";
import {
  bucketTotals,
  distinctCount,
  groupRows,
  loadWindow,
  type SpendingWindowRow,
  topGroups,
  totalsOf,
} from "./window";

const row = (over: Partial<SpendingWindowRow> = {}): SpendingWindowRow => ({
  date: "2026-10-30",
  amount: 100,
  kekv: "2111",
  kpk: "0118240",
  budgetCode: "1051500000",
  payerEdrpou: "04360586",
  payerName: "Рада",
  reciptEdrpou: "39894111",
  reciptName: "ТОВ",
  ...over,
});

function fakeDb(rows: unknown[]): { db: D1Database; sql: string[]; binds: unknown[][] } {
  const sql: string[] = [];
  const binds: unknown[][] = [];
  const db = {
    prepare(text: string) {
      sql.push(text);
      const statement = {
        bind(...args: unknown[]) {
          binds.push(args);
          return statement;
        },
        all: async () => ({ results: rows }),
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, sql, binds };
}

describe("loadWindow", () => {
  it("читає вікно одним запитом і тримає порядок вставки", async () => {
    const { db, sql, binds } = fakeDb([
      {
        trans_date: "2026-10-30",
        amount: 250.5,
        kekv: "2111",
        kpk: "0118240",
        budget_code: "1051500000",
        payer_edrpou: "04360586",
        payer_name: "Рада",
        recipt_edrpou: "39894111",
        recipt_name: "ТОВ",
      },
    ]);

    const rows = await loadWindow(db, "2026-10-01", "2026-10-31");

    expect(sql).toHaveLength(1);
    expect(sql[0]).toMatch(/FROM spending_transactions/);
    expect(sql[0]).toMatch(/ORDER BY rowid/);
    expect(binds[0]).toEqual(["2026-10-01", "2026-10-31"]);
    expect(rows[0]).toEqual({
      date: "2026-10-30",
      amount: 250.5,
      kekv: "2111",
      kpk: "0118240",
      budgetCode: "1051500000",
      payerEdrpou: "04360586",
      payerName: "Рада",
      reciptEdrpou: "39894111",
      reciptName: "ТОВ",
    });
  });
});

describe("згортка", () => {
  it("сума й кількість рахуються по всіх рядках вікна", () => {
    expect(totalsOf([row({ amount: 100 }), row({ amount: 250.5 })])).toEqual({
      count: 2,
      amount: 350.5,
    });
  });

  it("група тримає суму, кількість і `MAX`-підпис", () => {
    const groups = groupRows(
      [
        row({ reciptEdrpou: "1", reciptName: "ТОВ" }),
        row({ reciptEdrpou: "1", reciptName: "Явір" }),
        row({ reciptEdrpou: "2", reciptName: "Ліцей" }),
      ],
      (one) => one.reciptEdrpou,
      (one) => one.reciptName,
    );

    expect(groups.get("1")).toEqual({ count: 2, amount: 200, max: "Явір" });
    expect(groups.get("2")).toEqual({ count: 1, amount: 100, max: "Ліцей" });
  });

  it("топ відрізає за сумою, а на рівних тримає сталий порядок", () => {
    const groups = groupRows(
      [row({ reciptEdrpou: "b", amount: 100 }), row({ reciptEdrpou: "a", amount: 100 })],
      (one) => one.reciptEdrpou,
    );

    expect(topGroups(groups, 1).map((one) => one.key)).toEqual(["a"]);
  });

  it("різні ключі — це `COUNT(DISTINCT)` без другого запиту", () => {
    const rows = [
      row({ reciptEdrpou: "1" }),
      row({ reciptEdrpou: "1" }),
      row({ reciptEdrpou: "" }),
    ];
    expect(distinctCount(rows, (one) => one.reciptEdrpou)).toBe(2);
  });

  it("ряд у часі групує за місяцем або днем", () => {
    const rows = [row({ date: "2026-10-30", amount: 100 }), row({ date: "2026-11-01" })];

    expect([...bucketTotals(rows, "month").values()]).toEqual([
      { key: "2026-10", count: 1, amount: 100 },
      { key: "2026-11", count: 1, amount: 100 },
    ]);
    expect(bucketTotals(rows, "day").get("2026-11-01")).toEqual({
      key: "2026-11-01",
      count: 1,
      amount: 100,
    });
  });
});
