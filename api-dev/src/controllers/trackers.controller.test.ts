import { beforeEach, describe, expect, it, vi } from "vitest";
import { todayTrackerDay } from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { handleTrackerEntry, handleTrackers } from "./trackers.controller";

const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("../shared/identity", () => ({ resolveUserId: mocks.identity }));

const TRACKER_ROW = {
  id: 4,
  key: "mood",
  title: "Настрій",
  unit: "бал",
  step: 1,
  goal: 4,
  min_value: 1,
  max_value: 5,
  icon: "heart",
  is_builtin: 1,
};

function database(
  options: {
    total?: number;
    tracker?: unknown | null;
    changes?: number;
    lastRowId?: number;
  } = {},
) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const batches: number[] = [];
  const db = {
    prepare(sql: string) {
      const call = { sql, values: [] as unknown[] };
      calls.push(call);
      const statement = {
        bind(...values: unknown[]) {
          call.values = values;
          return statement;
        },
        first: async () => {
          if (sql.includes("COUNT(*)")) return { total: options.total ?? 1 };
          if (sql.includes("FROM trackers"))
            return options.tracker === undefined ? TRACKER_ROW : options.tracker;
          return null;
        },
        all: async () => ({ results: [] }),
        run: async () => ({
          meta: { changes: options.changes ?? 1, last_row_id: options.lastRowId ?? 21 },
        }),
      };
      return statement;
    },
    batch: async (statements: unknown[]) => {
      batches.push(statements.length);
      return [];
    },
  };
  return { calls, batches, env: { DB: db } as unknown as Env };
}

function request(method: string, url = "https://example.com/api/user/trackers", body?: unknown) {
  return new Request(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.mockResolvedValue({ ok: true, userId: 777 });
});

describe("трекери людини", () => {
  it("⛔ без підпису не читає й не пише базу", async () => {
    mocks.identity.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    const db = database();

    expect((await handleTrackers(request("GET"), db.env)).status).toBe(401);
    expect(db.calls).toHaveLength(0);
  });

  it("перший вхід створює стандартні трекери один раз", async () => {
    const empty = database({ total: 0 });
    await handleTrackers(request("GET"), empty.env);
    expect(empty.batches).toEqual([9]);

    const filled = database({ total: 3 });
    await handleTrackers(request("GET"), filled.env);
    expect(filled.batches).toHaveLength(0);
    // Стрічка й записи звужені підписом, а не параметром запиту.
    const list = filled.calls.find((call) => call.sql.includes("FROM trackers WHERE owner_id"));
    expect(list?.values).toEqual(["777"]);
  });

  it("⛔ власник із тіла не потрапляє в INSERT", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", {
        title: "Кава",
        unit: "чашок",
        step: 1,
        owner_id: 999,
      }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.includes("INSERT INTO trackers"));
    expect(insert?.values[0]).toBe("777");
    expect(insert?.values).not.toContain(999);
  });

  it("порожня назва не створює трекер", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", { title: "  ", step: 1 }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO trackers"))).toBe(false);
  });

  it("прибирання трекера звужене власником із підпису", async () => {
    const db = database();
    await handleTrackers(request("DELETE", "https://example.com/api/user/trackers?id=4"), db.env);

    const update = db.calls.find((call) => call.sql.startsWith("UPDATE trackers"));
    expect(update?.sql).toContain("WHERE id = ? AND owner_id = ?");
    expect(update?.values).toEqual([4, "777"]);
  });

  it("чужий трекер дає ту саму відповідь, що й неіснуючий", async () => {
    const db = database({ tracker: null });
    const response = await handleTrackers(
      request("GET", "https://example.com/api/user/trackers?id=9"),
      db.env,
    );
    expect(response.status).toBe(404);
  });
});

describe("запис", () => {
  it("значення поза межами трекера не доходить до бази", async () => {
    const db = database();
    const response = await handleTrackerEntry(
      request("POST", "https://example.com/api/user/trackers/entry", {
        trackerId: 4,
        value: 9,
      }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO tracker_entries"))).toBe(false);
  });

  it("⛔ день із тіла клієнта ігнорується — його ставить сервер", async () => {
    const db = database();
    const response = await handleTrackerEntry(
      request("POST", "https://example.com/api/user/trackers/entry", {
        trackerId: 4,
        day: "2999-01-01",
        value: 3,
      }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.includes("INSERT INTO tracker_entries"));
    // Третє значення INSERT — день: саме сьогоднішній, а не «завтра» з тіла.
    expect(insert?.values[2]).toBe(todayTrackerDay());
  });

  it("збереження — новий рядок із моментом часу, а не правка дня", async () => {
    const db = database();
    const day = todayTrackerDay();
    const response = await handleTrackerEntry(
      request("POST", "https://example.com/api/user/trackers/entry", {
        trackerId: 4,
        value: 3,
        note: "  спокійно  ",
      }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.includes("INSERT INTO tracker_entries"));
    expect(insert?.sql).not.toContain("ON CONFLICT");
    expect(insert?.values).toEqual([
      4,
      "777",
      day,
      3,
      "спокійно",
      expect.any(String),
      expect.any(String),
    ]);
    // Відповідь несе номер рядка й серверний час — клієнт їх не вигадує.
    const body = (await response.json()) as { entry: { id: number; loggedAt: string | null } };
    expect(body.entry.id).toBe(21);
    expect(body.entry.loggedAt).toEqual(expect.any(String));
  });

  it("прибирання дотика — за номером рядка, звужене власником", async () => {
    const db = database();
    const response = await handleTrackerEntry(
      request("DELETE", "https://example.com/api/user/trackers/entry?id=21"),
      db.env,
    );

    expect(response.status).toBe(200);
    const remove = db.calls.find((call) => call.sql.startsWith("DELETE FROM tracker_entries"));
    expect(remove?.sql).toContain("WHERE owner_id = ? AND id = ?");
    expect(remove?.values).toEqual(["777", 21]);
  });
});
