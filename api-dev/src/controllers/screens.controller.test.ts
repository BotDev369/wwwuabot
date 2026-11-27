/**
 * Тексти екрана: читаються з рядка `scenarios`, порожній рядок — не помилка, а
 * ключ зі слешем не доходить до бази.
 *
 * @module api-dev/src/controllers/screens.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { handleScreenTexts } from "./screens.controller";

interface Row {
  page_data: string | null;
}

function fakeD1(row: Row | null, log: string[] = []): D1Database {
  let sql = "";
  const statement = {
    bind: (...args: unknown[]) => {
      log.push(String(args[0]));
      return statement;
    },
    first: async () => (sql.includes("FROM tenants") ? { id: 1 } : row),
    // `ensureTables` питає `PRAGMA table_info` і створює таблицю: порожня
    // відповідь каже «ще немає», тож контролер іде тим самим шляхом, що й на
    // свіжій базі.
    all: async () => ({ results: [] }),
    run: async () => ({ success: true }),
  };
  return {
    prepare: (query: string) => {
      sql = query;
      log.push(sql);
      return statement;
    },
  } as unknown as D1Database;
}

const REQ = new Request("https://api.example.com/api/screens/x");

const envWith = (row: Row | null, log: string[] = []): Env =>
  ({ DB: fakeD1(row, log) }) as unknown as Env;

const pageData = (texts: Record<string, string>): string =>
  JSON.stringify({
    version: 1,
    zones: {
      sidebar: [],
      header: [],
      main: Object.entries(texts).map(([id, content], order) => ({
        id,
        type: "text",
        order,
        props: { content },
      })),
      footer: [],
    },
    visibleZones: [],
  });

const body = async (response: Response): Promise<Record<string, unknown>> =>
  (await response.json()) as Record<string, unknown>;

describe("handleScreenTexts", () => {
  it("віддає тексти рядка за ключем — без сторінки й метаданих", async () => {
    const env = envWith({ page_data: pageData({ "services.title": "Сервіси" }) });

    const response = await handleScreenTexts(
      new Request("https://api.example.com/api/screens/x"),
      env,
      "services",
    );

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({
      ok: true,
      key: "services",
      texts: { "services.title": "Сервіси" },
    });
  });

  it("рядка немає — порожні тексти, а не помилка", async () => {
    const response = await handleScreenTexts(REQ, envWith(null), "services");

    expect(response.status).toBe(200);
    expect(await body(response)).toEqual({ ok: true, key: "services", texts: {} });
  });

  it("бите page_data не ламає відповідь", async () => {
    const response = await handleScreenTexts(REQ, envWith({ page_data: "{" }), "services");

    expect(response.status).toBe(200);
    expect((await body(response)).texts).toEqual({});
  });

  it("ключ зі слешем — 400, і до бази запит не йде", async () => {
    const log: string[] = [];
    const response = await handleScreenTexts(REQ, envWith(null, log), "services/account");

    expect(response.status).toBe(400);
    expect(log).toEqual([]);
  });

  it("падіння бази — 500 без подробиць назовні", async () => {
    const failing = {
      prepare: () => {
        throw new Error("no such table: scenarios");
      },
    } as unknown as D1Database;

    const response = await handleScreenTexts(REQ, { DB: failing } as unknown as Env, "services");

    expect(response.status).toBe(500);
    expect(await body(response)).toEqual({ ok: false, error: "Internal error" });
  });
});
