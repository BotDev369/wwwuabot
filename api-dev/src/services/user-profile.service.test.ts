/**
 * Профіль і **ім'я на платформі** — єдина дія, яку користувач робить сам із
 * рядком `users`. Тести фіксують те, за що платить людина: `@Name` і `name` —
 * одне ім'я (зберігається канонічно), чуже зайняте ім'я не перезаписується, а
 * невалідне не доходить до бази взагалі.
 *
 * Заглушка D1 мінімальна: запит розрізняється за SQL, а `ensureTables` під час
 * читання/запису лишається безшумним (таблиця «вже є» — усі колонки на місці).
 */

import { describe, it, expect, vi } from "vitest";
import { UserProfileService, parsePermissions, parseTelegramData } from "./user-profile.service";
import type { Env } from "../shared/types";

const COLUMNS = [
  "user_id",
  "first_name",
  "last_name",
  "username",
  "platform_username",
  "language",
  "telegram_json",
  "role",
  "tariff",
  "status",
  "discount",
  "permissions",
  "is_blocked",
  "created_at",
  "updated_at",
];

function createEnv(row: Record<string, unknown> | null, takenBy: number | null = null) {
  const updates: Array<{ sql: string; values: unknown[] }> = [];

  const db = {
    prepare: vi.fn((sql: string) => {
      const statement = {
        bind: (...values: unknown[]) => {
          if (sql.startsWith("UPDATE")) updates.push({ sql, values });
          return statement;
        },
        first: async () => {
          if (sql.includes("WHERE platform_username = ?")) {
            return takenBy === null ? null : { user_id: takenBy };
          }
          if (sql.includes("FROM users WHERE user_id = ?")) return row;
          return null;
        },
        all: async () => ({ results: COLUMNS.map((name) => ({ name })) }),
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    }),
  };

  const env: Env = {
    DB: db as unknown as D1Database,
    CONTENT_KV: { get: async () => null, put: async () => undefined } as unknown as KVNamespace,
    ADMIN_SECRET: "test-secret",
  };

  return { env, updates };
}

describe("parsePermissions", () => {
  it("читає JSON-масив, а якщо це не JSON — список через кому", () => {
    expect(parsePermissions('["read","write"]')).toEqual(["read", "write"]);
    expect(parsePermissions("read, write")).toEqual(["read", "write"]);
    expect(parsePermissions(null)).toEqual([]);
    expect(parsePermissions("")).toEqual([]);
  });
});

describe("parseTelegramData", () => {
  it("читає збережений payload Telegram", () => {
    expect(parseTelegramData('{"id":1,"is_premium":true}')).toEqual({ id: 1, is_premium: true });
  });

  it("сміття не ламає профіль — просто немає даних", () => {
    expect(parseTelegramData("{не json")).toBeNull();
    expect(parseTelegramData("[1,2]")).toBeNull();
    expect(parseTelegramData("")).toBeNull();
    expect(parseTelegramData(undefined)).toBeNull();
  });
});

describe("UserProfileService.read", () => {
  it("віддає профіль із тими самими типами, що очікує картка", async () => {
    const { env } = createEnv({
      user_id: 42,
      first_name: "Оля",
      last_name: null,
      username: "olya_tg",
      platform_username: "olya",
      language: "uk",
      telegram_json: '{"id":42,"is_premium":true}',
      role: "vip",
      tariff: "pro",
      status: "active",
      discount: 10,
      permissions: '["read"]',
      is_blocked: 1,
      created_at: "2026-09-01",
      updated_at: "2026-09-14",
    });

    const profile = await new UserProfileService(env).read(42);

    expect(profile).toMatchObject({
      id: 42,
      firstName: "Оля",
      platformUsername: "olya",
      telegram: { id: 42, is_premium: true },
      permissions: ["read"],
      isBlocked: true,
    });
  });

  it("повертає null, коли рядка немає", async () => {
    const { env } = createEnv(null);
    await expect(new UserProfileService(env).read(7)).resolves.toBeNull();
  });
});

describe("UserProfileService.setPlatformUsername", () => {
  it("невалідне ім'я не доходить до бази", async () => {
    const { env, updates } = createEnv({ user_id: 42 });

    const result = await new UserProfileService(env).setPlatformUsername(42, "admin");

    expect(result).toMatchObject({ ok: false, code: "invalid" });
    expect(updates).toHaveLength(0);
  });

  it("зберігає ім'я канонічно: `@Serhii` і `serhii` — одне й те саме", async () => {
    const { env, updates } = createEnv({ user_id: 42 });

    const result = await new UserProfileService(env).setPlatformUsername(42, "  @Serhii ");

    expect(result).toEqual({ ok: true, platformUsername: "serhii" });
    expect(updates).toHaveLength(1);
    expect(updates[0].values[0]).toBe("serhii");
    expect(updates[0].values.at(-1)).toBe(42);
  });

  it("⛔ не забирає ім'я, зайняте іншим користувачем", async () => {
    const { env, updates } = createEnv({ user_id: 42 }, 99);

    const result = await new UserProfileService(env).setPlatformUsername(42, "olya");

    expect(result).toMatchObject({ ok: false, code: "taken" });
    expect(updates).toHaveLength(0);
  });

  it("те саме ім'я вдруге — не конфлікт: це його власне ім'я", async () => {
    const { env } = createEnv({ user_id: 42 }, 42);

    await expect(new UserProfileService(env).setPlatformUsername(42, "olya")).resolves.toEqual({
      ok: true,
      platformUsername: "olya",
    });
  });

  it("помилка бази — це причина для UI, а не 500-та з порожнім текстом", async () => {
    const { env } = createEnv({ user_id: 42 });
    (env.DB as unknown as { prepare: () => never }).prepare = () => {
      throw new Error("D1 unavailable");
    };

    const result = await new UserProfileService(env).setPlatformUsername(42, "olya");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("db");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});
