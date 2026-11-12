/**
 * Рендер сценарію: віджет у приватному чаті, rich у групі, запасний rich на
 * помилку віджета, видалення попереднього екрана й збереження стану.
 *
 * @module bot-dev/src/shared/utils/scenario-screen.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../types/env";
import type { BotScenario } from "../types/scenario";
import { renderScenario } from "./scenario-screen";

function scenario(overrides: Partial<BotScenario> = {}): BotScenario {
  return {
    id: 1,
    lookup: "/start",
    kind: "widget",
    caption: "ПАЛЯНИЦЯ",
    widget_html: "<h1>ПАЛЯНИЦЯ</h1>",
    widget_data: "{}",
    rich_html: null,
    notify_groups: null,
    notify_template: null,
    ...overrides,
  };
}

function context(options: { chatType?: string; oldMessage?: number } = {}) {
  const deleted: number[][] = [];
  const dbCalls: unknown[][] = [];
  const db = {
    prepare: () => ({
      bind: (...args: unknown[]) => {
        dbCalls.push(args);
        return { run: async () => ({ meta: { changes: 1 } }) };
      },
    }),
  };
  const ctx = {
    env: { BOT_TOKEN: "token", DB: db },
    chat: { id: 5, type: options.chatType ?? "private" },
    user: { user_id: 7, message_id: options.oldMessage },
    api: {
      deleteMessages: async (_chat: number, ids: number[]) => {
        deleted.push(ids);
        return true;
      },
    },
  } as unknown as AppContext;
  return { ctx, deleted, dbCalls };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(ok: boolean, result: unknown) {
  return async (_url: string, _init: RequestInit) =>
    new Response(JSON.stringify({ ok, result }), { status: 200 });
}

describe("renderScenario", () => {
  it("віджет іде в приватний чат і зберігає стан", async () => {
    const fetchMock = vi.fn(respond(true, { message_id: 11, widget: { id: "w1" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { ctx, deleted, dbCalls } = context({ oldMessage: 9 });

    expect(await renderScenario(ctx, scenario())).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/sendWidget"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(deleted).toEqual([[9]]);
    expect(ctx.user?.message_id).toBe(11);
    expect(dbCalls[0]).toEqual([7, 11, "w1", "/start", "{}"]);
  });

  it("у групі віджет не шлеться — тільки rich", async () => {
    const fetchMock = vi.fn(respond(true, { message_id: 12 }));
    vi.stubGlobal("fetch", fetchMock);
    const { ctx } = context({ chatType: "supergroup" });

    expect(await renderScenario(ctx, scenario({ rich_html: "<b>rich</b>" }))).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toContain("/sendRichMessage");
  });

  it("⛔ помилка віджета переходить на rich, а без rich — на false", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, description: "too big" })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { message_id: 13 } })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const first = context();

    expect(await renderScenario(first.ctx, scenario({ rich_html: "<b>rich</b>" }))).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toContain("/sendRichMessage");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ ok: false }))),
    );
    const second = context();
    expect(await renderScenario(second.ctx, scenario())).toBe(false);
  });

  it("⛔ без chat немає рендера", async () => {
    const { ctx } = context();
    (ctx as { chat?: unknown }).chat = undefined;
    expect(await renderScenario(ctx, scenario())).toBe(false);
  });
});
