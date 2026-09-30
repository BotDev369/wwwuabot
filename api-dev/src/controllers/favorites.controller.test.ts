import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { handleFavorites } from "./favorites.controller";
import { resolveFavorite } from "../services/favorites.service";
import { favoriteTarget } from "@wwwuabot/shared/favorites";

const mocks = vi.hoisted(() => ({ identity: vi.fn(), publicProfile: vi.fn() }));
vi.mock("../shared/identity", () => ({ resolveUserId: mocks.identity }));
vi.mock("../services/public-profile.service", () => ({
  PublicProfileService: class {
    readPublic = mocks.publicProfile;
  },
}));

function database(row: unknown = null, rows: unknown[] = []) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const call = { sql, values: [] as unknown[] };
      calls.push(call);
      const statement = {
        bind(...values: unknown[]) {
          call.values = values;
          return statement;
        },
        first: async () => row,
        all: async () => ({ results: sql.startsWith("PRAGMA") ? [] : rows }),
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };
  return { calls, env: { DB: db } as unknown as Env };
}
function request(method: string, body?: unknown) {
  return new Request("https://example.com/api/favorites", {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.mockResolvedValue({ ok: true, userId: 777 });
  mocks.publicProfile.mockResolvedValue(null);
});

describe("особисте обране", () => {
  it("без авторизації не читає й не пише базу", async () => {
    mocks.identity.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    const db = database();
    expect((await handleFavorites(request("GET"), db.env)).status).toBe(401);
    expect(db.calls).toHaveLength(0);
  });
  it("зняття лайка обмежене користувачем із підпису, не власником у тілі", async () => {
    const db = database();
    const response = await handleFavorites(
      request("DELETE", { kind: "page", targetId: 5, owner_id: 999 }),
      db.env,
    );
    expect(response.status).toBe(200);
    const remove = db.calls.find((call) => call.sql.startsWith("DELETE"));
    expect(remove?.sql).toContain("WHERE owner_id = ? AND kind = ? AND target_id = ?");
    expect(remove?.values).toEqual(["777", "page", 5]);
  });
  it("закритий профіль не можна лайкнути й отримати його назву", async () => {
    const db = database();
    const response = await handleFavorites(request("POST", { kind: "user", targetId: 5 }), db.env);
    expect(response.status).toBe(404);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });
  it("повторний лайк не створює дублів і не записує клієнтський текст", async () => {
    mocks.publicProfile.mockResolvedValue({ id: 5, platformUsername: "friend" });
    const db = database();
    const response = await handleFavorites(
      request("POST", { kind: "user", targetId: 5, title: "fake" }),
      db.env,
    );
    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT"));
    expect(insert?.sql).toContain("INSERT OR IGNORE");
    expect(insert?.values.slice(0, 3)).toEqual(["777", "user", 5]);
    expect(insert?.values).not.toContain("fake");
  });
  it("недоступний контент лишається без старої назви чи адреси", async () => {
    const db = database(null, [{ kind: "user", target_id: 5 }]);
    const response = await handleFavorites(request("GET"), db.env);
    expect(await response.json()).toEqual({
      ok: true,
      items: [{ kind: "user", targetId: 5, title: "Контент недоступний", href: null }],
    });
  });
  it("видимість сторінки перевіряється в SQL до повернення метаданих", async () => {
    const db = database();
    expect(await resolveFavorite(db.env, 777, { kind: "page", targetId: 5 })).toBeNull();
    const select = db.calls.find((call) => call.sql.includes("FROM scenarios"));
    expect(select?.sql).toContain("is_active = 1");
    expect(select?.sql).toContain("COALESCE(is_public, 0) = 1");
    expect(select?.sql).toContain("owner_id = ?");
    expect(select?.values).toEqual([5, "777", "%777%"]);
  });
  it("частковий збіг адмінського id не відкриває приватну сторінку", async () => {
    const db = database({
      id: 5,
      slug: "private",
      title: "Secret",
      owner_id: "8",
      admin_ids: "[1777]",
      is_public: 0,
    });
    expect(await resolveFavorite(db.env, 777, { kind: "page", targetId: 5 })).toBeNull();
  });
  it("власна приватна сторінка веде у власний перегляд", async () => {
    const db = database({ id: 5, slug: "private", title: "Own", owner_id: "777", admin_ids: null });
    expect((await resolveFavorite(db.env, 777, { kind: "page", targetId: 5 }))?.href).toBe(
      "/pages/5",
    );
  });
  it("невідомі види, рядкові та нецілі ідентифікатори відкидаються", () => {
    for (const value of [
      null,
      { kind: "unknown", targetId: 1 },
      { kind: "page", targetId: "5" },
      { kind: "page", targetId: 1.5 },
      { kind: "page", targetId: -1 },
    ]) {
      expect(favoriteTarget(value)).toBeNull();
    }
  });
});
