import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  sent: [] as { chatId: number; html: string }[],
  recorded: [] as number[],
  fail: false,
}));

vi.mock("../../shared/telegram/widgets", () => ({
  sendRichMessage: async (_token: string, chatId: number, html: string) => {
    if (state.fail) throw new Error("telegram down");
    state.sent.push({ chatId, html });
    return { message_id: 900 };
  },
}));
vi.mock("../history/record", () => ({
  recordOutgoingMessage: async (_ctx: unknown, id: number) => {
    state.recorded.push(id);
  },
}));

const { handleStart } = await import("./start.handler");

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    chat: { id: 42, type: "private" },
    user: { first_name: "Олена" },
    env: { BOT_TOKEN: "x" },
    screenHandled: false,
    ...overrides,
  } as never;
}

beforeEach(() => {
  state.sent = [];
  state.recorded = [];
  state.fail = false;
});

describe("handleStart", () => {
  it("вітає по імені й показує два згорнуті акордеони", async () => {
    expect(await handleStart(ctx())).toBe(true);

    const html = state.sent[0]?.html ?? "";
    expect(html).toContain("Вітаємо, Олена!");
    expect(html).toContain("Напишіть що Вас цікавить");
    expect(html.match(/<details>/g)).toHaveLength(2);
    expect(html).toContain("в розробці");
    expect(state.recorded).toEqual([900]);
  });

  it("без імені вітання лишається вітанням", async () => {
    await handleStart(ctx({ user: {} }));
    expect(state.sent[0]?.html).toContain("Вітаємо!");
  });

  it("група — не наш випадок", async () => {
    expect(await handleStart(ctx({ chat: { id: -1, type: "group" } }))).toBe(false);
    expect(state.sent).toHaveLength(0);
  });

  it("відмова Telegram не позначає екран обробленим", async () => {
    state.fail = true;
    const context = ctx();
    expect(await handleStart(context)).toBe(false);
    expect((context as { screenHandled: boolean }).screenHandled).toBe(false);
  });
});
