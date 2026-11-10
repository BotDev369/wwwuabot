/**
 * Прогін колектора на підставних сховищах: порядок кроків, курсор і звіт.
 *
 * Перевіряється те, чого не видно з модульних тестів: що сирий архів лягає
 * раніше за рядки, що свіжий прогін нічого не пише, що обрізану відповідь
 * добираємо вужчими вікнами, а збій одного розпорядника не зупиняє решту.
 * @module api-dev/src/services/spending/collect.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types";

const ensureTablesMock = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@wwwuabot/shared/database/ensure-tables", () => ({ ensureTables: ensureTablesMock }));

const { runSpendingCollection } = await import("./collect");
const { REGIONS_SYNC_KEY, batchKey, receiptsKey } = await import("./config");

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
        sql,
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
            return settled.has(String(args[0]))
              ? { status: "ok", finished_at: new Date().toISOString() }
              : null;
          }
          if (sql.includes("FROM spending_orgs")) return null;
          return { count: 1, amount: 500 };
        },
      };
      return statement;
    },
    /** Пачка не пише, але SQL кожного твердження лишає в тому самому списку. */
    batch: async (list: { sql: string }[]) => {
      for (const item of list) statements.push(item.sql);
      return [];
    },
  };
  return { db: db as unknown as D1Database, settled, statements };
}

function fakeKv(): { kv: KVNamespace; written: string[] } {
  const written: string[] = [];
  const kv = {
    get: async () => null,
    put: async (key: string) => {
      written.push(key);
    },
    delete: async () => {},
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

/** Підпис пачки в назві архіву — той самий, що в ключі кроку. */
const batchSignature = batchKey(PERIOD, [ORG]).split(":").at(-1) ?? "";
const REGIONS = [{ regionCode: 10, regionName: "Київська обл", koatuu: "3200000000" }];

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
        if (url.includes("/regions")) return json(REGIONS);
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
      receipts: 1,
      failed: [],
      stopped: null,
    });
    expect(report.archivedBytes).toBeGreaterThan(0);
    expect(keys).toEqual([
      `spending/contracts/${ORG}/${PERIOD}.json.gz`,
      `spending/transactions/${PERIOD}/${batchSignature}.json.gz`,
      `spending/recipts/${PERIOD}/${batchSignature}.json.gz`,
    ]);
    expect(written).toContain(`spending:org:${ORG}:v1`);
    expect(written.some((key) => key.includes("lastload"))).toBe(true);
  });

  it("свіжий повторний прогін того самого місяця нічого не пише", async () => {
    const { db, settled } = fakeDb();
    const { kv } = fakeKv();
    const { bucket, keys } = fakeBucket();
    settled
      .add(`org:${ORG}:${PERIOD}`)
      .add(batchKey(PERIOD, [ORG]))
      .add(receiptsKey(PERIOD, [ORG]))
      .add(REGIONS_SYNC_KEY);
    const fetchMock = vi.fn(async () => json({ lastload: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: [ORG],
    });

    expect(report).toMatchObject({ documents: 0, transactions: 0, receipts: 0, archivedBytes: 0 });
    expect(report.skipped).toHaveLength(3);
    expect(keys).toEqual([]);
    // Єдиний дозволений запит — дата останнього завантаження.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("обрізані джерелом договори добирає двома вужчими вікнами", async () => {
    const { db } = fakeDb();
    const { kv } = fakeKv();
    const { bucket, keys } = fakeBucket();
    const ranges: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/disposers/contracts")) {
          const from = /documentDateFrom=([\d-]+)/.exec(url)?.[1] ?? "";
          const to = /documentDateTo=([\d-]+)/.exec(url)?.[1] ?? "";
          ranges.push(`${from}..${to}`);
          // Перше вікно (весь місяць) обрізане, кожне з половин — повне.
          const truncated = from === "2026-09-01" && to === "2026-09-30";
          return json(
            truncated
              ? { documents: [CONTRACTS.documents[0]], count: 1200, moreThenCount: true }
              : { documents: [CONTRACTS.documents[0]], count: 1 },
          );
        }
        if (url.includes("/regions")) return json(REGIONS);
        if (url.includes("/api/transactions/lastload")) return json({ lastload: 1 });
        if (url.includes("/api/transactions/")) return json(TRANSACTIONS);
        return json(DISPOSER);
      }),
    );

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: [ORG],
    });

    expect(ranges[0]).toBe("2026-09-01..2026-09-30");
    expect(ranges).toHaveLength(3);
    expect(report.documents).toBe(2);
    expect(keys).toContain(`spending/contracts/${ORG}/${PERIOD}.2026-09-01_2026-09-15.json.gz`);
    expect(keys).toContain(`spending/contracts/${ORG}/${PERIOD}.2026-09-16_2026-09-30.json.gz`);
  });

  it("збій розпорядника лишає причину при кроці, а прогін іде далі", async () => {
    const { db, statements } = fakeDb();
    const { kv } = fakeKv();
    const { bucket } = fakeBucket();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("/disposers/contracts")) return new Response("", { status: 404 });
        if (url.includes("/regions")) return json(REGIONS);
        if (url.includes("/api/transactions/lastload")) return json({ lastload: 1 });
        if (url.includes("/api/transactions/")) return json({ errorMessage: "не масив" });
        return json(DISPOSER);
      }),
    );

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: [ORG],
    });

    expect(report.failed).toHaveLength(3);
    expect(report.documents).toBe(0);
    expect(statements.some((sql) => sql.includes("ON CONFLICT(key)"))).toBe(true);
  });

  it("три збої поспіль зупиняють прогін, щоб не дзвонити в мертве джерело", async () => {
    const { db } = fakeDb();
    const { kv } = fakeKv();
    const { bucket } = fakeBucket();
    const fetchMock = vi.fn(async () => new Response("", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const report = await runSpendingCollection(envWith({ db, kv, bucket }), {
      period: PERIOD,
      orgs: ["1", "2", "3", "4", "5"],
    });

    expect(report.failed).toHaveLength(3);
    expect(report.stopped).toContain("збої поспіль");
    // Три збої договорів плюс невдалий довідник областей — і жодного зайвого.
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("бере надходження окремим запитом і пише обидва довідники", async () => {
    const { db, statements } = fakeDb();
    const { kv } = fakeKv();
    const { bucket } = fakeBucket();
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        if (url.includes("/disposers/contracts")) return json(CONTRACTS);
        if (url.includes("/regions")) return json(REGIONS);
        if (url.includes("/api/transactions/lastload")) return json({ lastload: 1 });
        if (url.includes("/api/transactions/")) return json(TRANSACTIONS);
        return json(DISPOSER);
      }),
    );

    await runSpendingCollection(envWith({ db, kv, bucket }), { period: PERIOD, orgs: [ORG] });

    expect(urls.some((url) => url.includes("payers_edrpous=04360586"))).toBe(true);
    expect(urls.some((url) => url.includes("recipt_edrpous=04360586"))).toBe(true);
    expect(statements.some((sql) => sql.includes("INSERT INTO spending_regions"))).toBe(true);
    expect(statements.some((sql) => sql.includes("INSERT INTO spending_counterparties"))).toBe(
      true,
    );
  });

  it("без биндингу архіву прогін не вдає, що все гаразд", async () => {
    const { db } = fakeDb();
    const { kv } = fakeKv();

    await expect(
      runSpendingCollection(envWith({ db, kv }), { period: PERIOD, orgs: [ORG] }),
    ).rejects.toThrow("SPENDING_SNAPSHOTS");
  });
});
