/**
 * Резолвер проєкту — тести межі доступу: чужий `p_<key>` дає відмову, а не
 * тихий відкат на головний, а payload'и бота (`inv-…`) ключем не стають.
 *
 * @module api-dev/src/shared/tenant.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "./types";
import { resolveTenant } from "./tenant";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

const MAIN = { id: 1, key: "main", name: "Свої", status: "active" };
const SHOP = { id: 2, key: "shop-a", name: "Магазин", status: "active" };

interface State {
  tenants: Array<typeof MAIN>;
  members: Array<{ tenant_id: number; user_id: number }>;
}

/** D1, який відповідає на ті запити, які робить резолвер і сервіс проєктів. */
function fakeDb(state: State): D1Database {
  return {
    prepare(sql: string) {
      let args: unknown[] = [];
      const statement = {
        bind(...bound: unknown[]) {
          args = bound;
          return statement;
        },
        first: async () => {
          if (/SELECT id FROM tenants/.test(sql)) {
            return state.tenants.find((tenant) => tenant.key === args[0]) ?? null;
          }
          if (/FROM tenants WHERE id/.test(sql)) {
            return state.tenants.find((tenant) => tenant.id === args[0]) ?? null;
          }
          if (/FROM tenants WHERE key/.test(sql)) {
            return state.tenants.find((tenant) => tenant.key === args[0]) ?? null;
          }
          if (/FROM tenant_members/.test(sql)) {
            const [tenantId, userId] = args as number[];
            return state.members.some(
              (member) => member.tenant_id === tenantId && member.user_id === userId,
            )
              ? { present: 1 }
              : null;
          }
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1 } }),
      } as unknown as D1PreparedStatement;
      return statement;
    },
  } as unknown as D1Database;
}

function makeEnv(state: State): Env {
  return {
    DB: fakeDb(state),
    CONTENT_KV: {
      get: async () => null,
      put: async () => undefined,
      delete: async () => undefined,
    } as unknown as KVNamespace,
    BOT_TOKEN,
  } as unknown as Env;
}

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

/** Підписаний `initData` — як від Telegram, із `start_param` за потреби. */
async function makeInitData(userId: number, startParam?: string): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  if (startParam) params.set("start_param", startParam);

  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

function request(initData?: string): Request {
  const headers = new Headers();
  if (initData) headers.set("X-Telegram-Init-Data", initData);
  return new Request("https://api.example.com/api/user/tenant", { headers });
}

describe("резолвер проєкту", () => {
  it("без ключа віддає головний проєкт", async () => {
    const result = await resolveTenant(
      request(await makeInitData(42)),
      makeEnv({ tenants: [MAIN], members: [] }),
    );

    expect(result.ok && result.tenant.key).toBe("main");
    expect(result.ok && result.tenant.source).toBe("default");
  });

  it("ключ головного проєкту не вимагає членства", async () => {
    const result = await resolveTenant(
      request(await makeInitData(42, "p_main")),
      makeEnv({ tenants: [MAIN], members: [] }),
    );

    expect(result.ok && result.tenant.id).toBe(1);
  });

  it("член проєкту відкриває його за ключем", async () => {
    const result = await resolveTenant(
      request(await makeInitData(42, "p_shop-a")),
      makeEnv({
        tenants: [MAIN, SHOP],
        members: [{ tenant_id: SHOP.id, user_id: 42 }],
      }),
    );

    expect(result.ok && result.tenant.key).toBe("shop-a");
    expect(result.ok && result.tenant.source).toBe("start");
  });

  it("⛔ не член проєкту отримує 403, а не головний", async () => {
    const result = await resolveTenant(
      request(await makeInitData(42, "p_shop-a")),
      makeEnv({ tenants: [MAIN, SHOP], members: [] }),
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(403);
  });

  it("⛔ невідомий ключ — 404, а не тихий відкат", async () => {
    const result = await resolveTenant(
      request(await makeInitData(42, "p_ghost")),
      makeEnv({ tenants: [MAIN], members: [] }),
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.response.status).toBe(404);
  });

  it("payload'и бота не стають ключем проєкту", async () => {
    for (const startParam of ["inv-8f3k2q", "mydate_19800303_today"]) {
      const result = await resolveTenant(
        request(await makeInitData(42, startParam)),
        makeEnv({ tenants: [MAIN, SHOP], members: [] }),
      );
      expect(result.ok && result.tenant.key, startParam).toBe("main");
    }
  });

  it("⛔ без підпису явний ключ не відкривається", async () => {
    const result = await resolveTenant(request(), makeEnv({ tenants: [MAIN, SHOP], members: [] }));

    expect(result.ok && result.tenant.key).toBe("main");
  });
});
