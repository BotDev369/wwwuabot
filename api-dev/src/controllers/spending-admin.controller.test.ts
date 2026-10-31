/**
 * Є-data в адмінці: те, що бачить власник, і те, що він не може зробити.
 *
 * Головне тут — не форма відповіді, а дві межі: некерований ввід (період,
 * ЄДРПОУ, роль, курсор) відсікається до запиту в базу, а відповідь із
 * приватними даними не кешується ніде. Обидві межі легко втратити під час
 * правки, і жодна не видна на екрані: перша дає 500 замість 400, друга —
 * рядок у кеші провайдера.
 *
 * @module api-dev/src/controllers/spending-admin.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import {
  handleSpendingDocuments,
  handleSpendingOverview,
  handleSpendingSync,
  handleSpendingTransactions,
} from "./spending-admin.controller";

interface Captured {
  sql: string;
  binds: unknown[];
}

interface FakeOptions {
  /** Відповідь `first()`; `undefined` — рядка немає. */
  row?: (sql: string) => unknown;
  /** Відповідь `all()`; `undefined` — порожній список. */
  rows?: (sql: string) => unknown[] | undefined;
  fail?: boolean;
}

function makeEnv(options: FakeOptions = {}): { env: Env; statements: Captured[] } {
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
        first: async () => {
          if (options.fail) throw new Error("D1 недоступна");
          return options.row?.(sql) ?? null;
        },
        all: async () => {
          if (options.fail) throw new Error("D1 недоступна");
          if (/^PRAGMA/i.test(sql)) return { results: [] };
          return { results: options.rows?.(sql) ?? [] };
        },
        run: async () => {
          if (options.fail) throw new Error("D1 недоступна");
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
  const kv = {
    get: async () => ({ fetchedAt: "2026-10-01T05:00:00.000Z", payload: { ok: true } }),
  };
  return {
    env: { DB: db, CONTENT_KV: kv } as unknown as Env,
    statements,
  };
}

const url = (path: string): Request => new Request(`https://api.test${path}`, { method: "GET" });

const syncRow = {
  key: "payments:2026-09",
  kind: "payments",
  period: "2026-09",
  status: "ok",
  rows: 649,
  started_at: "2026-10-01T05:37:00.000Z",
  finished_at: "2026-10-01T05:38:00.000Z",
  error: "",
};

describe("огляд", () => {
  it("⛔ без жодного прогону каже «не збирали», а не показує нулі", async () => {
    const { env } = makeEnv();

    const res = await handleSpendingOverview(url("/api/admin/spending/overview"), env);
    const body = (await res.json()) as {
      period: unknown;
      from: unknown;
      capturedAt: unknown;
      orgs: unknown[];
      lastLoad: unknown;
    };

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ period: null, from: null, capturedAt: null, orgs: [] });
    expect(body.lastLoad).not.toBeNull();
  });

  it("збирає період, межі місяця, розпорядників і час збору", async () => {
    const { env } = makeEnv({
      row: () => ({ period: "2026-09" }),
      rows: (sql) => {
        if (sql.includes("FROM spending_sync")) return [syncRow];
        if (sql.includes("FROM spending_orgs")) {
          return [{ edrpou: "04360586", name: "Бучанська міська рада", form: "Орган", koatuu: "" }];
        }
        if (sql.includes("FROM spending_documents")) {
          return [{ edrpou: "04360586", count: 29, amount: 1500 }];
        }
        return [{ edrpou: "04360586", count: 649, amount: 90000 }];
      },
    });

    const res = await handleSpendingOverview(url("/api/admin/spending/overview"), env);
    const body = (await res.json()) as {
      period: string;
      from: string;
      to: string;
      capturedAt: string;
      orgs: { edrpou: string; documents: { count: number }; payments: { count: number } }[];
      sync: unknown[];
    };

    expect(body).toMatchObject({ period: "2026-09", from: "2026-09-01", to: "2026-09-30" });
    expect(body.capturedAt).toBe("2026-10-01T05:38:00.000Z");
    expect(body.orgs[0].documents.count).toBe(29);
    expect(body.orgs[0].payments.count).toBe(649);
    expect(body.sync).toHaveLength(1);
  });

  it("⛔ приватні дані не кешуються", async () => {
    const { env } = makeEnv();

    const res = await handleSpendingOverview(url("/api/admin/spending/overview"), env);

    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("⛔ кривий період — 400 до будь-якого читання", async () => {
    const { env, statements } = makeEnv({ row: () => ({ period: "2026-09" }) });

    const res = await handleSpendingOverview(
      url("/api/admin/spending/overview?period=2026-13"),
      env,
    );

    expect(res.status).toBe(400);
    expect(statements.some((s) => s.sql.includes("FROM spending_sync"))).toBe(false);
  });

  it("⛔ збій бази — 500 із тією самою забороною кешу", async () => {
    const { env } = makeEnv({ fail: true });

    const res = await handleSpendingOverview(url("/api/admin/spending/overview"), env);

    expect(res.status).toBe(500);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ error: "Не вдалось прочитати зібрані дані" });
  });
});

