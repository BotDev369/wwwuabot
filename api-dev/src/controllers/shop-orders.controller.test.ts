/**
 * Межа тіла замовлення: **розміщення і зміна — різні правила**.
 *
 * Зміну магазину й номер замовлення перевіряє `positiveId` (вона одна на всі
 * гілки), а розміщення — `validateOrderDraft` усередині сервісу, бо кошик і
 * контакти приходять разом. Тому схема тут — лише охоронець форми: вона має
 * відкинути не-об'єкт **до** бази, а не вирішувати, чи замовлення правильне.
 *
 * @module api-dev/src/controllers/shop-orders.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleSpaceShopOrders, handleUserShopOrders } from "./shop-orders.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

const SHOP_COLUMNS = [
  "id",
  "slug",
  "owner_id",
  "title",
  "products_json",
  "created_at",
  "updated_at",
];

interface Captured {
  sql: string;
  binds: unknown[];
}

// ── Підпис initData ───────────────────────────────────────────────
// Копія зі `notes.controller.test.ts` навмисно: це фікстура тесту, а не код
// продукту. Підписувач у `shared/src` умів би підробити ідентичність.

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

// ── Заглушка D1 ───────────────────────────────────────────────────

function makeDb(): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => null,
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: SHOP_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: 1, last_row_id: 9 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

function request(path: string, body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request(`https://api.example.com${path}`, {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("розміщення без підписаного initData нічого не пише", async () => {
    const db = makeDb();
    const res = await handleSpaceShopOrders(
      request("/api/space/shop/orders?shop=kava", { items: [] }),
      db.env,
    );

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("не-об'єкт у тілі зміни не доходить до магазину", async () => {
    const db = makeDb();
    const res = await handleUserShopOrders(
      request("/api/user/shop/orders?shop=1", `"status"`, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(db.statements).toHaveLength(0);
  });

  it("не-об'єкт у тілі розміщення не доходить до бази", async () => {
    const db = makeDb();
    const res = await handleSpaceShopOrders(
      request("/api/space/shop/orders?shop=kava", `"кошик"`, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(db.statements).toHaveLength(0);
  });

  // `shop` і `id` перевіряє `positiveId`: без номера магазину це не замовлення.
  it("без номера магазину зміна відпадає, а не йде «кудись»", async () => {
    const db = makeDb();
    const res = await handleUserShopOrders(
      request("/api/user/shop/orders?shop=abc", { id: 1, status: "done" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(db.statements).toHaveLength(0);
  });
});

// ── Правило замовлення ───────────────────────────────────────────

describe("зміст відповідає правилу замовлення", () => {
  it("порожній кошик відхиляє `validateOrderDraft`, а не розбір тіла", async () => {
    const db = makeDb();
    const res = await handleSpaceShopOrders(
      request("/api/space/shop/orders?shop=kava", { items: [] }, await signedInitData()),
      db.env,
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };

    // Магазину в базі немає, тож до правила дістатися не вдалося: важливо, що
    // це **не** безлике «Invalid body», тобто розбір тіло прийняв.
    expect(res.status).toBe(404);
    expect(body.error).not.toBe("Invalid body");
  });
});
