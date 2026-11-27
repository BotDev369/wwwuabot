/**
 * `/start p_<key>` наскрізно: справжній резолвер проєкту й справжній роутер.
 *
 * @module bot-dev/src/core/router/bot-router.tenant.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppContext } from "../../shared/types/env";

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  render: vi.fn(),
  denied: vi.fn(),
  deleteIncoming: vi.fn(),
}));

vi.mock("../../repositories/scenario.repository", () => ({
  ScenarioRepository: class {
    findByLookup = mocks.find;
  },
}));
vi.mock("../../shared/utils/scenario-screen", () => ({ renderScenario: mocks.render }));
vi.mock("@wwwuabot/shared/security/access", () => ({ hasAccess: () => true }));
vi.mock("../../modules/access/denied", () => ({ showAccessDenied: mocks.denied }));
vi.mock("../../modules/contacts/invite-screen", () => ({ showInviteScreen: async () => true }));
vi.mock("../../modules/contacts/contact-link", () => ({
  applyContactPayload: async () => ({ kind: "unknown" }),
}));
vi.mock("../../modules/access/contact/reply", () => ({ handleContactFlow: async () => false }));
vi.mock("../../modules/access/contact/panel", () => ({ handleContactCallback: async () => false }));
vi.mock("../../shared/utils/message", () => ({ deleteIncomingMessage: mocks.deleteIncoming }));
vi.mock("../../modules/search/words.handler", () => ({ handleWords: async () => true }));
vi.mock("../../modules/search/cart.handler", () => ({ handleCartCallback: async () => true }));

const { botRouter } = await import("./bot-router");

const MAIN = { id: 1, key: "main", name: "Головний", status: "active" };
const SHOP = { id: 2, key: "shop-a", name: "Магазин", status: "active" };
const TENANTS = [MAIN, SHOP];

interface State {
  stored: Map<number, number>;
  users: Set<number>;
}

/** D1 для резолвера проєкту: проєкти, членство й `users.tenant_id`. */
function fakeEnv(state: State): {
  env: AppContext["env"];
  writes: Array<{ sql: string; args: unknown[] }>;
} {
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
          if (/FROM tenants WHERE key/.test(sql)) {
            return TENANTS.find((tenant) => tenant.key === args[0]) ?? null;
          }
          if (/FROM tenants WHERE id/.test(sql)) {
            return TENANTS.find((tenant) => tenant.id === args[0]) ?? null;
          }
          if (/FROM tenant_members/.test(sql)) {
            const [tenantId, userId] = args as number[];
            return tenantId === SHOP.id && userId === 42 ? { present: 1 } : null;
          }
          if (/SELECT tenant_id FROM users/.test(sql)) {
            const stored = state.stored.get(args[0] as number);
            return stored === undefined ? { tenant_id: null } : { tenant_id: stored };
          }
          return null;
        },
        all: async () => ({
          results: /PRAGMA/i.test(sql)
            ? ["user_id", "tenant_id", "created_at", "first_name"].map((name) => ({ name }))
            : [],
        }),
        run: async () => {
          writes.push({ sql, args });
          if (/INSERT INTO users/.test(sql) || /UPDATE users SET tenant_id/.test(sql)) {
            state.stored.set(args[0] as number, args[1] as number);
            state.users.add(args[0] as number);
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  } as unknown as D1Database;
  return {
    env: { DB: db, ADMIN_TELEGRAM_ID: "1", BOT_TOKEN: "t" } as unknown as AppContext["env"],
    writes,
  };
}

function context(env: AppContext["env"], userId: number, text: string): AppContext {
  return {
    env,
    user: { user_id: userId },
    message: { text, message_id: 3 },
  } as unknown as AppContext;
}

const fresh = (): State => ({ stored: new Map(), users: new Set([42, 1]) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.find.mockResolvedValue({ id: 5, lookup: "/start", kind: "widget" });
  mocks.render.mockResolvedValue(true);
  mocks.denied.mockResolvedValue(true);
});

describe("botRouter і проєкт", () => {
  it("`/start p_shop-a` показує екран проєкту й запам'ятовує його", async () => {
    const state = fresh();
    const { env, writes } = fakeEnv(state);

    await botRouter(context(env, 42, "/start p_shop-a"));

    // Екран шукається в проєкті 2, а не за адресою `p_shop-a`.
    expect(mocks.find).toHaveBeenCalledWith("/start", SHOP.id);
    expect(mocks.render).toHaveBeenCalled();
    // Вибір записано — саме він діє для наступних апдейтів.
    const saved = writes.find((write) => /INSERT INTO users/.test(write.sql));
    expect(saved?.args).toEqual([42, SHOP.id]);
    expect(state.stored.get(42)).toBe(SHOP.id);
  });

  it("наступний `/start` без payload лишається в обраному проєкті", async () => {
    const state = fresh();
    state.stored.set(42, SHOP.id);
    const { env } = fakeEnv(state);

    await botRouter(context(env, 42, "/start"));

    expect(mocks.find).toHaveBeenCalledWith("/start", SHOP.id);
  });

  it("`p_main` повертає в головний проєкт", async () => {
    const state = fresh();
    state.stored.set(42, SHOP.id);
    const { env } = fakeEnv(state);

    await botRouter(context(env, 42, "/start p_main"));

    expect(mocks.find).toHaveBeenCalledWith("/start", MAIN.id);
    expect(state.stored.get(42)).toBe(MAIN.id);
  });

  it("⛔ не член проєкту не бачить його екрана", async () => {
    const state = fresh();
    const { env, writes } = fakeEnv(state);

    await botRouter(context(env, 43, "/start p_shop-a"));

    expect(mocks.denied).toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
    expect(writes.some((write) => /INSERT INTO users/.test(write.sql))).toBe(false);
  });

  it("власник платформи входить у будь-який проєкт без членства", async () => {
    const state = fresh();
    const { env } = fakeEnv(state);

    await botRouter(context(env, 1, "/start p_shop-a"));

    expect(mocks.find).toHaveBeenCalledWith("/start", SHOP.id);
    expect(mocks.denied).not.toHaveBeenCalled();
  });
});
