/**
 * Кошик бота: D1-запити без Telegram-підпису.
 *
 * Схему тут не створюємо (це `ensureTables`, у нього свої тести), а SQL-шлях
 * перевіряємо: закритий магазин, зниклий товар, «мінус» без перевірки товару,
 * кількості одним запитом і перемальовування збереженого екрана.
 *
 * @module bot-dev/src/modules/search/cart.repository.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";

const state = vi.hoisted(() => ({
  shop: null as number | null,
  product: false,
  cart: [] as { productId: number; qty: number }[],
  calls: [] as { sql: string; binds: unknown[] }[],
  meta: "{}" as string | null,
}));

vi.mock("@wwwuabot/shared/database/ensure-tables", () => ({ ensureTables: async () => undefined }));
vi.mock("@wwwuabot/shared/database/bot-messages", () => ({ BOT_MESSAGE_TEXT_MAX: 10 }));
vi.mock("@wwwuabot/shared/shop", () => ({
  addCartLine: async (
    _db: unknown,
    _user: number,
    _shop: number,
    _product: number,
    delta: number,
  ) => {
    state.calls.push({ sql: "addCartLine", binds: [delta] });
    return state.cart;
  },
  readCartQuantities: async () => {
    state.calls.push({ sql: "readCartQuantities", binds: [] });
    return new Map(state.cart.map((line) => [line.productId, line.qty]));
  },
}));

const { changeCart, loadCartQuantities, screenQuery, touchScreen } =
  await import("./cart.repository");

function env(): Env {
  const db = {
    prepare(sql: string) {
      const record = { sql, binds: [] as unknown[] };
      const statement = {
        bind: (...binds: unknown[]) => {
          record.binds = binds;
          return statement;
        },
        first: async () => {
          state.calls.push(record);
          if (/FROM platform_pages s/.test(sql))
            return state.shop === null ? null : { id: state.shop };
          if (/FROM shop_products/.test(sql)) return state.product ? { id: record.binds[0] } : null;
          if (/SELECT meta FROM bot_messages/.test(sql)) return { meta: state.meta };
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => {
          state.calls.push(record);
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };
  return { DB: db, BOT_TOKEN: "x" } as unknown as Env;
}

beforeEach(() => {
  state.shop = 382;
  state.product = true;
  state.cart = [];
  state.calls = [];
  state.meta = "{}";
});

describe("changeCart", () => {
  it("закритий магазин — не наш випадок", async () => {
    state.shop = null;

    expect(await changeCart(env(), 7, "znyklyi", 9, "add")).toEqual({ kind: "shop_missing" });
  });

  it("додає лише товар, який справді є в магазині", async () => {
    state.product = false;

    expect(await changeCart(env(), 7, "galyashop", 9, "inc")).toEqual({ kind: "product_missing" });
  });

  it("«мінус» не питає, чи товар активний: прибрати можна й зниклий", async () => {
    state.product = false;
    state.cart = [];

    expect(await changeCart(env(), 7, "galyashop", 9, "dec")).toEqual({ kind: "ok", lines: [] });
    expect(state.calls.some((call) => /FROM shop_products/.test(call.sql))).toBe(false);
    expect(state.calls.at(-1)).toEqual({ sql: "addCartLine", binds: [-1] });
  });
});

describe("loadCartQuantities", () => {
  it("порожній екран не робить жодного запиту", async () => {
    expect(await loadCartQuantities(env(), 7, [])).toEqual(new Map());
    expect(state.calls).toHaveLength(0);
  });

  it("кількості всіх товарів — одним читанням", async () => {
    state.cart = [{ productId: 9, qty: 2 }];

    expect(await loadCartQuantities(env(), 7, ["galyashop"])).toEqual(new Map([[9, 2]]));
    expect(state.calls.at(-1)?.sql).toBe("readCartQuantities");
  });
});

describe("екран", () => {
  it("запит береться з meta останнього вихідного повідомлення", async () => {
    state.meta = JSON.stringify({ query: "астрагал" });

    expect(await screenQuery(env(), 7, 55)).toBe("астрагал");
  });

  it("битий meta — порожній запит, а не падіння", async () => {
    state.meta = "[не json";

    expect(await screenQuery(env(), 7, 55)).toBe("");
  });

  it("правка екрана обрізає текст до межі Telegram", async () => {
    await touchScreen(env(), 7, 55, "12345678901234567890");

    const update = state.calls.at(-1);
    expect(update?.sql).toContain("UPDATE bot_messages");
    expect(update?.binds[0]).toBe("1234567890");
  });
});
