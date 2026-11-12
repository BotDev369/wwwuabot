/**
 * Адмінська правка: сценарій бота (lookup + kind) і сторінка платформи.
 * Перевіряємо замкнений список полів і відсікання непридатного HTML до бази.
 *
 * @module api-dev/src/controllers/scenarios-admin.controller.test
 */

import { describe, expect, it } from "vitest";
import {
  handleBotScenarioRead,
  handleBotScenarioUpdate,
  handleBotScenariosList,
  handlePlatformPageRead,
  handlePlatformPageUpdate,
  handlePlatformPagesList,
} from "./scenarios-admin.controller";
import type { Env } from "../shared/types";

interface Call {
  sql: string;
  args: unknown[];
}

function makeDb(options: {
  botRow?: Record<string, unknown> | null;
  pageRow?: Record<string, unknown> | null;
  changes?: number;
  runError?: Error;
}) {
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
        all: async () => ({ results: [{ id: 1 }] }),
        first: async () => {
          if (/FROM bot_scenarios WHERE id/.test(sql)) return options.botRow ?? null;
          if (/FROM platform_pages WHERE id/.test(sql)) return options.pageRow ?? null;
          return null;
        },
        run: async () => {
          if (options.runError) throw options.runError;
          return { meta: { changes: options.changes ?? 1 } };
        },
      };
      return stmt;
    },
  } as unknown as D1Database;
  return { env: { DB: db } as Env, calls };
}

function post(body: unknown): Request {
  return new Request("https://api.example.com/api/admin/x", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("сценарії бота", () => {
  it("список віддає ключ і тип", async () => {
    const { env } = makeDb({});
    const res = await handleBotScenariosList(new Request("https://api.example.com"), env);
    const body = (await res.json()) as { ok: boolean; items: unknown[] };

    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
  });

  it("один сценарій читається за номером; без номера — 400", async () => {
    const { env } = makeDb({ botRow: { id: 4, lookup: "/start", kind: "widget" } });
    const res = await handleBotScenarioRead(post({ id: 4 }), env);
    expect(((await res.json()) as { item: { lookup: string } }).item.lookup).toBe("/start");
    expect((await handleBotScenarioRead(post({}), env)).status).toBe(400);

    const missing = makeDb({ botRow: null });
    expect((await handleBotScenarioRead(post({ id: 9 }), missing.env)).status).toBe(404);
  });

  it("пише лише оголошені поля", async () => {
    const { env, calls } = makeDb({ botRow: { id: 4, lookup: "/start" } });
    await handleBotScenarioUpdate(
      post({ id: 4, kind: "widget", widget_html: "<b>ok</b>", lookup: "чуже", nope: 1 }),
      env,
    );

    const update = calls.find((call) => call.sql.startsWith("UPDATE bot_scenarios"));
    expect(update?.sql).toContain("kind = ?");
    expect(update?.sql).toContain("widget_html = ?");
    expect(update?.sql).not.toContain("lookup");
  });

  it("⛔ порожній HTML віджета не доходить до бази", async () => {
    const { env, calls } = makeDb({});
    const res = await handleBotScenarioUpdate(
      post({ id: 4, kind: "widget", widget_html: "  " }),
      env,
    );

    expect(res.status).toBe(400);
    expect(calls.some((call) => call.sql.startsWith("UPDATE"))).toBe(false);
  });

  it("⛔ HTML понад 32768 байт відхиляється", async () => {
    const { env } = makeDb({});
    const res = await handleBotScenarioUpdate(
      post({ id: 4, kind: "rich", rich_html: "я".repeat(20000) }),
      env,
    );
    expect(res.status).toBe(400);
  });

  it("невідомий тип — 400; без полів — 400; без рядка — 404", async () => {
    const { env } = makeDb({});
    expect(
      (await handleBotScenarioUpdate(post({ id: 4, kind: "photo", widget_html: "<b>x</b>" }), env))
        .status,
    ).toBe(400);
    expect((await handleBotScenarioUpdate(post({ id: 4 }), env)).status).toBe(400);

    const missing = makeDb({ changes: 0 });
    expect(
      (
        await handleBotScenarioUpdate(
          post({ id: 4, kind: "rich", rich_html: "<b>x</b>" }),
          missing.env,
        )
      ).status,
    ).toBe(404);
  });
});

describe("сторінки платформи", () => {
  it("список не тягне page_data", async () => {
    const { env, calls } = makeDb({});
    const res = await handlePlatformPagesList(new Request("https://api.example.com"), env);

    expect(((await res.json()) as { items: unknown[] }).items).toHaveLength(1);
    const list = calls.find((call) => call.sql.includes("FROM platform_pages ORDER"));
    expect(list?.sql).not.toContain("page_data");
  });

  it("читання й правка сторінки", async () => {
    const { env } = makeDb({ pageRow: { id: 2, slug: "dateanalysis" } });
    expect((await handlePlatformPageRead(post({ id: 2 }), env)).status).toBe(200);
    expect((await handlePlatformPageRead(post({}), env)).status).toBe(400);

    const res = await handlePlatformPageUpdate(
      post({ id: 2, title: "Нова", page_data: '{"blocks":[]}' }),
      env,
    );
    expect(res.status).toBe(200);
  });

  it("⛔ page_data мусить бути об'єктом", async () => {
    const { env } = makeDb({});
    expect((await handlePlatformPageUpdate(post({ id: 2, page_data: "[]" }), env)).status).toBe(
      400,
    );
  });

  it("зайнята адреса — 409; без рядка — 404", async () => {
    const { env } = makeDb({
      pageRow: null,
      runError: new Error("D1_ERROR: UNIQUE constraint failed: platform_pages.slug"),
    });
    expect((await handlePlatformPageUpdate(post({ id: 2, slug: "x" }), env)).status).toBe(409);

    const missing = makeDb({ changes: 0 });
    expect((await handlePlatformPageUpdate(post({ id: 2, title: "x" }), missing.env)).status).toBe(
      404,
    );
  });
});
