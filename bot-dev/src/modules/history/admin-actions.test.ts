/**
 * Дії адміна на боці бота: Telegram викликається першим, рядок у `bot_messages`
 * оновлюється лише після його «ok», а 48 годин перевіряються до мережі.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";
import { applyAdminAction, type HistoryRow } from "./admin-actions";

vi.mock("@wwwuabot/shared/database/ensure-tables", () => ({
  ensureTables: async () => undefined,
}));

function row(overrides: Partial<HistoryRow> = {}): HistoryRow {
  return {
    id: 1,
    user_id: 7,
    direction: "out",
    message_id: 100,
    kind: "rich",
    text: "<p>старе</p>",
    meta: null,
    created_at: "2026-11-22 10:00:00",
    edited_at: null,
    deleted_at: null,
    ...overrides,
  };
}

function database(target: HistoryRow | null) {
  const sqls: string[] = [];
  const db = {
    prepare(sql: string) {
      sqls.push(sql);
      let values: unknown[] = [];
      const statement = {
        bind(...args: unknown[]) {
          values = args;
          return statement;
        },
        async first() {
          return target;
        },
        async run() {
          if (!target) return { meta: { changes: 0 } };
          if (sql.includes("SET text")) {
            target.text = String(values[0]);
            target.edited_at = "2026-11-22 12:00:00";
          }
          if (sql.includes("SET deleted_at")) target.deleted_at = "2026-11-22 12:00:00";
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
  return { db: db as unknown as D1Database, sqls };
}

function env(db: D1Database): Env {
  return { DB: db, BOT_TOKEN: "token" } as unknown as Env;
}

function telegram(answer: Record<string, unknown> | Error = { ok: true }) {
  const mock = vi.fn(async () => {
    if (answer instanceof Error) throw answer;
    return { json: async () => answer };
  });
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => vi.unstubAllGlobals());
beforeEach(() => vi.clearAllMocks());

describe("applyAdminAction", () => {
  it("правка rich: надсилає HTML і ставить edited_at", async () => {
    const target = row();
    const { db, sqls } = database(target);
    const fetchMock = telegram();

    const result = await applyAdminAction(env(db), {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "Новий & текст",
      format: "rich",
    });

    expect(result.ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/editMessageText");
    expect(JSON.parse(String(init.body))).toMatchObject({
      chat_id: 7,
      message_id: 100,
      rich_message: { html: "<p>Новий &amp; текст</p>" },
    });
    expect(target.text).toBe("<p>Новий &amp; текст</p>");
    expect(target.edited_at).toBeTruthy();
    expect(sqls.some((sql) => sql.includes("edited_at"))).toBe(true);
  });

  it("правка звичайного тексту йде без rich_message", async () => {
    const { db } = database(row({ kind: "text" }));
    const fetchMock = telegram();

    await applyAdminAction(env(db), {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "просто текст",
      format: "plain",
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({ text: "просто текст" });
    expect(String(init.body)).not.toContain("rich_message");
  });

  it("видалити можна й повідомлення людини: ставиться deleted_at", async () => {
    const target = row({ direction: "in" });
    const { db } = database(target);
    const fetchMock = telegram();

    const result = await applyAdminAction(env(db), { action: "delete", chatId: 7, messageId: 100 });

    expect(result.ok).toBe(true);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("/deleteMessage");
    expect(target.deleted_at).toBeTruthy();
  });

  it("старше 48 годин — відмова до мережі", async () => {
    const { db } = database(row({ created_at: "2020-01-01 00:00:00" }));
    const fetchMock = telegram();

    const result = await applyAdminAction(env(db), { action: "delete", chatId: 7, messageId: 100 });

    expect(result).toMatchObject({ ok: false, status: 409, error: "too_old" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("правка чужого повідомлення заборонена, видалення — ні", async () => {
    const { db } = database(row({ direction: "in" }));
    const fetchMock = telegram();

    const result = await applyAdminAction(env(db), {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "x",
      format: "plain",
    });

    expect(result).toMatchObject({ ok: false, status: 409, error: "not_bot_message" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("уже видалене та невідоме повідомлення — різні відмови", async () => {
    const deleted = database(row({ deleted_at: "2026-11-22 11:00:00" }));
    expect(
      await applyAdminAction(env(deleted.db), { action: "delete", chatId: 7, messageId: 100 }),
    ).toMatchObject({ ok: false, status: 409, error: "already_deleted" });

    const missing = database(null);
    expect(
      await applyAdminAction(env(missing.db), { action: "delete", chatId: 7, messageId: 100 }),
    ).toMatchObject({ ok: false, status: 404, error: "not_found" });
  });

  it("відмова Telegram не змінює рядок", async () => {
    const target = row();
    const { db } = database(target);
    const fetchMock = telegram({
      ok: false,
      error_code: 400,
      description: "message can't be edited",
    });

    const result = await applyAdminAction(env(db), {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "нове",
      format: "text" as never,
    });

    expect(result).toMatchObject({ ok: false, status: 409, error: "telegram_refused" });
    expect(result).toHaveProperty("description", "message can't be edited");
    expect(target.edited_at).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("порожній текст — відмова без мережі", async () => {
    const { db } = database(row());
    const fetchMock = telegram();
    const result = await applyAdminAction(env(db), {
      action: "edit",
      chatId: 7,
      messageId: 100,
      text: "   ",
      format: "plain",
    });
    expect(result).toMatchObject({ ok: false, status: 400, error: "empty_text" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
