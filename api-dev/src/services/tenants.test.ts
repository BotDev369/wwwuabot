/**
 * Сервіс проєктів — тести того, що легко зробити «майже правильно»: головний
 * проєкт заводиться рівно раз, а ключ нормалізується як у deep link.
 *
 * @module api-dev/src/services/tenants.test
 */

import { describe, expect, it } from "vitest";
import {
  createTenant,
  ensureDefaultTenant,
  isTenantMember,
  listTenants,
  listUserTenants,
  readTenantByKey,
} from "./tenants.service";

type Row = { id: number; key: string; name: string; status: string };

interface State {
  tenants: Row[];
  members: Array<{ tenant_id: number; user_id: number }>;
}

/** D1 у пам'яті: рівно ті запити, які робить сервіс. */
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
          if (/FROM tenants WHERE key/.test(sql)) {
            return state.tenants.find((tenant) => tenant.key === args[0]) ?? null;
          }
          if (/FROM tenants WHERE id/.test(sql)) {
            return state.tenants.find((tenant) => tenant.id === args[0]) ?? null;
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
          if (/JOIN tenant_members/.test(sql)) {
            const userId = args[0] as number;
            const ids = new Set(
              state.members.filter((member) => member.user_id === userId).map((m) => m.tenant_id),
            );
            return { results: state.tenants.filter((tenant) => ids.has(tenant.id)) };
          }
          return { results: state.tenants };
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

describe("головний проєкт", () => {
  it("створюється при першому зверненні й більше не дублюється", async () => {
    const state: State = { tenants: [], members: [] };
    const db = fakeDb(state);

    const first = await ensureDefaultTenant(db);
    const second = await ensureDefaultTenant(db);

    expect(first).toBe(second);
    expect(state.tenants).toHaveLength(1);
    expect(state.tenants[0].key).toBe("main");
  });
});

describe("заведення проєкту", () => {
  it("нормалізує ключ і зберігає назву", async () => {
    const state: State = { tenants: [], members: [] };
    const db = fakeDb(state);

    const result = await createTenant(db, " Shop-A ", "Магазин");

    expect(result.ok).toBe(true);
    expect(result.ok && result.tenant.key).toBe("shop-a");
    expect(await readTenantByKey(db, "shop-a")).toMatchObject({ name: "Магазин" });
  });

  it("порожня назва замінюється ключем", async () => {
    const state: State = { tenants: [], members: [] };
    const result = await createTenant(fakeDb(state), "shop", "   ");

    expect(result.ok && result.tenant.name).toBe("shop");
  });

  it("⛔ непридатний ключ не створює рядок", async () => {
    const state: State = { tenants: [], members: [] };
    const result = await createTenant(fakeDb(state), "Магазин!", "Магазин");

    expect(result).toEqual({ ok: false, reason: "invalid-key" });
    expect(state.tenants).toHaveLength(0);
  });

  it("⛔ зайнятий ключ не створює другий рядок", async () => {
    const state: State = {
      tenants: [{ id: 1, key: "shop", name: "Старий", status: "active" }],
      members: [],
    };
    const result = await createTenant(fakeDb(state), "shop", "Новий");

    expect(result).toEqual({ ok: false, reason: "exists" });
    expect(state.tenants).toHaveLength(1);
  });
});

describe("списки й членство", () => {
  it("список проєктів заводить головний, якщо його немає", async () => {
    const state: State = { tenants: [], members: [] };
    const tenants = await listTenants(fakeDb(state));

    expect(tenants.map((tenant) => tenant.key)).toContain("main");
  });

  it("список людини — лише явні членства", async () => {
    const state: State = {
      tenants: [
        { id: 1, key: "main", name: "Свої", status: "active" },
        { id: 2, key: "shop", name: "Магазин", status: "active" },
      ],
      members: [{ tenant_id: 2, user_id: 42 }],
    };

    const tenants = await listUserTenants(fakeDb(state), 42);

    expect(tenants.map((tenant) => tenant.key)).toEqual(["shop"]);
  });

  it("членство читається за парою, а не за однією стороною", async () => {
    const state: State = {
      tenants: [{ id: 1, key: "main", name: "Свої", status: "active" }],
      members: [{ tenant_id: 2, user_id: 42 }],
    };
    const db = fakeDb(state);

    expect(await isTenantMember(db, 2, 42)).toBe(true);
    expect(await isTenantMember(db, 2, 7)).toBe(false);
    expect(await isTenantMember(db, 1, 42)).toBe(false);
  });
});
