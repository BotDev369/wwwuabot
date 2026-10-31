/**
 * Прогін колектора на підставних сховищах: порядок кроків, курсор і звіт.
 *
 * Перевіряється те, чого не видно з модульних тестів: що сирий архів лягає
 * раніше за рядки, що повторний прогін нічого не пише, а збій одного
 * розпорядника не зупиняє решту.
 *
 * @module api-dev/src/services/spending/collect.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types";

const ensureTablesMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@wwwuabot/shared/database/ensure-tables", () => ({ ensureTables: ensureTablesMock }));

const { runSpendingCollection } = await import("./collect");

const PERIOD = "2026-09";
const ORG = "04360586";

const DISPOSER = { edrpou: ORG, orgName: "Бучанська міська рада", orgForm: "Рада", kopfg: "1" };
const CONTRACTS = {
  documents: [
    {
      id: "d-1",
      edrpou: ORG,
      documentNumber: "12",
      documentDate: "2026-09-03",
      amount: 1000,
      currency: "UAH",
      subject: "Паливо",
      procurementItems: [{ cpvCode: "09130000-9", nameUa: "Паливо" }],
      contractors: [{ identifier: "HIDDEN", name: "ФОП", contractorType: 1 }],
    },
  ],
};
const TRANSACTIONS = [
  {
    id: "t-1",
    payer_edrpou: ORG,
    payer_name: "Бучанська міська рада",
    recipt_edrpou: "33699425",
    trans_date: "2026-09-10",
    amount: 500,
    payment_details: "Оплата робіт",
  },
];

/** D1, який тримає курсор у пам'яті й віддає нулі на запити картки. */
function fakeDb(): { db: D1Database; settled: Set<string>; statements: string[] } {
  const settled = new Set<string>();
  const statements: string[] = [];
  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const statement = {
        bind: (...next: unknown[]) => {
          args = next;
          return statement;
        },
        run: async () => {
          statements.push(sql);
          const [key, , , status] = args;
          if (typeof key === "string" && status === "ok") settled.add(key);
          if (typeof key === "string" && status === "running") settled.delete(key);
          return { success: true };
        },
        first: async () => {
          if (sql.includes("FROM spending_sync")) {
            return settled.has(String(args[0])) ? { status: "ok" } : null;
          }
          if (sql.includes("FROM spending_orgs")) return null;
          return { count: 1, amount: 500 };
        },
      };
      return statement;
    },
    batch: async () => [],
  };
  return { db: db as unknown as D1Database, settled, statements };
}

function fakeKv(): { kv: KVNamespace; written: string[] } {
  const written: string[] = [];
  const kv = {
    put: async (key: string) => {
      written.push(key);
    },
  };
  return { kv: kv as unknown as KVNamespace, written };
}

function fakeBucket(): { bucket: R2Bucket; keys: string[] } {
  const keys: string[] = [];
  const bucket = {
    put: async (key: string) => {
      keys.push(key);
      return {};
    },
  };
  return { bucket: bucket as unknown as R2Bucket, keys };
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

function envWith(parts: { db: D1Database; kv: KVNamespace; bucket?: R2Bucket }): Env {
  return { DB: parts.db, CONTENT_KV: parts.kv, SPENDING_SNAPSHOTS: parts.bucket } as unknown as Env;
}

beforeEach(() => {
  vi.spyOn(globalThis, "setTimeout");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("прогін за місяць", () => {
  it("архівує сире, пише рядки й картки, звітує цифрами", async () => {
    const { db } = fakeDb();
    const { kv, written } = fakeKv();
    const { bucket, keys } = fakeBucket();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/disposers/contracts")) return json(CONTRACTS);
        if (url.includes("/api/transactions/lastload")) return json({ lastload: 1 });
        if (url.includes("/api/transactions/")) return json(TRANSACTIONS);
        return json(DISPOSER);
      }),
    );

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: [ORG],
    });

    expect(report).toMatchObject({
      period: PERIOD,
      orgs: 1,
      documents: 1,
      transactions: 1,
      failed: [],
    });
    expect(report.archivedBytes).toBeGreaterThan(0);
    expect(keys).toEqual([
      `spending/contracts/${ORG}/${PERIOD}.json.gz`,
      `spending/transactions/${PERIOD}/batch-1.json.gz`,
    ]);
    expect(written).toContain(`spending:org:${ORG}:v1`);
    expect(written.some((key) => key.includes("lastload"))).toBe(true);
  });

  it("повторний прогін того самого місяця нічого не пише", async () => {
    const { db, settled } = fakeDb();
    const { kv } = fakeKv();
    const { bucket, keys } = fakeBucket();
    settled.add(`org:${ORG}:${PERIOD}`).add(`transactions:${PERIOD}:batch-1`);
    const fetchMock = vi.fn(async () => json({ lastload: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: [ORG],
    });

    expect(report).toMatchObject({ documents: 0, transactions: 0, archivedBytes: 0 });
    expect(report.skipped).toHaveLength(2);
    expect(keys).toEqual([]);
    // Єдиний дозволений запит — дата останнього завантаження.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("збій розпорядника лишає причину при кроці, а прогін іде далі", async () => {
    const { db, statements } = fakeDb();
    const { kv } = fakeKv();
    const { bucket } = fakeBucket();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/disposers/contracts")) return new Response("", { status: 404 });
        if (url.includes("/api/transactions/lastload")) return json({ lastload: 1 });
        if (url.includes("/api/transactions/")) return json({ errorMessage: "не масив" });
        return json(DISPOSER);
      }),
    );

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: [ORG],
    });

    expect(report.failed).toHaveLength(2);
    expect(report.documents).toBe(0);
    expect(statements.some((sql) => sql.includes("ON CONFLICT(key)"))).toBe(true);
  });

  it("без біндингу архіву прогін не вдає, що все гаразд", async () => {
    const { db } = fakeDb();
    const { kv } = fakeKv();

    await expect(
      runSpendingCollection(envWith({ db, kv }), { period: PERIOD, orgs: [ORG] }),
    ).rejects.toThrow("SPENDING_SNAPSHOTS");
  });
});
