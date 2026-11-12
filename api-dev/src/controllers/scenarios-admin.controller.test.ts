/**
 * Адмінська правка двох таблиць: що читається, що пишеться й що відхиляється
 * до бази. Головне — замкнений список колонок і перевірка JSON: зламаний
 * `buttons` чи `page_data` не має доходити до D1.
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
        all: async () => {
          if (/FROM bot_scenarios b/.test(sql)) {
            return {
              results: [
                {
                  id: 1,
                  slug: "",
                  bot_command: "/start",
                  title: "WWWUABot",
                  keyboard_type: "static",
                  is_active: 1,
                  updated_at: "2026-11-12 00:00:00",
                },
              ],
            };
          }
          if (/FROM platform_pages ORDER/.test(sql)) {
            return {
              results: [
                {
                  id: 2,
                  slug: "dateanalysis",
                  title: "Аналіз дат",
                  template_key: null,
                  is_public: 0,
                  owner_id: null,
                  updated_at: "2026-11-12 00:00:00",
                },
              ],
            };
          }
          return { results: [] };
        },
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
  const env = { DB: db } as Env;
  return { env, calls };
}

function post(body: unknown): Request {
  return new Request("https://api.example.com/api/admin/x", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("списки", () => {
  it("екрани бота приходять із JOIN-ом за назвою сторінки", async () => {
    const { env } = makeDb({});
    const res = await handleBotScenariosList(new Request("https://api.example.com"), env);
    const body = (await res.json()) as { ok: boolean; items: unknown[] };

    expect(body.ok).toBe(true);
    expect(body.items).toHaveLength(1);
  });

  it("сторінки платформи не тягнуть page_data у список", async () => {
    const { env, calls } = makeDb({});
    const res = await handlePlatformPagesList(new Request("https://api.example.com"), env);
    const body = (await res.json()) as { items: unknown[] };

    expect(body.items).toHaveLength(1);
    const list = calls.find((call) => call.sql.includes("FROM platform_pages ORDER"));
    expect(list?.sql).toContain("SELECT id, slug");
    expect(list?.sql).not.toContain("page_data");
  });
});

describe("один рядок", () => {
  it("екран бота читається за номером", async () => {
    const { env } = makeDb({ botRow: { id: 1, slug: "", bot_command: "/start" } });
    const res = await handleBotScenarioRead(post({ id: 1 }), env);
    const body = (await res.json()) as { ok: boolean; item: { id: number } };

    expect(body.ok).toBe(true);
    expect(body.item.id).toBe(1);
  });

  it("немає номера — 400, немає рядка — 404", async () => {
    const { env } = makeDb({});
    expect((await handleBotScenarioRead(post({}), env)).status).toBe(400);
    expect((await handlePlatformPageRead(post({ id: 9 }), env)).status).toBe(404);
    expect((await handleBotScenarioRead(post({ id: 9 }), env)).status).toBe(404);
  });
});

describe("правка екрана бота", () => {
  it("пише лише оголошені поля й повертає рядок", async () => {
    const { env, calls } = makeDb({ botRow: { id: 3, bot_command: "/start" } });
    const res = await handleBotScenarioUpdate(
      post({ id: 3, caption_top: "Привіт", is_active: false, slug: "чуже", nope: 1 }),
      env,
    );

    const update = calls.find((call) => call.sql.startsWith("UPDATE bot_scenarios"));
    expect(update?.sql).toContain("caption_top = ?");
    expect(update?.sql).toContain("is_active = ?");
    expect(update?.sql).not.toContain("slug");
    expect(update?.args).toEqual(["Привіт", 0, expect.any(String), 3]);
    expect(res.status).toBe(200);
  });

  it("⛔ зламаний JSON кнопок не доходить до бази", async () => {
    const { env, calls } = makeDb({});
    const res = await handleBotScenarioUpdate(post({ id: 3, buttons: "{не json" }), env);

    expect(res.status).toBe(400);
    expect(calls.some((call) => call.sql.startsWith("UPDATE"))).toBe(false);
  });

  it("⛔ rich_data мусить бути масивом", async () => {
    const { env } = makeDb({});
    const res = await handleBotScenarioUpdate(post({ id: 3, rich_data: '{"a":1}' }), env);
    expect(res.status).toBe(400);
  });

  it("без полів — 400, без рядка — 404", async () => {
    const { env } = makeDb({});
    expect((await handleBotScenarioUpdate(post({ id: 3 }), env)).status).toBe(400);

    const missing = makeDb({ changes: 0 });
    expect(
      (await handleBotScenarioUpdate(post({ id: 3, caption_top: "x" }), missing.env)).status,
    ).toBe(404);
  });
});

describe("правка сторінки платформи", () => {
  it("зберігає сторінку й повертає її", async () => {
    const { env, calls } = makeDb({ pageRow: { id: 2, slug: "dateanalysis" } });
    const res = await handlePlatformPageUpdate(
      post({ id: 2, title: "Нова", is_public: true, page_data: '{"blocks":[]}' }),
      env,
    );

    expect(res.status).toBe(200);
    expect(calls.some((call) => call.sql.startsWith("UPDATE platform_pages"))).toBe(true);
  });

  it("⛔ page_data мусить бути об'єктом", async () => {
    const { env } = makeDb({});
    const res = await handlePlatformPageUpdate(post({ id: 2, page_data: "[]" }), env);
    expect(res.status).toBe(400);
  });

  it("зайнята адреса — 409 із поясненням", async () => {
    const { env } = makeDb({
      pageRow: null,
      runError: new Error("D1_ERROR: UNIQUE constraint failed: platform_pages.slug"),
    });
    const res = await handlePlatformPageUpdate(post({ id: 2, slug: "зайнята" }), env);
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(409);
    expect(body.error).toContain("зайнята");
  });

  it("без полів — 400, без рядка — 404", async () => {
    const { env } = makeDb({});
    expect((await handlePlatformPageUpdate(post({ id: 2 }), env)).status).toBe(400);

    const missing = makeDb({ changes: 0 });
    expect((await handlePlatformPageUpdate(post({ id: 2, title: "x" }), missing.env)).status).toBe(
      404,
    );
  });
});
