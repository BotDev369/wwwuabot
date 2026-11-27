/**
 * Адмінка й проєкти: контент читається й заводиться в тому проєкті, який названо
 * в `?tenant=`, а не завжди в головному.
 *
 * Це та ланка, без якої другий проєкт неможливо наповнити: інакше панель писала б
 * у `main`, і бот у `p_<key>` показував би порожнечу.
 *
 * @module api-dev/src/controllers/scenarios-admin.tenant.test
 */

import { describe, expect, it } from "vitest";
import { handleBotScenarioCreate, handleBotScenariosList } from "./scenarios-admin.controller";
import type { Env } from "../shared/types";

const MAIN = { id: 1, key: "main", name: "Головний", status: "active" };
const SHOP = { id: 2, key: "shop-a", name: "Магазин", status: "active" };
const TENANTS = [MAIN, SHOP];
const COLUMNS = [
  "id",
  "tenant_id",
  "lookup",
  "kind",
  "widget_html",
  "widget_data",
  "rich_html",
  "notify_groups",
  "notify_template",
  "is_active",
  "created_at",
  "updated_at",
];

interface Call {
  sql: string;
  args: unknown[];
}

function makeDb() {
  const calls: Call[] = [];
  const db = {
    prepare(sql: string) {
      const call: Call = { sql, args: [] };
      calls.push(call);
      const stmt = {
        bind(...args: unknown[]) {
          call.args = args;
          return stmt;
        },
        all: async () => ({
          results: /PRAGMA/i.test(sql) ? COLUMNS.map((name) => ({ name })) : [],
        }),
        first: async () => {
          if (/FROM tenants WHERE key/.test(sql)) {
            return TENANTS.find((tenant) => tenant.key === call.args[0]) ?? null;
          }
          if (/FROM tenants WHERE id/.test(sql)) {
            return TENANTS.find((tenant) => tenant.id === call.args[0]) ?? null;
          }
          if (/FROM bot_scenarios/.test(sql)) {
            return { id: 9, lookup: call.args[1], kind: "widget", is_active: 1 };
          }
          return null;
        },
        run: async () => ({ meta: { changes: 1 } }),
      };
      return stmt;
    },
  } as unknown as D1Database;
  return { env: { DB: db } as unknown as Env, calls };
}

const HTML = "<b>Привіт із проєкту</b>";

describe("контент проєкту в адмінці", () => {
  it("список читає проєкт із `?tenant=`", async () => {
    const { env, calls } = makeDb();

    const res = await handleBotScenariosList(
      new Request("https://api.example.com/api/admin/bot-scenarios?tenant=shop-a"),
      env,
    );

    expect(res.status).toBe(200);
    const list = calls.find((call) => /FROM bot_scenarios/.test(call.sql));
    expect(list?.args[0]).toBe(SHOP.id);
  });

  it("невідомий проєкт — 404, а не тихий головний", async () => {
    const { env, calls } = makeDb();

    const res = await handleBotScenariosList(
      new Request("https://api.example.com/api/admin/bot-scenarios?tenant=nope"),
      env,
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "tenant_not_found" });
    expect(calls.some((call) => /FROM bot_scenarios/.test(call.sql))).toBe(false);
  });

  it("новий екран заводиться в названому проєкті", async () => {
    const { env, calls } = makeDb();

    const res = await handleBotScenarioCreate(
      new Request("https://api.example.com/api/admin/bot-scenarios/create?tenant=shop-a", {
        method: "POST",
        body: JSON.stringify({ lookup: "/start", kind: "widget", widget_html: HTML }),
      }),
      env,
    );

    expect(res.status).toBe(201);
    const insert = calls.find((call) => /INSERT (OR IGNORE )?INTO bot_scenarios/.test(call.sql));
    expect(insert?.args.slice(0, 3)).toEqual([SHOP.id, "/start", "widget"]);
    expect(insert?.args).toContain(HTML);
  });

  it("той самий ключ у проєкті не створюється двічі", async () => {
    const { env } = makeDb();
    const db = env.DB as unknown as {
      prepare: (sql: string) => { bind: (...args: unknown[]) => { run: () => Promise<unknown> } };
    };
    const original = db.prepare;
    db.prepare = (sql: string) => {
      const stmt = original.call(db, sql);
      if (!/INSERT (OR IGNORE )?INTO bot_scenarios/.test(sql)) return stmt;
      return { bind: () => ({ run: async () => ({ meta: { changes: 0 } }) }) };
    };

    const res = await handleBotScenarioCreate(
      new Request("https://api.example.com/api/admin/bot-scenarios/create?tenant=shop-a", {
        method: "POST",
        body: JSON.stringify({ lookup: "/start", kind: "widget", widget_html: HTML }),
      }),
      env,
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ error: "lookup_taken" });
  });
});
