/**
 * Проєкт у боті: вибір deep-link'ом, збереження між апдейтами й повернення в
 * `main`, коли членство відкликали або проєкт зник.
 *
 * @module bot-dev/src/shared/tenant-context.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "./types/env";
import { pickTenant, tenantForUser } from "./tenant-context";

const MAIN = { id: 1, key: "main", name: "Головний", status: "active" };
const SHOP = { id: 2, key: "shop-a", name: "Магазин", status: "active" };

interface State {
  stored: Map<number, number>;
  members: Array<{ tenant_id: number; user_id: number }>;
}

function fakeEnv(state: State): { env: Env; writes: Array<{ sql: string; args: unknown[] }> } {
  const writes: Array<{ sql: string; args: unknown[] }> = [];
  const db = {
    prepare(sql: string) {
      let args: unknown[] = [];
      const statement = {
        bind(...bound: unknown[]) {
          args = bound;
          return statement;
        },
        first: async () => {
          if (/PRAGMA table_info/i.test(sql)) return null;
          if (/FROM tenants WHERE key/.test(sql)) {
            return [MAIN, SHOP].find((tenant) => tenant.key === args[0]) ?? null;
          }
          if (/FROM tenants WHERE id/.test(sql)) {
            return [MAIN, SHOP].find((tenant) => tenant.id === args[0]) ?? null;
          }
          if (/FROM tenant_members/.test(sql)) {
            const [tenantId, userId] = args as number[];
            return state.members.some((m) => m.tenant_id === tenantId && m.user_id === userId)
              ? { present: 1 }
              : null;
          }
          if (/SELECT tenant_id FROM users/.test(sql)) {
            const stored = state.stored.get(args[0] as number);
            return stored === undefined ? { tenant_id: null } : { tenant_id: stored };
          }
          return null;
        },
        all: async () => ({
          results: /PRAGMA/i.test(sql)
            ? ["user_id", "tenant_id", "first_name"].map((name) => ({ name }))
            : [],
        }),
        run: async () => {
          writes.push({ sql, args });
          if (/UPDATE users SET tenant_id/.test(sql)) {
            state.stored.set(args[1] as number, args[0] as number);
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
  return { env: { DB: db } as unknown as Env, writes };
}

const fresh = (): State => ({ stored: new Map(), members: [{ tenant_id: SHOP.id, user_id: 42 }] });

describe("tenantForUser", () => {
  it("без збереженого вибору — головний проєкт", async () => {
    const { env } = fakeEnv(fresh());
    expect((await tenantForUser(env, 42)).key).toBe("main");
  });

  it("збережений проєкт діє для наступних апдейтів", async () => {
    const state = fresh();
    state.stored.set(42, SHOP.id);
    const { env } = fakeEnv(state);

    expect((await tenantForUser(env, 42)).key).toBe("shop-a");
  });

  it("⛔ відкликане членство повертає в головний, а не ламає апдейт", async () => {
    const state = fresh();
    state.stored.set(42, SHOP.id);
    state.members = [];
    const { env } = fakeEnv(state);

    expect((await tenantForUser(env, 42)).key).toBe("main");
  });
});

describe("pickTenant", () => {
  it("член проєкту відкриває його за `p_<key>`", async () => {
    const { env } = fakeEnv(fresh());
    const picked = await pickTenant(env, 42, "p_shop-a");

    expect(picked?.ok && picked.tenant.key).toBe("shop-a");
  });

  it("⛔ не член — відмова, а не чужий простір", async () => {
    const { env } = fakeEnv(fresh());
    const picked = await pickTenant(env, 43, "p_shop-a");

    expect(picked?.ok).toBe(false);
    expect(picked && !picked.ok && picked.reason).toBe("forbidden");
  });

  it("⛔ невідомий ключ відрізняється від чужого", async () => {
    const { env } = fakeEnv(fresh());
    const picked = await pickTenant(env, 42, "p_ghost");

    expect(picked && !picked.ok && picked.reason).toBe("unknown");
  });

  it("`p_main` повертає в головний без членства", async () => {
    const { env } = fakeEnv(fresh());
    const picked = await pickTenant(env, 43, "p_main");

    expect(picked?.ok && picked.tenant.key).toBe("main");
  });

  it("payload'и бота не стають проєктом", async () => {
    const { env } = fakeEnv(fresh());
    for (const payload of ["inv-8f3k2q", "mydate_19800303_today", "/start", ""]) {
      expect(await pickTenant(env, 42, payload), payload).toBeNull();
    }
  });
});
