import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { handleEventList, handleEventSummary } from "./events.controller";
import {
  recordPlatformRequest,
  readEventSummary,
  readEvents,
} from "../services/user-events.service";

const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("../shared/identity", () => ({ tryResolveUserId: mocks.identity }));

interface FakeRows {
  total?: number;
  surfaces?: unknown[];
  users?: unknown[];
  events?: unknown[];
}

function database(data: FakeRows = {}) {
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
        first: async () => ({ total: data.total ?? 0 }),
        all: async () => {
          if (sql.startsWith("PRAGMA")) return { results: [] };
          if (sql.includes("GROUP BY surface")) return { results: data.surfaces ?? [] };
          if (sql.includes("GROUP BY e.user_id")) return { results: data.users ?? [] };
          return { results: data.events ?? [] };
        },
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };
  return { calls, env: { DB: db } as unknown as Env };
}

const RANGE = "from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.mockResolvedValue(777);
});

describe("журнал дій платформи", () => {
  it("пише метод і шлях, а query не пише", async () => {
    const db = database();
    await recordPlatformRequest(
      new Request("https://example.com/api/favorites?kind=page"),
      db.env,
      200,
    );

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert).toBeDefined();
    expect(insert?.values.slice(0, 6)).toEqual([
      777,
      "platform",
      "request",
      "GET /api/favorites",
      null,
      "ok",
    ]);
  });

  it("час події береться з моменту запиту й пише мілісекунди", async () => {
    const db = database();
    const at = Date.UTC(2026, 8, 22, 22, 13, 20, 123);

    await recordPlatformRequest(new Request("https://example.com/api/favorites"), db.env, 200, at);

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    // Секунди — занадто груба сітка: два дотики в одну секунду мінялися б місцями.
    expect(insert?.values[6]).toBe("2026-09-22 22:13:20.123");
  });

  it("⛔ адмінка, бот і портал у журнал людей не потрапляють", async () => {
    const db = database();
    await recordPlatformRequest(
      new Request("https://example.com/api/admin/users/list"),
      db.env,
      200,
    );

    expect(mocks.identity).not.toHaveBeenCalled();
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("без підписаної людини запису немає", async () => {
    mocks.identity.mockResolvedValue(null);
    const db = database();
    await recordPlatformRequest(new Request("https://example.com/api/favorites"), db.env, 200);

    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("помилка запису не валить запит людини", async () => {
    const env = {
      DB: {
        prepare() {
          throw new Error("D1 недоступна");
        },
      },
    } as unknown as Env;

    await expect(
      recordPlatformRequest(new Request("https://example.com/api/favorites"), env, 200),
    ).resolves.toBeUndefined();
  });

  it("невдала відповідь лишається подією зі статусом error", async () => {
    const db = database();
    await recordPlatformRequest(new Request("https://example.com/api/favorites"), db.env, 500);

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    expect(insert?.values[5]).toBe("error");
  });
});

describe("читання журналу", () => {
  const range = { from: "2026-10-01 00:00:00", to: "2026-10-02 00:00:00" };

  it("зведення рахує поверхні й бере імена з рядка users", async () => {
    const db = database({
      total: 3,
      surfaces: [
        { surface: "bot", count: 2 },
        { surface: "platform", count: 1 },
      ],
      users: [
        {
          user_id: 7,
          count: 3,
          last_at: "2026-10-01 12:00:00",
          first_name: "Сергій",
          last_name: "Дискант",
          username: "DiskantSergiy",
        },
      ],
    });

    const summary = await readEventSummary(db.env, range);

    expect(summary).toEqual({
      ...range,
      total: 3,
      bySurface: { bot: 2, platform: 1 },
      users: [
        {
          userId: 7,
          firstName: "Сергій",
          lastName: "Дискант",
          username: "DiskantSergiy",
          count: 3,
          lastAt: "2026-10-01 12:00:00",
        },
      ],
    });
    const summarySql = db.calls.find((call) => call.sql.includes("GROUP BY e.user_id"));
    expect(summarySql?.sql).toContain("LEFT JOIN users");
  });

  it("список однієї людини звужений у SQL, а не в памʼяті", async () => {
    const db = database({
      events: [
        {
          id: 1,
          user_id: 7,
          surface: "bot",
          kind: "command",
          action: "/start",
          details: null,
          status: "ok",
          created_at: "2026-10-01 12:00:00",
          first_name: "Сергій",
          last_name: null,
          username: null,
        },
      ],
    });

    const list = await readEvents(db.env, range, { userId: 7, limit: 100, offset: 0 });

    const select = db.calls.find((call) => call.sql.includes("FROM user_events e"));
    expect(select?.sql).toContain("e.user_id = ?");
    // Порядок — за часом дії, а не за номером запису: записи йдуть у `waitUntil`.
    expect(select?.sql).toContain("ORDER BY e.created_at DESC, e.id DESC");
    expect(select?.values).toEqual([range.from, range.to, 7, 100, 0]);
    expect(list.items[0]).toMatchObject({ userId: 7, action: "/start", firstName: "Сергій" });
  });

  it("контролер віддає зведення й список, а сміттєвий userId — 400", async () => {
    const db = database({ total: 0 });

    const summary = await handleEventSummary(
      new Request(`https://example.com/api/admin/events/summary?${RANGE}`),
      db.env,
    );
    expect(summary.status).toBe(200);
    expect(await summary.json()).toMatchObject({ total: 0, bySurface: { bot: 0, platform: 0 } });

    const list = await handleEventList(
      new Request(`https://example.com/api/admin/events?${RANGE}&userId=7&limit=999&offset=-5`),
      db.env,
    );
    expect(list.status).toBe(200);

    const beforeBad = db.calls.length;
    const bad = await handleEventList(
      new Request("https://example.com/api/admin/events?userId=abc"),
      db.env,
    );
    expect(bad.status).toBe(400);
    expect(db.calls).toHaveLength(beforeBad);
  });

  it("limit обмежений зверху, а offset не буває відʼємним", async () => {
    const db = database();
    await handleEventList(
      new Request(`https://example.com/api/admin/events?${RANGE}&limit=999&offset=-5`),
      db.env,
    );

    const select = db.calls.find((call) => call.sql.includes("FROM user_events e"));
    expect(select?.values.slice(-2)).toEqual([200, 0]);
  });

  it("помилка бази — 500 із причиною без деталей D1", async () => {
    const env = {
      DB: {
        prepare() {
          throw new Error("no such table");
        },
      },
    } as unknown as Env;

    const response = await handleEventSummary(new Request("https://example.com/x"), env);
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain("no such table");
  });
});
