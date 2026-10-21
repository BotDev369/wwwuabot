import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRACKER_CATALOG,
  TRACKER_CATALOG_GROUPS,
  TRACKER_LIMITS,
  todayTrackerDay,
} from "@wwwuabot/shared/trackers";
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
    tracker?: unknown | null;
    changes?: number;
    lastRowId?: number;
    /** Рядки стрічки — щоб дійшла стеля кількості трекерів. */
    listTrackers?: unknown[];
    /** SQL, на якому фейк падає: шлях контролера до відповіді 500. */
    throwOn?: string;
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
          if (options.throwOn && sql.includes(options.throwOn)) throw new Error("D1 недоступна");
          if (sql.includes("FROM trackers"))
            return options.tracker === undefined ? TRACKER_ROW : options.tracker;
          return null;
        },
        // Сів груп читає їх назад із бази — мок віддає щойно «сіяні» ключі.
        all: async () => {
          if (options.throwOn && sql.includes(options.throwOn)) throw new Error("D1 недоступна");
          if (sql.includes("FROM tracker_groups")) {
            return {
              results: TRACKER_CATALOG_GROUPS.map((group, index) => ({
                id: index + 1,
                key: group.key,
              })),
            };
          }
          if (sql.includes("FROM trackers") && options.listTrackers) {
            return { results: options.listTrackers };
          }
          return { results: [] };
        },
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

  it("стандартні трекери сіються при кожному вході й не дублюються", async () => {
    const db = database();
    await handleTrackers(request("GET"), db.env);
    // Каталог їде й до наявних баз: так нові мірки з'являються в уже
    // створених людей, а `INSERT OR IGNORE` не дублює наявні. Першим іде сів
    // груп (тематики ключами), далі — трекери з прив'язкою й backfill тих,
    // що людина ще не віднесла сама.
    expect(db.batches[0]).toBe(TRACKER_CATALOG_GROUPS.length);
    expect(db.batches[1]).toBeGreaterThan(TRACKER_CATALOG.length);
    // Стрічка й записи звужені підписом, а не параметром запиту.
    const list = db.calls.find((call) => call.sql.includes("FROM trackers WHERE owner_id"));
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

describe("методи, картка й збої", () => {
  it("метод поза списком — 405 без читань", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PUT", "https://example.com/api/user/trackers"),
      db.env,
    );

    expect(response.status).toBe(405);
    expect(db.calls).toHaveLength(0);
  });

  it("картка несе групи й історію вікна з днем із запиту", async () => {
    const db = database();
    const response = await handleTrackers(
      request("GET", "https://example.com/api/user/trackers?id=4&day=2026-09-01"),
      db.env,
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      tracker: { id: number };
      groups: { id: number }[];
      entries: unknown[];
      endDay: string;
    };
    expect(body.tracker.id).toBe(4);
    expect(body.groups.length).toBeGreaterThan(0);
    expect(body.entries).toEqual([]);
    expect(body.endDay).toBe("2026-09-01");
    // Історія читається вікном, звуженим власником із підпису.
    const history = db.calls.find(
      (call) => call.sql.includes("FROM tracker_entries") && call.sql.includes("tracker_id"),
    );
    expect(history?.values[0]).toBe("777");
    expect(history?.values[1]).toBe(4);
  });

  it("стеля кількості трекерів — ще до INSERT", async () => {
    const db = database({
      listTrackers: Array.from({ length: TRACKER_LIMITS.trackers }, (_, index) => ({
        id: index + 1,
        key: `own-${index}`,
        title: `Мірка ${index}`,
        unit: "",
        step: 1,
        goal: null,
        min_value: 0,
        max_value: null,
        mode: "read",
        icon: "bar-chart",
        group_id: null,
        is_builtin: 0,
      })),
    });
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", {
        title: "Кава",
        unit: "чашок",
        step: 1,
      }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT INTO trackers"))).toBe(false);
  });

  it("невідомий трекер при прибиранні — 404", async () => {
    const db = database({ changes: 0 });
    const response = await handleTrackers(
      request("DELETE", "https://example.com/api/user/trackers?id=4"),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("збій бази — відповідь 500, а не сірий екран", async () => {
    const db = database({ throwOn: "FROM trackers" });
    const response = await handleTrackers(
      request("GET", "https://example.com/api/user/trackers"),
      db.env,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Не вдалося виконати дію");
  });
});

describe("дотики: методи й межі", () => {
  it("метод поза списком — 405", async () => {
    const db = database();
    const response = await handleTrackerEntry(
      request("GET", "https://example.com/api/user/trackers/entry"),
      db.env,
    );

    expect(response.status).toBe(405);
  });

  it("⛔ чужий дотик — та сама відповідь, що й неіснуючий", async () => {
    const db = database({ changes: 0 });
    const response = await handleTrackerEntry(
      request("DELETE", "https://example.com/api/user/trackers/entry?id=21"),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("⛔ нульовий номер трекера не доходить до бази", async () => {
    const db = database();
    const response = await handleTrackerEntry(
      request("POST", "https://example.com/api/user/trackers/entry", {
        trackerId: 0,
        value: 1,
      }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO tracker_entries"))).toBe(false);
  });

  it("⛔ нотатка за стелею не доходить до бази", async () => {
    const db = database();
    const response = await handleTrackerEntry(
      request("POST", "https://example.com/api/user/trackers/entry", {
        trackerId: 4,
        value: 3,
        note: "х".repeat(TRACKER_LIMITS.note + 1),
      }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO tracker_entries"))).toBe(false);
  });

  it("збій бази — 500 зі словом причини", async () => {
    const db = database({ throwOn: "FROM trackers" });
    const response = await handleTrackerEntry(
      request("POST", "https://example.com/api/user/trackers/entry", {
        trackerId: 4,
        value: 3,
      }),
      db.env,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Не вдалося зберегти запис");
  });
});
