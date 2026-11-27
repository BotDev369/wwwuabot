/**
 * Шляхи проєктів через справжній роутер — гейт, адмін-сесія, створення.
 *
 * Перевіряємо межу, а не формальність: `/api/user/tenant` без підпису — 401,
 * адмін-список без cookie — 401, а створення не приймає ні кривий ключ, ні
 * зайнятий.
 *
 * @module api-dev/src/routes/tenants.test
 */

import { describe, expect, it } from "vitest";
import { handleRequest } from "../router";
import { matchTenantsRoute } from "./tenants";
import { ADMIN_COOKIE_NAME, signSessionToken } from "@wwwuabot/shared/security/session";
import type { Env } from "../shared/types";

const ADMIN_SECRET = "test-admin-secret";
const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

type Row = { id: number; key: string; name: string; status: string };

interface State {
  tenants: Row[];
  members: Array<{ tenant_id: number; user_id: number }>;
}

const MAIN: Row = { id: 1, key: "main", name: "Свої", status: "active" };
const SHOP: Row = { id: 2, key: "shop-a", name: "Магазин", status: "active" };

/** D1 у пам'яті: ті запити, які роблять резолвер, сервіс і гейт допуску. */
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
          if (/inviter_id/.test(sql)) return { user_id: args[0], inviter_id: 7 };
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
        all: async () => {
          if (/AS members/.test(sql)) {
            return {
              results: state.tenants.map((tenant) => ({
                ...tenant,
                members: state.members.filter((member) => member.tenant_id === tenant.id).length,
              })),
            };
          }
          if (/JOIN tenant_members/.test(sql)) {
            const userId = args[0] as number;
            const ids = new Set(
              state.members.filter((member) => member.user_id === userId).map((m) => m.tenant_id),
            );
            return { results: state.tenants.filter((tenant) => ids.has(tenant.id)) };
          }
          return { results: [] };
        },
        run: async () => {
          if (/INSERT INTO tenants/.test(sql)) {
            const [key, name] = args as string[];
            state.tenants.push({ id: state.tenants.length + 1, key, name, status: "active" });
          }
          return { meta: { changes: 1 } };
        },
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
    ADMIN_SECRET,
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

async function makeInitData(userId: number, startParam: string): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
    start_param: startParam,
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
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Request {
  return new Request(`https://api.example.com${path}`, {
    method: init.method ?? "GET",
    headers: new Headers({ "Content-Type": "application/json", ...init.headers }),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

async function adminCookie(): Promise<string> {
  return `${ADMIN_COOKIE_NAME}=${await signSessionToken(
    `admin:${Date.now() + 60_000}`,
    ADMIN_SECRET,
  )}`;
}

describe("шляхи проєктів", () => {
  it("чужий шлях — не наш", () => {
    const env = makeEnv({ tenants: [MAIN], members: [] });
    expect(matchTenantsRoute(request("/api/other"), env, "/api/other")).toBeNull();
  });

  it("член проєкту бачить його як поточний", async () => {
    const env = makeEnv({
      tenants: [MAIN, SHOP],
      members: [{ tenant_id: SHOP.id, user_id: 42 }],
    });

    const res = await handleRequest(
      request("/api/user/tenant", {
        headers: { "X-Telegram-Init-Data": await makeInitData(42, "p_shop-a") },
      }),
      env,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      tenant: { id: 2, key: "shop-a", name: "Магазин" },
      source: "start",
    });
  });

  it("⛔ без підпису поточний проєкт не віддається", async () => {
    const res = await handleRequest(
      request("/api/user/tenant"),
      makeEnv({ tenants: [MAIN], members: [] }),
    );
    expect(res.status).toBe(401);
  });

  it("⛔ список проєктів закритий без адмін-сесії", async () => {
    const res = await handleRequest(
      request("/api/admin/tenants"),
      makeEnv({ tenants: [MAIN], members: [] }),
    );
    expect(res.status).toBe(401);
  });

  it("адмін бачить список із кількістю членів", async () => {
    const env = makeEnv({
      tenants: [MAIN, SHOP],
      members: [{ tenant_id: SHOP.id, user_id: 42 }],
    });

    const res = await handleRequest(
      request("/api/admin/tenants", { headers: { Cookie: await adminCookie() } }),
      env,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { tenants: Array<{ key: string; members: number }> };
    expect(body.tenants.map((tenant) => tenant.key)).toEqual(["main", "shop-a"]);
    expect(body.tenants[1].members).toBe(1);
  });

  it("адмін заводить проєкт — 201 і рядок у базі", async () => {
    const state: State = { tenants: [MAIN], members: [] };
    const env = makeEnv(state);

    const res = await handleRequest(
      request("/api/admin/tenants", {
        method: "POST",
        headers: { Cookie: await adminCookie() },
        body: { key: "new-shop", name: "Новий" },
      }),
      env,
    );

    expect(res.status).toBe(201);
    expect(state.tenants.map((tenant) => tenant.key)).toContain("new-shop");
  });

  it("⛔ кривий ключ — 400, зайнятий — 409", async () => {
    const env = makeEnv({ tenants: [MAIN, SHOP], members: [] });
    const cookie = await adminCookie();

    const invalid = await handleRequest(
      request("/api/admin/tenants", {
        method: "POST",
        headers: { Cookie: cookie },
        body: { key: "Магазин!", name: "Кривий" },
      }),
      env,
    );
    expect(invalid.status).toBe(400);

    const taken = await handleRequest(
      request("/api/admin/tenants", {
        method: "POST",
        headers: { Cookie: cookie },
        body: { key: "shop-a", name: "Другий" },
      }),
      env,
    );
    expect(taken.status).toBe(409);
  });

  it("⛔ порожнє тіло не створює проєкт", async () => {
    const res = await handleRequest(
      request("/api/admin/tenants", {
        method: "POST",
        headers: { Cookie: await adminCookie() },
        body: {},
      }),
      makeEnv({ tenants: [MAIN], members: [] }),
    );
    expect(res.status).toBe(400);
  });
});
