import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  index: null as unknown,
  sent: [] as { chatId: number; html: string }[],
  fail: false,
  recorded: [] as { messageId: number; meta: unknown }[],
}));

vi.mock("./search.repository", () => ({
  loadSearchIndex: async () => state.index,
}));
vi.mock("../../shared/telegram/widgets", () => ({
  sendRichMessage: async (_token: string, chatId: number, html: string) => {
    if (state.fail) throw new Error("telegram down");
    state.sent.push({ chatId, html });
    return { message_id: 888 };
  },
}));
vi.mock("../history/record", () => ({
  recordOutgoingMessage: async (
    _ctx: unknown,
    messageId: number,
    _kind: string,
    _html: string,
    meta: unknown,
  ) => {
    state.recorded.push({ messageId, meta });
  },
}));

const { handleWords } = await import("./words.handler");

const INDEX = {
  builtAt: "2026-11-23T00:00:00.000Z",
  entries: [
    {
      kind: "page" as const,
      slug: "galyashop",
      title: "GalyaShop",
      terms: ["галяшоп", "галя шоп"],
      href: "/galyashop",
    },
  ],
};

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    chat: { id: 42, type: "private" },
    env: { BOT_TOKEN: "x" },
    from: { id: 42 },
    screenHandled: false,
    ...overrides,
  } as never;
}

beforeEach(() => {
  state.index = INDEX;
  state.sent = [];
  state.fail = false;
  state.recorded = [];
});

describe("handleWords", () => {
  it("приватний чат: одне rich-повідомлення зі словами", async () => {
    const context = ctx();
    expect(await handleWords(context)).toBe(true);

    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].html).toContain("<summary>GalyaShop</summary>");
    expect(state.sent[0].html).toContain("галяшоп · галя шоп");
    expect((context as { screenHandled: boolean }).screenHandled).toBe(true);
    expect(state.recorded[0]).toEqual({ messageId: 888, meta: { screen: "words" } });
  });

  it("група не показує довідник", async () => {
    expect(await handleWords(ctx({ chat: { id: -1, type: "group" } }))).toBe(false);
    expect(state.sent).toHaveLength(0);
  });

  it("без індексу — не наш випадок", async () => {
    state.index = null;
    expect(await handleWords(ctx())).toBe(false);
  });

  it("відмова Telegram не позначає екран обробленим", async () => {
    state.fail = true;
    const context = ctx();
    expect(await handleWords(context)).toBe(false);
    expect((context as { screenHandled: boolean }).screenHandled).toBe(false);
  });
});
