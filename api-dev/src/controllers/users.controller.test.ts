/**
 * Межа тіла адмінського запиту: **чий рядок ми змінюємо**.
 *
 * Тут фіксується те, що ламалося мовчки. `user_id` раніше проходив крізь
 * `parseInt(String(...))`, тож `"12abc"` перетворювався на `12`: адмін просив
 * «оновити користувача 12» і отримував `200`, поки правився зовсім інший рядок.
 * Тип перевіряється в схемі (`readBody`), тож такий запит не доходить до бази.
 *
 * Друга межа — форма тіла. `null`, рядок або масив не є об'єктом, з яким
 * сервіс маємо працювати: `400` без жодного запиту до D1.
 *
 * @module api-dev/src/controllers/users.controller.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import {
  handleBulkUsers,
  handleDeleteUser,
  handleSetPlatformUsername,
  handleUpdateUser,
  handleUserMessage,
} from "./users.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

/** Колонки `users` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const USER_COLUMNS = [
  "user_id",
  "first_name",
  "last_name",
  "username",
  "language",
  "role",
  "tariff",
  "status",
  "discount",
  "permissions",
  "is_blocked",
  "platform_username",
  "photo_url",
  "about",
  "profile_public",
  "profile_public_fields",
  "telegram_json",
  "created_at",
  "updated_at",
];

interface Captured {
  sql: string;
  binds: unknown[];
}

interface DbOptions {
  changes?: number;
  row?: unknown;
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

function makeDb(options: DbOptions = {}): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => options.row ?? null,
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: USER_COLUMNS.map((name) => ({ name })) }
            : { results: [] },
        run: async () => ({ meta: { changes: options.changes ?? 1, last_row_id: 3 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

/** Запит до даних `users` (DDL і прагми від `ensureTables` не рахуємо). */
function dataStatement(
  db: { statements: Captured[] },
  keyword: "INSERT" | "UPDATE" | "DELETE" | "SELECT",
): Captured | undefined {
  return [...db.statements]
    .reverse()
    .find((s) => s.sql.trimStart().toUpperCase().startsWith(keyword));
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

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("не-об'єкт у тілі відкидає розбір, а не бізнес-правило", async () => {
    const db = makeDb();
    const res = await handleDeleteUser(request("/api/admin/users/delete", `"користувач"`), db.env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(db.statements).toHaveLength(0);
  });

  it("масив у тілі теж не об'єкт: масив — не список полів користувача", async () => {
    const db = makeDb();
    const res = await handleUpdateUser(request("/api/admin/users/update", "[1,2,3]"), db.env);

    expect(res.status).toBe(400);
    expect(db.statements).toHaveLength(0);
  });

  it("зіпсоване JSON не доходить до бази", async () => {
    const db = makeDb();
    const res = await handleDeleteUser(request("/api/admin/users/delete", "{user_id:"), db.env);

    expect(res.status).toBe(400);
    expect(db.statements).toHaveLength(0);
  });

  // Регресія: `parseInt(String(body.user_id))` перетворював `"12abc"` на `12`,
  // і відповідь була `200`, поки правився не той рядок.
  it("id, який не є числом, не стає чужим користувачем", async () => {
    const db = makeDb();
    const res = await handleUpdateUser(
      request("/api/admin/users/update", { user_id: "12abc", role: "admin" }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(dataStatement(db, "UPDATE")).toBeUndefined();
  });

  it("нульовий id не проходить: такого користувача не буває", async () => {
    const db = makeDb();
    const res = await handleDeleteUser(request("/api/admin/users/delete", { user_id: 0 }), db.env);

    expect(res.status).toBe(400);
    expect(db.statements).toHaveLength(0);
  });
});

// ── Дії, які мають дійти до бази ───────────────────────────────────

describe("валідне тіло доходить до бази", () => {
  it("оновлення пише поля й ідентифікатор у WHERE", async () => {
    const db = makeDb();
    const res = await handleUpdateUser(
      request("/api/admin/users/update", { user_id: 42, role: "admin", tariff: "pro" }),
      db.env,
    );

    expect(res.status).toBe(200);
    const update = dataStatement(db, "UPDATE");
    expect(update?.sql).toContain("WHERE user_id = ?");
    expect(update?.binds).toEqual(["admin", "pro", 42]);
  });

  it("bulk з невідомою дією не видаляє нікого", async () => {
    const db = makeDb();
    const res = await handleBulkUsers(
      request("/api/admin/users/bulk", { action: "drop-database", ids: [1, 2] }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(dataStatement(db, "DELETE")).toBeUndefined();
  });

  it("bulk без жодного id — це не робота, а помилка запиту", async () => {
    const db = makeDb();
    const res = await handleBulkUsers(
      request("/api/admin/users/bulk", { action: "delete", ids: [] }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(dataStatement(db, "DELETE")).toBeUndefined();
  });

  it("bulk видаляє рівно тих, кого перелічено", async () => {
    const db = makeDb();
    const res = await handleBulkUsers(
      request("/api/admin/users/bulk", { action: "delete", ids: [1, 2, 3] }),
      db.env,
    );

    expect(res.status).toBe(200);
    const del = dataStatement(db, "DELETE");
    expect(del?.binds).toEqual([1, 2, 3]);
  });

  it("порожній текст не надсилається в Telegram", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const db = makeDb();

    const res = await handleUserMessage(
      request("/api/admin/users/message", { user_id: 42, text: "" }),
      db.env,
    );

    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── Спільне правило імені ──────────────────────────────────────────

describe("ім'я на платформі", () => {
  it("не-рядок доходить до спільного правила, а не губиться на розборі", async () => {
    const db = makeDb();
    const res = await handleSetPlatformUsername(
      request("/api/user/username", { username: 42 }, await signedInitData()),
      db.env,
    );
    const body = (await res.json()) as { error?: string; code?: string };

    // Повідомлення про «порожнє» надходить від `validatePlatformUsername`,
    // а не загальне «Invalid body»: правило і текст для людини — одні.
    expect(res.status).toBe(400);
    expect(body.code).toBe("invalid");
    expect(body.error).not.toBe("Invalid body");
    expect(dataStatement(db, "UPDATE")).toBeUndefined();
  });
});
