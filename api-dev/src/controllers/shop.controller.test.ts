/**
 * Межа тіла товару: **`id` вирішує, правка це чи створення**.
 *
 * Те саме, що й у сторінках: `Number("5abc")` — це `5`, тож запит «оновити
 * товар 5abc» тихо правив би товар 5, а `Number(null)` дав би `NaN` і створив
 * дубль замість правки. Тепер таке тіло відпадає цілому. Зміст товару
 * перевіряє спільне `validateProductDraft` — воно й має відповідати за зміст.
 *
 * @module api-dev/src/controllers/shop.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleUserShopProducts } from "./shop.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

const PRODUCT_COLUMNS = [
  "id",
  "shop_id",
  "title",
  "price",
  "kind",
  "address",
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
            ? { results: PRODUCT_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: 1, last_row_id: 8 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

function wroteProducts(db: { statements: Captured[] }): boolean {
  return db.statements.some((s) =>
    /^(INSERT INTO|UPDATE|DELETE FROM)\s+shop_products\b/i.test(s.sql.trimStart()),
  );
}

function request(body: unknown, initData?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request("https://api.example.com/api/user/shop/products?shop=1", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("без підписаного initData не пишемо нічого", async () => {
    const db = makeDb();
    const res = await handleUserShopProducts(request({ id: "5abc" }), db.env);

    expect(res.status).toBe(401);
    expect(db.statements).toHaveLength(0);
  });

  it("не-об'єкт у тілі відкидає розбір, а не правило товару", async () => {
    const db = makeDb();
    const res = await handleUserShopProducts(request(`"товар"`, await signedInitData()), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteProducts(db)).toBe(false);
  });

  // Регресія: `Number("5abc")` — це `5`, тобто правка чужого товару. Тут
  // навмисно **повний** товар: тоді видно не лише код відповіді, а й те, що
  // без типізації запит створив би новий товар замість правки наявного.
  it("`id`, який не є числом, не створює товар замість правки", async () => {
    const db = makeDb();
    const res = await handleUserShopProducts(
      request({ id: "5abc", kind: "physical", title: "Кава" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteProducts(db)).toBe(false);
  });

  it("`id: null` теж не створює дубль замість правки", async () => {
    const db = makeDb();
    const res = await handleUserShopProducts(
      request({ id: null, kind: "physical", title: "Кава" }, await signedInitData()),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(wroteProducts(db)).toBe(false);
  });
});

describe("зміст відповідає спільне правило", () => {
  it("порожній товар відхиляє `validateProductDraft`, а не розбір тіла", async () => {
    const db = makeDb();
    const res = await handleUserShopProducts(
      request({ title: "" }, await signedInitData()),
      db.env,
    );
    const body = (await res.json()) as { ok?: boolean; error?: string };

    expect(res.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error).not.toBe("Invalid body");
    expect(wroteProducts(db)).toBe(false);
  });
});
