import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  index: null as unknown,
  sent: [] as { chatId: number; html: string }[],
  fail: false,
  cart: new Map<number, number>(),
}));

vi.mock("./search.repository", () => ({
  loadSearchIndex: async () => state.index,
}));
vi.mock("./cart.repository", () => ({
  loadCartQuantities: async () => state.cart,
}));
vi.mock("../../shared/telegram/widgets", () => ({
  sendRichMessage: async (_token: string, chatId: number, html: string) => {
    if (state.fail) throw new Error("telegram down");
    state.sent.push({ chatId, html });
    return { message_id: 777 };
  },
}));

const { handleSearch } = await import("./search.handler");

const INDEX = {
  builtAt: "2026-11-22T00:00:00.000Z",
  entries: [
    {
      kind: "page" as const,
      slug: "galyashop",
      title: "GalyaShop",
      subtitle: "Магазин",
      photo: "https://api.test/api/shop/media/shop/defaults/page.webp",
      terms: ["галяшоп", "галя шоп"],
      href: "/galyashop",
    },
    {
      kind: "product" as const,
      id: 12,
      slug: "astrahal",
      shopSlug: "galyashop",
      title: "Астрагал",
      subtitle: "GalyaShop",
      price: "120 ₴",
      terms: ["астрагал"],
      href: "/galyashop/p/astrahal",
    },
  ],
};

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    chat: { id: 42, type: "private" },
    from: { id: 42 },
    env: { BOT_TOKEN: "x", WEB_PLATFORM_URL: "https://platform.test" },
    screenHandled: false,
    ...overrides,
  } as never;
}

beforeEach(() => {
  state.index = INDEX;
  state.sent = [];
  state.fail = false;
  state.cart = new Map();
});

describe("handleSearch", () => {
  it("приватний чат: rich із карткою, вхідне лишається", async () => {
    const context = ctx();
    expect(await handleSearch(context, "Галя Шоп")).toBe(true);
    expect(state.sent).toHaveLength(1);
    expect(state.sent[0].html).toContain("GalyaShop");
    expect(state.sent[0].html).toContain("Відкрити");
    expect((context as { screenHandled: boolean }).screenHandled).toBe(true);
  });

  it("нічого не знайдено — теж одна rich-відповідь", async () => {
    expect(await handleSearch(ctx(), "абракадабра")).toBe(true);
    expect(state.sent[0].html).toContain("Нічого не знайдено");
  });

  it("група не шукає — там свої сценарії", async () => {
    expect(await handleSearch(ctx({ chat: { id: -1, type: "group" } }), "галяшоп")).toBe(false);
    expect(state.sent).toHaveLength(0);
  });

  it("порожній текст і відсутній індекс — не наш випадок", async () => {
    expect(await handleSearch(ctx(), "   ")).toBe(false);
    state.index = null;
    expect(await handleSearch(ctx(), "галяшоп")).toBe(false);
  });

  it("відмова Telegram не позначає екран обробленим", async () => {
    state.fail = true;
    const context = ctx();
    expect(await handleSearch(context, "галяшоп")).toBe(false);
    expect((context as { screenHandled: boolean }).screenHandled).toBe(false);
  });

  it("кількість у картці береться зі спільного кошика", async () => {
    state.cart = new Map([[12, 2]]);
    await handleSearch(ctx(), "астрагал");

    expect(state.sent[0].html).toContain('<tg-button type="disabled">2 шт</tg-button>');
    expect(state.sent[0].html).toContain("?order=1&amp;qty=2");
  });

  it("без WEB_PLATFORM_URL картка лишається без кнопок", async () => {
    await handleSearch(ctx({ env: { BOT_TOKEN: "x" } }), "галяшоп");
    expect(state.sent[0].html).toContain("GalyaShop");
    expect(state.sent[0].html).not.toContain("tg-button");
  });
});
