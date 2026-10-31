/**
 * Читання зібраного Є-data: що саме панель бачить у базі.
 *
 * Тести тримають три пастки домену, а не форму відповіді: сум `payments` і
 * `receipts` у «всього громади» немає, «не оприлюднено» — це порожній рядок, а
 * не нуль, а курсор пагінації будується лише на повній сторінці. Кожна з них
 * мовчки показує неправду на екрані, тож нехай падає тут.
 *
 * @module api-dev/src/services/spending/read.test
 */

import { describe, expect, it } from "vitest";
import { encodeCursor } from "@wwwuabot/shared/spending";
import {
  latestPeriod,
  readDocuments,
  readLastLoad,
  readOrgs,
  readSyncRows,
  readTransactions,
} from "./read";

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

describe("період", () => {
  it("бере останній, за яким справді є завершений крок", async () => {
    const { db, statements } = fakeDb(() => ({ row: { period: "2026-09" } }));

    expect(await latestPeriod(db)).toBe("2026-09");
    expect(statements[0].sql).toMatch(/status = 'ok'/);
  });

  it("порожня база — `null`, а не вигаданий місяць", async () => {
    const { db } = fakeDb(() => ({}));

    expect(await latestPeriod(db)).toBeNull();
  });
});

describe("стан збору", () => {
  it("віддає рядок у формі контракту", async () => {
    const { db } = fakeDb(() => ({ rows: [syncRow] }));

    expect(await readSyncRows(db, "2026-09")).toEqual([
      {
        key: "payments:2026-09",
        kind: "payments",
        period: "2026-09",
        status: "ok",
        rows: 649,
        startedAt: "2026-10-01T05:37:00.000Z",
        finishedAt: "2026-10-01T05:38:00.000Z",
        error: "",
      },
    ]);
  });

  it("невідомий статус читається як `running`, а не як «готово»", async () => {
    const { db } = fakeDb(() => ({ rows: [{ ...syncRow, status: "щось" }] }));

    const [row] = await readSyncRows(db);

    expect(row.status).toBe("running");
  });
});

describe("картки розпорядників", () => {
  const rowsFor = (sql: string): unknown[] => {
    if (sql.includes("FROM spending_orgs")) {
      return [
        { edrpou: "04360586", name: "Бучанська міська рада", form: "Орган", koatuu: "3210800000" },
        { edrpou: "43907812", name: "Ліцей", form: "Комунальна", koatuu: "3210800000" },
      ];
    }
    if (sql.includes("FROM spending_documents")) {
      return [{ edrpou: "04360586", count: 29, amount: 1500.5 }];
    }
    if (sql.includes("payer_edrpou AS edrpou")) {
      return [{ edrpou: "04360586", count: 649, amount: 90000 }];
    }
    return [{ edrpou: "04360586", count: 3, amount: 250 }];
  };

  it("зливає три суми за ЄДРПОУ, а порожній зріз лишає нулем", async () => {
    const { db } = fakeDb((sql) => ({ rows: rowsFor(sql) }));

    const orgs = await readOrgs(db, "2026-09");

    expect(orgs[0]).toMatchObject({
      edrpou: "04360586",
      documents: { count: 29, amount: 1500.5 },
      payments: { count: 649, amount: 90000 },
      receipts: { count: 3, amount: 250 },
    });
    expect(orgs[1]).toMatchObject({
      name: "Ліцей",
      documents: { count: 0, amount: 0 },
      payments: { count: 0, amount: 0 },
    });
  });

  it("питає базу про місяць, а не про весь час", async () => {
    const { db, statements } = fakeDb((sql) => ({ rows: rowsFor(sql) }));

    await readOrgs(db, "2026-09");

    const documents = statements.find((s) => s.sql.includes("FROM spending_documents"));
    expect(documents?.binds).toEqual(["2026-09-01", "2026-09-30"]);
  });
});

