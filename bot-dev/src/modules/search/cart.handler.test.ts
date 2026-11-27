import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  lines: [] as { productId: number; qty: number }[],
  changed: [] as { productId: number; action: string }[],
  edited: [] as string[],
  touched: [] as number[],
  toasts: [] as string[],
  query: "астрагал",
  messageId: 55,
}));

vi.mock("./search.repository", () => ({
  loadSearchIndex: async () => ({
    builtAt: "now",
    entries: [
      {
        kind: "product",
        id: 12,
        slug: "astrahal",
        shopSlug: "galyashop",
        title: "Астрагал",
        terms: ["астрагал"],
        href: "/galyashop/p/astrahal",
      },
    ],
  }),
}));
vi.mock("./cart.repository", () => ({
  changeCart: async (
    _env: unknown,
    _user: number,
    _shop: string,
    productId: number,
    action: string,
  ) => {
    state.changed.push({ productId, action });
    return { kind: "ok", lines: state.lines };
  },
  loadCartQuantities: async () => new Map(state.lines.map((line) => [line.productId, line.qty])),
  screenQuery: async () => state.query,
  touchScreen: async (_env: unknown, _user: number, messageId: number) => {
    state.touched.push(messageId);
  },
}));
vi.mock("../../shared/telegram/widgets", () => ({
  editRichMessage: async (_token: string, _chat: number, _id: number, html: string) => {
    state.edited.push(html);
    return true;
  },
}));

const { handleCartCallback, parseCartData } = await import("./cart.handler");

function ctx(over: Record<string, unknown> = {}) {
  return {
    chat: { id: 42, type: "private" },
    from: { id: 777 },
    env: { BOT_TOKEN: "x", WEB_PLATFORM_URL: "https://platform.test" },
    callbackQuery: {
      data: "cart:add:12",
      message: { message_id: state.messageId },
    },
    answerCallbackQuery: async (input: { text?: string }) => {
      state.toasts.push(input.text ?? "");
    },
    ...over,
  } as never;
}

beforeEach(() => {
  state.lines = [{ productId: 12, qty: 1 }];
  state.changed = [];
  state.edited = [];
  state.touched = [];
  state.toasts = [];
  state.query = "астрагал";
  state.messageId = 55;
});

vi.mock("../../shared/tenant-context", () => ({
  tenantForUser: async () => ({ id: 1, key: "main", name: "main" }),
  defaultTenant: async () => ({ id: 1, key: "main", name: "main" }),
  rememberTenant: async () => undefined,
  pickTenant: async () => null,
}));
describe("parseCartData", () => {
  it("розбирає дію й номер товару", () => {
    expect(parseCartData("cart:add:12")).toEqual({ action: "add", productId: 12 });
    expect(parseCartData("cart:dec:12")).toEqual({ action: "dec", productId: 12 });
  });

  it("чужий колбек і битий номер — не наші", () => {
    expect(parseCartData("reports")).toBeNull();
    expect(parseCartData("cart:add:0")).toBeNull();
    expect(parseCartData("cart:add:12:3")).toEqual({ action: "add", productId: 12 });
  });
});

describe("handleCartCallback", () => {
  it("додає позицію й перемальовує те саме повідомлення", async () => {
    expect(await handleCartCallback(ctx())).toBe(true);

    expect(state.changed).toEqual([{ productId: 12, action: "add" }]);
    expect(state.edited).toHaveLength(1);
    expect(state.edited[0]).toContain('<tg-button type="disabled">1 шт</tg-button>');
    expect(state.edited[0]).toContain("?order=1&amp;qty=1");
    expect(state.edited[0]).toContain("<details open><summary>Астрагал</summary>");
    expect(state.touched).toEqual([55]);
    expect(state.toasts).toEqual(["У кошику: 1"]);
  });

  it("«мінус» на одиниці прибирає позицію", async () => {
    state.lines = [];
    const context = ctx({ callbackQuery: { data: "cart:dec:12", message: { message_id: 55 } } });

    await handleCartCallback(context);

    expect(state.changed).toEqual([{ productId: 12, action: "dec" }]);
    expect(state.edited[0]).toContain("Додати в кошик");
    expect(state.toasts).toEqual(["Прибрано з кошика"]);
  });

  it("група не має кошика", async () => {
    await handleCartCallback(ctx({ chat: { id: -1, type: "group" } }));

    expect(state.edited).toHaveLength(0);
    expect(state.toasts[0]).toContain("приватному чаті");
  });

  it("без збереженого запиту екран усе одно перемальовується", async () => {
    state.query = "";
    await handleCartCallback(ctx());

    expect(state.edited).toHaveLength(1);
    expect(state.edited[0]).toContain("<summary>Астрагал</summary>");
  });
});
