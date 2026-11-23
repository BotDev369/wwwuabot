/**
 * Кошик покупця: форма запиту й коди відповіді.
 *
 * Сервіс тут замінений: його правила перевіряє `cart.service.test.ts`, а цей
 * файл стереже межу — без підпису не пускає, `qty` і `delta` не плутає,
 * очищення не вимагає номера товару.
 *
 * @module api-dev/src/controllers/shop-cart.controller.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";

const state = vi.hoisted(() => ({
  read: { kind: "ok", lines: [] } as unknown,
  change: { kind: "ok", lines: [] } as unknown,
  clear: { kind: "ok", lines: [] } as unknown,
  calls: [] as { method: string; args: unknown[] }[],
}));

vi.mock("../services/shop/cart.service", () => ({
  ShopCartService: class {
    async read(...args: unknown[]) {
      state.calls.push({ method: "read", args });
      return state.read;
    }
    async change(...args: unknown[]) {
      state.calls.push({ method: "change", args });
      return state.change;
    }
    async clear(...args: unknown[]) {
      state.calls.push({ method: "clear", args });
      return state.clear;
    }
  },
}));

const { handleUserShopCart } = await import("./shop-cart.controller");

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signedInitData(userId = USER_ID): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

function request(
  method: string,
  query = "shop=galyashop",
  body?: unknown,
  initData?: string,
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request(`https://api.example.com/api/user/shop/cart?${query}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function env(): Env {
  return { DB: {}, BOT_TOKEN } as unknown as Env;
}

beforeEach(() => {
  state.read = { kind: "ok", lines: [] };
  state.change = { kind: "ok", lines: [] };
  state.clear = { kind: "ok", lines: [] };
  state.calls = [];
});

describe("ShopCartController", () => {
  it("без підписаного initData не читає й не пише", async () => {
    const res = await handleUserShopCart(request("GET"), env());

    expect(res.status).toBe(401);
    expect(state.calls).toHaveLength(0);
  });

  it("GET віддає позиції; порожній кошик — це ok", async () => {
    const res = await handleUserShopCart(
      request("GET", "shop=galyashop", undefined, await signedInitData()),
      env(),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, lines: [] });
  });

  it("GET закритого магазину — 404, а не порожній кошик", async () => {
    state.read = { kind: "not_found" };
    const res = await handleUserShopCart(
      request("GET", "shop=znyklyi", undefined, await signedInitData()),
      env(),
    );

    expect(res.status).toBe(404);
  });

  it("без shop не вгадує магазин", async () => {
    const res = await handleUserShopCart(
      request("GET", "", undefined, await signedInitData()),
      env(),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Missing shop" });
  });

  it("PUT приймає delta або qty, але не обидва одразу", async () => {
    const init = await signedInitData();
    const both = await handleUserShopCart(
      request("PUT", "shop=galyashop", { productId: 9, qty: 1, delta: 1 }, init),
      env(),
    );
    expect(both.status).toBe(400);

    const byDelta = await handleUserShopCart(
      request("PUT", "shop=galyashop", { productId: 9, delta: 1 }, init),
      env(),
    );
    expect(byDelta.status).toBe(200);
    expect(state.calls[0].args).toEqual([
      "galyashop",
      USER_ID,
      { productId: 9, qty: undefined, delta: 1 },
    ]);
  });

  it("зниклий товар — 400 зі словом сервера", async () => {
    state.change = { kind: "rejected", message: "Товару більше немає в магазині" };
    const res = await handleUserShopCart(
      request("PUT", "shop=galyashop", { productId: 9, qty: 1 }, await signedInitData()),
      env(),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Товару більше немає в магазині" });
  });

  it("DELETE з productId прибирає позицію, без нього — весь кошик", async () => {
    const init = await signedInitData();
    await handleUserShopCart(
      request("DELETE", "shop=galyashop&productId=9", undefined, init),
      env(),
    );
    await handleUserShopCart(request("DELETE", "shop=galyashop", undefined, init), env());

    expect(state.calls[0]).toEqual({
      method: "change",
      args: ["galyashop", USER_ID, { productId: 9, qty: 0 }],
    });
    expect(state.calls[1]).toEqual({ method: "clear", args: ["galyashop", USER_ID] });
  });

  it("битий productId не видаляє випадковий товар", async () => {
    const res = await handleUserShopCart(
      request("DELETE", "shop=galyashop&productId=9abc", undefined, await signedInitData()),
      env(),
    );

    expect(res.status).toBe(400);
    expect(state.calls).toHaveLength(0);
  });

  it("чужий метод — 405", async () => {
    const res = await handleUserShopCart(
      request("POST", "shop=galyashop", {}, await signedInitData()),
      env(),
    );

    expect(res.status).toBe(405);
  });
});