describe("договори", () => {
  const row = {
    id: "doc-1",
    edrpou: "04360586",
    kind: "Договір",
    number: "12",
    document_date: "2026-09-10",
    sign_date: "2026-09-11",
    amount: 1500.5,
    currency: "UAH",
    subject: "Паливо",
    cpv: "09130000-9",
    contractors: JSON.stringify([{ identifier: "HIDDEN", name: "ТОВ", kind: 1 }]),
  };

  it("віддає пару «дата + id» як курсор, коли сторінка повна", async () => {
    const { db } = fakeDb(() => ({ rows: [row] }));

    const page = await readDocuments(db, {
      edrpou: "04360586",
      period: null,
      limit: 1,
      cursor: null,
    });

    expect(page.nextCursor).toBe(encodeCursor("2026-09-10", "doc-1"));
    expect(page.items[0].contractors).toEqual([{ identifier: "HIDDEN", name: "ТОВ", kind: 1 }]);
  });

  it("коротка сторінка курсора не дає: далі нічого немає", async () => {
    const { db } = fakeDb(() => ({ rows: [row] }));

    const page = await readDocuments(db, {
      edrpou: "04360586",
      period: null,
      limit: 50,
      cursor: null,
    });

    expect(page.nextCursor).toBeNull();
  });

  it("битий JSON контрагентів не валить список", async () => {
    const { db } = fakeDb(() => ({ rows: [{ ...row, contractors: "{не json" }] }));

    const page = await readDocuments(db, {
      edrpou: "04360586",
      period: null,
      limit: 50,
      cursor: null,
    });

    expect(page.items[0].contractors).toEqual([]);
  });

  it("курсор стає умовою запиту, а не номером сторінки", async () => {
    const { db, statements } = fakeDb(() => ({ rows: [] }));

    await readDocuments(db, {
      edrpou: "04360586",
      period: "2026-09",
      limit: 50,
      cursor: { date: "2026-09-10", id: "doc-1" },
    });

    const select = statements[0];
    expect(select.sql).toMatch(/document_date < \?/);
    expect(select.binds).toEqual([
      "04360586",
      "2026-09-01",
      "2026-09-30",
      "2026-09-10",
      "2026-09-10",
      "doc-1",
      50,
    ]);
  });
});

describe("платежі", () => {
  const row = {
    id: "pay-1",
    payer_edrpou: "04360586",
    payer_name: "Бучанська міська рада",
    recipt_edrpou: "43907812",
    recipt_name: "Ліцей",
    trans_date: "2026-09-12",
    amount: 250,
    currency: "UAH",
    payment_details: "Оплата",
    kekv: "2210",
    kpk: "",
    budget_code: "",
    contract_id: "",
    contract_number: "",
    source_name: "Є-data",
  };

  it("сторона платежу — колонка запиту, а не фільтр у пам'яті", async () => {
    const { db, statements } = fakeDb(() => ({ rows: [] }));

    await readTransactions(db, {
      edrpou: "43907812",
      role: "recipt",
      period: null,
      limit: 10,
      cursor: null,
    });

    expect(statements[0].sql).toMatch(/recipt_edrpou = \?/);
    expect(statements[0].sql).not.toMatch(/payer_edrpou = \?/);
  });

  it("платник і отримувач лишаються різними полями рядка", async () => {
    const { db } = fakeDb(() => ({ rows: [row] }));

    const page = await readTransactions(db, {
      edrpou: "04360586",
      role: "payer",
      period: null,
      limit: 50,
      cursor: null,
    });

    expect(page.items[0]).toMatchObject({
      payerEdrpou: "04360586",
      reciptEdrpou: "43907812",
      amount: 250,
    });
  });
});

describe("довідка джерела", () => {
  it("без KV довідки немає — це не помилка", async () => {
    expect(await readLastLoad(undefined)).toBeNull();
  });

  it("повертає сиру відповідь, не тлумачачи чужого формату", async () => {
    const kv = {
      get: async () => ({ fetchedAt: "2026-10-01T05:00:00.000Z", payload: { organizations: [] } }),
    } as unknown as KVNamespace;

    expect(await readLastLoad(kv)).toEqual({
      fetchedAt: "2026-10-01T05:00:00.000Z",
      raw: { organizations: [] },
    });
  });
});