describe("стан збору", () => {
  it("віддає рядки й довідку джерела навіть тоді, коли даних за період немає", async () => {
    const { env } = makeEnv({
      row: () => ({ period: "2026-09" }),
      rows: () => [syncRow],
    });

    const res = await handleSpendingSync(url("/api/admin/spending/sync"), env);
    const body = (await res.json()) as { period: string; rows: unknown[]; lastLoad: unknown };

    expect(body.period).toBe("2026-09");
    expect(body.rows).toHaveLength(1);
    expect(body.lastLoad).not.toBeNull();
  });
});

describe("договори", () => {
  it("⛔ без ЄДРПОУ не читає всеньку таблицю", async () => {
    const { env, statements } = makeEnv();

    const res = await handleSpendingDocuments(url("/api/admin/spending/documents"), env);

    expect(res.status).toBe(400);
    expect(statements.some((s) => s.sql.includes("FROM spending_documents"))).toBe(false);
  });

  it("⛔ зіпсований курсор — 400, а не тихо перша сторінка", async () => {
    const { env } = makeEnv();

    const res = await handleSpendingDocuments(
      url("/api/admin/spending/documents?edrpou=04360586&cursor=без-роздільника"),
      env,
    );

    expect(res.status).toBe(400);
  });

  it("віддає сторінку й курсор далі", async () => {
    const { env } = makeEnv({
      rows: () => [
        {
          id: "doc-1",
          edrpou: "04360586",
          kind: "Договір",
          number: "12",
          document_date: "2026-09-10",
          sign_date: "2026-09-11",
          amount: 1500,
          currency: "UAH",
          subject: "Паливо",
          cpv: "09130000-9",
          contractors: "[]",
        },
      ],
    });

    const res = await handleSpendingDocuments(
      url("/api/admin/spending/documents?edrpou=04360586&period=2026-09&limit=1"),
      env,
    );
    const body = (await res.json()) as { items: unknown[]; nextCursor: string | null };

    expect(body.items).toHaveLength(1);
    expect(body.nextCursor).toBe("2026-09-10|doc-1");
  });

  it("⛔ ліміт не переростає стелю", async () => {
    const { env, statements } = makeEnv();

    await handleSpendingDocuments(
      url("/api/admin/spending/documents?edrpou=04360586&limit=100000"),
      env,
    );

    const select = statements.find((s) => s.sql.includes("FROM spending_documents"));
    expect(select?.binds.at(-1)).toBe(200);
  });
});

describe("платежі", () => {
  it("⛔ третя роль не існує: стороні платежу бути однією", async () => {
    const { env, statements } = makeEnv();

    const res = await handleSpendingTransactions(
      url("/api/admin/spending/transactions?edrpou=04360586&role=any"),
      env,
    );

    expect(res.status).toBe(400);
    expect(statements.some((s) => s.sql.includes("FROM spending_transactions"))).toBe(false);
  });

  it("усталена роль — платник", async () => {
    const { env, statements } = makeEnv();

    await handleSpendingTransactions(url("/api/admin/spending/transactions?edrpou=04360586"), env);

    const select = statements.find((s) => s.sql.includes("FROM spending_transactions"));
    expect(select?.sql).toMatch(/payer_edrpou = \?/);
  });

  it("надходження читаються стороною отримувача", async () => {
    const { env, statements } = makeEnv();

    await handleSpendingTransactions(
      url("/api/admin/spending/transactions?edrpou=43907812&role=recipt"),
      env,
    );

    const select = statements.find((s) => s.sql.includes("FROM spending_transactions"));
    expect(select?.sql).toMatch(/recipt_edrpou = \?/);
  });
});
