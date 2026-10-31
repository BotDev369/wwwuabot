/**
 * Запис у три сховища: D1, R2 і картки.
 *
 * Перевіряється те, що ламається тихо: пачка більша за стелю D1, дубль рядка
 * при повторному прогоні, порожня картка замість чесного нуля.
 *
 * @module api-dev/src/services/spending/store.test
 */

import { describe, expect, it, vi } from "vitest";
import {
  SPENDING_TABLES,
  archiveRaw,
  buildOrgCard,
  ensureSpendingTables,
  isSettled,
  markSync,
  upsertDocuments,
  upsertOrgs,
  upsertTransactions,
} from "./store";
import type { DocumentRow, OrgRow, TransactionRow } from "./normalize";

const ensureTablesMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@wwwuabot/shared/database/ensure-tables", () => ({ ensureTables: ensureTablesMock }));

interface Call {
  sql: string;
  args: unknown[];
}

/** D1, який запам'ятовує твердження й віддає наперед задані рядки. */
function fakeDb(answer: (sql: string) => unknown = () => null) {
  const runs: Call[] = [];
  const batches: number[] = [];
  const sqls: string[] = [];
  const bound: unknown[][] = [];
  const db = {
    prepare(sql: string) {
      sqls.push(sql);
      const call: Call = { sql, args: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          call.args = args;
          bound.push(args);
          return statement;
        },
        run: async () => {
          runs.push(call);
          return { success: true };
        },
        first: async () => answer(sql),
      };
      return statement;
    },
    batch: async (statements: unknown[]) => {
      batches.push(statements.length);
      return [];
    },
  };
  return { db: db as unknown as D1Database, runs, batches, sqls, bound };
}

const ORG: OrgRow = {
  edrpou: "04360586",
  name: "Бучанська міська рада",
  form: "Орган місцевого самоврядування",
  kopfg: "1",
  koatuu: "3210800000",
  kved: "84.11",
};

const DOC: DocumentRow = {
  id: "d-1",
  edrpou: "04360586",
  kind: "contract",
  number: "12",
  documentDate: "2026-09-03",
  signDate: "2026-09-04",
  amount: 1000,
  currency: "UAH",
  subject: "Паливо",
  cpv: "09130000-9",
  contractors: "[]",
};

const TX: TransactionRow = {
  id: "t-1",
  payerEdrpou: "04360586",
  payerName: "Бучанська міська рада",
  reciptEdrpou: "33699425",
  reciptName: "Бучабудзамовник",
  transDate: "2026-09-10",
  amount: 500,
  currency: "UAH",
  paymentDetails: "Оплата робіт",
  kekv: "2210",
  kpk: "1011",
  budgetCode: "1",
  contractId: "d-1",
  contractNumber: "12",
  sourceName: "Є-data",
};

describe("схема й курсор", () => {
  it("створює рівно таблиці цього домену", async () => {
    const { db } = fakeDb();
    await ensureSpendingTables(db);

    expect(ensureTablesMock).toHaveBeenCalledWith(db, SPENDING_TABLES);
    expect(SPENDING_TABLES).toHaveLength(4);
  });

  it("зібраний період упізнається як `ok`, незібраний — ні", async () => {
    expect(await isSettled(fakeDb(() => ({ status: "ok" })).db, "k")).toBe(true);
    expect(await isSettled(fakeDb(() => ({ status: "error" })).db, "k")).toBe(false);
    expect(await isSettled(fakeDb(() => null).db, "k")).toBe(false);
  });

  it("`running` не ставить дату завершення, а `ok` — ставить", async () => {
    const running = fakeDb();
    await markSync(running.db, {
      key: "k",
      kind: "contracts",
      period: "2026-09",
      status: "running",
    });
    expect(running.runs[0].args.at(-2)).toBeNull();

    const okRun = fakeDb();
    await markSync(okRun.db, {
      key: "k",
      kind: "contracts",
      period: "2026-09",
      status: "ok",
      rows: 3,
    });
    expect(okRun.runs[0].args.at(-2)).toEqual(expect.any(String));
    expect(okRun.runs[0].args.at(-1)).toBe("");
  });

  it("помилка лишається при рядку — причина видна без логів", async () => {
    const { db, runs } = fakeDb();
    await markSync(db, {
      key: "k",
      kind: "contracts",
      period: "2026-09",
      status: "error",
      error: "503",
    });

    expect(runs[0].sql).toContain("ON CONFLICT(key) DO UPDATE");
    expect(runs[0].args.at(-1)).toBe("503");
  });
});

describe("рядки", () => {
  it("пише кожен рядок через `ON CONFLICT`, а не третім стовпцем", async () => {
    const { db, sqls, bound, batches } = fakeDb();
    await upsertOrgs(db, [ORG]);
    await upsertDocuments(db, [DOC]);
    await upsertTransactions(db, [TX]);

    expect(batches).toEqual([1, 1, 1]);
    expect(sqls[0]).toContain("ON CONFLICT(edrpou)");
    expect(sqls[1]).toContain("ON CONFLICT(id)");
    expect(bound[2].slice(0, 3)).toEqual(["t-1", "04360586", "Бучанська міська рада"]);
  });

  it("ріже пачку по 50: більша D1 рве по таймауту", async () => {
    const { db, batches } = fakeDb();
    await upsertTransactions(
      db,
      Array.from({ length: 60 }, (_, i) => ({ ...TX, id: `t-${i}` })),
    );

    expect(batches).toEqual([50, 10]);
  });
});

describe("архів і картка", () => {
  it("gzip у R2 повертає розмір і справді стискає", async () => {
    const put = vi.fn(async () => ({}) as unknown as R2Object);
    const bytes = await archiveRaw(
      { put } as unknown as R2Bucket,
      "spending/contracts/04360586/2026-09.json.gz",
      { documents: Array.from({ length: 40 }, () => ({ id: "x", subject: "Паливо" })) },
    );

    expect(put).toHaveBeenCalledTimes(1);
    expect(bytes).toBeGreaterThan(0);
    const [, body] = put.mock.calls[0] as unknown as [string, Uint8Array];
    expect(Array.from(body.slice(0, 2))).toEqual([0x1f, 0x8b]);
  });

  it("картка складає суми за період, а порожній розпорядник дає нулі", async () => {
    const withOrg = fakeDb((sql) =>
      sql.includes("FROM spending_orgs")
        ? { name: ORG.name, form: ORG.form, koatuu: ORG.koatuu }
        : { count: 2, amount: 1500 },
    );
    const card = await buildOrgCard(withOrg.db, ORG.edrpou, {
      period: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
    });

    expect(card.name).toBe(ORG.name);
    expect(card.documents).toEqual({ count: 2, amount: 1500 });
    expect(card.payments).toEqual({ count: 2, amount: 1500 });
    expect(card.receipts).toEqual({ count: 2, amount: 1500 });
    expect(card.period).toBe("2026-09");

    const empty = await buildOrgCard(fakeDb(() => null).db, "00000000", {
      period: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(empty).toMatchObject({ name: "", documents: { count: 0, amount: 0 } });
  });
});
