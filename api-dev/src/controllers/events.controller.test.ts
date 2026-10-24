import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import {
  handleEventCleanup,
  handleEventList,
  handleEventSettingsRead,
  handleEventSettingsWrite,
  handleEventSummary,
} from "./events.controller";
import {
  recordPlatformAction,
  recordPlatformView,
  readEventSummary,
  readEvents,
} from "../services/user-events.service";

const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("../shared/identity", () => ({ tryResolveUserId: mocks.identity }));

interface FakeRows {
  total?: number;
  /** Значення `settings.event_log_full` — сквозна деталізація. */
  full?: number;
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
        first: async () => ({ total: data.total ?? 0, full: data.full ?? 1 }),
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
  it("зміна стану пише метод і шлях", async () => {
    const db = database();
    await recordPlatformAction(
      new Request("https://example.com/api/user/trackers?day=2026-10-24", { method: "POST" }),
      db.env,
      200,
    );

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    // Query не пишеться: поведінку описує дія, а не те, що людина шукала.
    expect(insert?.values.slice(0, 6)).toEqual([
      777,
      "platform",
      "request",
      "POST /api/user/trackers",
      null,
      "ok",
    ]);
  });

  it("читання не пише нічого — це система, а не людина", async () => {
    const db = database();
    // Екран «Трекери» тягне три списки: жоден не стає подією.
    for (const path of [
      "/api/user/trackers",
      "/api/user/trackers/templates",
      "/api/user/trackers/public",
      "/api/messages/badge",
    ]) {
      await recordPlatformAction(new Request(`https://example.com${path}`), db.env, 200);
    }

    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
    expect(mocks.identity).not.toHaveBeenCalled();
  });

  it("відкрита сторінка — окрема подія з назвою з шапки", async () => {
    const db = database();
    const at = Date.UTC(2026, 9, 24, 12, 17, 25);

    await recordPlatformView(db.env, 777, "trackers", "Трекери", at);

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    // Подробиць немає: назва екрана вже каже, що відкрили, а «сторінка» поруч
    // була б другим словом про те саме.
    expect(insert?.values.slice(0, 6)).toEqual([777, "platform", "view", "Трекери", null, "ok"]);
    expect(insert?.values[6]).toBe("2026-10-24 12:17:25.000");
  });

  it("час події береться з моменту запиту й пише мілісекунди", async () => {
    const db = database();
    const at = Date.UTC(2026, 8, 22, 22, 13, 20, 123);

    await recordPlatformAction(
      new Request("https://example.com/api/favorites", { method: "POST" }),
      db.env,
      200,
      at,
    );

    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO user_events"));
    // Секунди — занадто груба сітка: два дотики в одну секунду мінялися б місцями.
    expect(insert?.values[6]).toBe("2026-09-22 22:13:20.123");
  });

  it("⛔ адмінка, бот і портал у журнал людей не потрапляють", async () => {
    const db = database();
    await recordPlatformAction(
      new Request("https://example.com/api/admin/users/update", { method: "POST" }),
      db.env,
      200,
    );

    expect(mocks.identity).not.toHaveBeenCalled();
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });

  it("без підписаної людини запису немає", async () => {
    mocks.identity.mockResolvedValue(null);
    const db = database();
    await recordPlatformAction(
      new Request("https://example.com/api/favorites", { method: "POST" }),
      db.env,
      200,
    );

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
      recordPlatformAction(
        new Request("https://example.com/api/favorites", { method: "DELETE" }),
        env,
        200,
      ),
    ).resolves.toBeUndefined();
  });

  it("невдала відповідь лишається подією зі статусом error", async () => {
    const db = database();
    await recordPlatformAction(
      new Request("https://example.com/api/favorites", { method: "POST" }),
      db.env,
      500,
    );

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

describe("прибирання журналу", () => {
  const post = (body: unknown): Request =>
    new Request("https://example.com/api/admin/events/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  it("звужує вибір ознаками й пише їх у SQL", async () => {
    const db = database({ total: 12 });

    const response = await handleEventCleanup(
      post({
        userId: 7,
        from: "2026-10-20T00:00:00Z",
        to: "2026-10-21T00:00:00Z",
        surface: "platform",
        kind: "view",
      }),
      db.env,
    );

    expect(response.status).toBe(200);
    const remove = db.calls.find((call) => call.sql.startsWith("DELETE FROM user_events"));
    expect(remove?.sql).toContain("user_id = ?");
    expect(remove?.sql).toContain("surface = ?");
    expect(remove?.sql).toContain("kind = ?");
    expect(remove?.sql).toContain("created_at BETWEEN ? AND ?");
    expect(remove?.values).toEqual([
      7,
      "platform",
      "view",
      "2026-10-20 00:00:00",
      "2026-10-21 00:00:00",
    ]);
  });

  it("порожній набір ознак — 400, а не «стерти все»", async () => {
    const db = database();
    const response = await handleEventCleanup(post({ dryRun: true }), db.env);

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("DELETE"))).toBe(false);
  });

  it("явне `all` стирає журнал цілком і без WHERE", async () => {
    const db = database();
    const response = await handleEventCleanup(post({ all: true }), db.env);

    expect(response.status).toBe(200);
    const remove = db.calls.find((call) => call.sql.startsWith("DELETE FROM user_events"));
    expect(remove?.sql).toBe("DELETE FROM user_events");
    expect(remove?.values).toEqual([]);
  });

  it("`dryRun` лише рахує: DELETE не виконується", async () => {
    const db = database({ total: 42 });
    const response = await handleEventCleanup(post({ userId: 7, dryRun: true }), db.env);

    expect(await response.json()).toEqual({ matched: 42 });
    expect(db.calls.some((call) => call.sql.startsWith("DELETE"))).toBe(false);
    expect(db.calls.some((call) => call.sql.includes("SELECT COUNT(*)"))).toBe(true);
  });

  it("крива дата — 400, а не тиха підміна на добу", async () => {
    const db = database();
    const response = await handleEventCleanup(post({ from: "вчора" }), db.env);

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("DELETE"))).toBe(false);
  });
});

describe("налаштування журналу", () => {
  const settingsRequest = (method = "GET", body?: unknown): Request =>
    new Request("https://example.com/api/admin/events/settings", {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });

  it("читає, чи пишеться кожен дотик", async () => {
    const db = database({ full: 0 });
    const response = await handleEventSettingsRead(settingsRequest(), db.env);

    expect(await response.json()).toEqual({ fullLogging: false });
  });

  it("перемикач зберігається одним рядком налаштувань", async () => {
    const db = database();
    const response = await handleEventSettingsWrite(
      settingsRequest("POST", { fullLogging: false }),
      db.env,
    );

    expect(await response.json()).toEqual({ fullLogging: false });
    const save = db.calls.find((call) => call.sql.startsWith("INSERT INTO settings"));
    expect(save?.values).toEqual([0]);
  });

  it("без булевого прапорця — 400, а не «вимкнено»", async () => {
    const db = database();
    const response = await handleEventSettingsWrite(
      settingsRequest("POST", { fullLogging: "ні" }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT"))).toBe(false);
  });
});
