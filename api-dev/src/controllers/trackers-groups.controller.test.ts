/**
 * Групи стрічки: створення, перейменування, цикли дерева, прибирання — і
 * пересування трекера між групами. D1 фейковий: рахуються умови `WHERE`,
 * склад тіл і коди відповідей, а не сам сервер SQLite.
 *
 * @module api-dev/src/controllers/trackers-groups.controller.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRACKER_CATALOG_GROUPS, TRACKER_GROUP_LIMITS } from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { handleTrackerGroups } from "./trackers-groups.controller";
import { handleTrackers } from "./trackers.controller";

const mocks = vi.hoisted(() => ({ identity: vi.fn() }));
vi.mock("../shared/identity", () => ({ resolveUserId: mocks.identity }));

interface GroupRow {
  id: number;
  parent_id: number | null;
  title: string;
  key: string | null;
}

function groupRow(id: number, parentId: number | null = null, key: string | null = null): GroupRow {
  return { id, parent_id: parentId, title: `Група ${id}`, key };
}

function database(
  options: {
    changes?: number;
    lastRowId?: number;
    /** Рядок групи за номером; функція — різні дерева під перевірку циклів. */
    group?: GroupRow | ((id: number) => GroupRow | null);
    /** Системна «Свої», куди верхній рівень садить трекери при видаленні. */
    ownGroup?: { id: number } | null;
    /** Склад `listGroups`: замість каталогу за замовчуванням. */
    groups?: GroupRow[];
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
          if (sql.includes("FROM tracker_groups WHERE id")) {
            const id = Number(call.values[0]);
            return typeof options.group === "function"
              ? options.group(id)
              : (options.group ?? null);
          }
          if (sql.includes("FROM tracker_groups")) return options.ownGroup ?? null;
          return null;
        },
        all: async () => {
          if (options.throwOn && sql.includes(options.throwOn)) throw new Error("D1 недоступна");
          if (sql.includes("FROM tracker_groups")) {
            const rows =
              options.groups ??
              TRACKER_CATALOG_GROUPS.map((group, index) => ({
                id: index + 1,
                parent_id: null,
                title: group.title,
                key: group.key,
              }));
            return { results: rows };
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

const GROUP_URL = "https://example.com/api/user/trackers/group";
const TRACKERS_URL = "https://example.com/api/user/trackers";

function request(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.identity.mockResolvedValue({ ok: true, userId: 777 });
});

describe("пересування трекера в групу", () => {
  it("без групи — UPDATE звужений власником підпису", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PATCH", TRACKERS_URL, { id: 4, groupId: null }),
      db.env,
    );

    expect(response.status).toBe(200);
    const update = db.calls.find((call) => call.sql.startsWith("UPDATE trackers SET group_id"));
    expect(update?.sql).toContain("WHERE id = ? AND owner_id = ? AND is_active = 1");
    expect(update?.values).toEqual([null, 4, "777"]);
  });

  it("чужа група — та сама відповідь, що й чужий трекер", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PATCH", TRACKERS_URL, { id: 4, groupId: 9999 }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("невідомий трекер — 404, змін у базі нуль", async () => {
    const db = database({ changes: 0 });
    const response = await handleTrackers(
      request("PATCH", TRACKERS_URL, { id: 4, groupId: null }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("⛔ нульові номери не доходять до бази", async () => {
    const db = database();
    const badTracker = await handleTrackers(
      request("PATCH", TRACKERS_URL, { id: 0, groupId: null }),
      db.env,
    );
    const badGroup = await handleTrackers(
      request("PATCH", TRACKERS_URL, { id: 4, groupId: 0 }),
      db.env,
    );

    expect(badTracker.status).toBe(400);
    expect(badGroup.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("UPDATE trackers SET group_id"))).toBe(
      false,
    );
  });

  it("⛔ тіло не за схемою — відмова від читання тіла", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PATCH", TRACKERS_URL, { id: "4", groupId: null }),
      db.env,
    );

    expect(response.status).toBe(400);
  });
});

describe("створення груп", () => {
  it("нова група йде INSERT-ом з власником підпису", async () => {
    const db = database();
    const response = await handleTrackerGroups(
      request("POST", GROUP_URL, { title: "Дім", parentId: null }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.startsWith("INSERT INTO tracker_groups"));
    expect(insert?.sql).toContain("COALESCE(MAX(position), 0) + 10");
    expect(insert?.values).toEqual(["777", null, "Дім", "777", null, expect.any(String)]);
    const body = (await response.json()) as { group: { id: number; key: string | null } };
    expect(body.group.id).toBe(21);
    expect(body.group.key).toBeNull();
  });

  it("⛔ порожня назва — відмова до бази", async () => {
    const db = database();
    const response = await handleTrackerGroups(
      request("POST", GROUP_URL, { parentId: null }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT INTO tracker_groups"))).toBe(false);
  });

  it("⛔ чужий батьківський номер — 404, код не підказує, що він існує", async () => {
    const db = database();
    const response = await handleTrackerGroups(
      request("POST", GROUP_URL, { title: "Дім", parentId: 9999 }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("стеля кількості груп — ще до INSERT", async () => {
    const db = database({
      groups: Array.from({ length: TRACKER_GROUP_LIMITS.groups }, (_, index) =>
        groupRow(index + 1),
      ),
    });
    const response = await handleTrackerGroups(
      request("POST", GROUP_URL, { title: "Дім", parentId: null }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("INSERT INTO tracker_groups"))).toBe(false);
  });

  it("невдала вставка — 500 зі словом причини", async () => {
    const db = database({ lastRowId: 0 });
    const response = await handleTrackerGroups(
      request("POST", GROUP_URL, { title: "Дім", parentId: null }),
      db.env,
    );

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Не вдалося створити");
  });
});

describe("перейменування й цикли дерева", () => {
  it("перейменування міняє саму назву рядка", async () => {
    const db = database({ group: groupRow(9) });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, title: "Нова" }),
      db.env,
    );

    expect(response.status).toBe(200);
    const update = db.calls.find((call) => call.sql.startsWith("UPDATE tracker_groups SET title"));
    expect(update?.values).toEqual(["Нова", null, 9, "777"]);
    const body = (await response.json()) as { group: { title: string } };
    expect(body.group.title).toBe("Нова");
  });

  it("⛔ група під власною підгрупою — 400, а не 404", async () => {
    const db = database({ group: groupRow(9), groups: [groupRow(9)] });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, parentId: 9 }),
      db.env,
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Група не може бути під власною підгрупою.");
  });

  it("цикл через діда ловиться в ході батьками", async () => {
    const db = database({
      group: (id) => (id === 9 ? groupRow(9) : id === 8 ? groupRow(8, 9) : null),
      groups: [groupRow(8), groupRow(9)],
    });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, parentId: 8 }),
      db.env,
    );

    expect(response.status).toBe(400);
  });

  it("під час ходу батька видалили — правка проходить", async () => {
    const db = database({
      group: (id) => (id === 9 ? groupRow(9) : id === 8 ? groupRow(8, 7) : null),
      groups: [groupRow(8), groupRow(9)],
    });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, parentId: 8 }),
      db.env,
    );

    expect(response.status).toBe(200);
  });

  it("⛔ батько є в складі, але читається як чужий — 404", async () => {
    const db = database({
      group: (id) => (id === 9 ? groupRow(9) : null),
      groups: [groupRow(8), groupRow(9)],
    });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, parentId: 8 }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("⛔ чужий батько — 404 до читання групи", async () => {
    const db = database();
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, parentId: 9999 }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("невідома група — 404", async () => {
    const db = database();
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, title: "Дім" }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("⛔ без номера і з тілом не за схемою — відмова", async () => {
    const db = database();
    const missing = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { title: "Дім" }),
      db.env,
    );
    const malformed = await handleTrackerGroups(request("PATCH", GROUP_URL, { id: "9" }), db.env);

    expect(missing.status).toBe(400);
    expect(malformed.status).toBe(400);
  });

  it("⛔ порожня нова назва — відмова", async () => {
    const db = database({ group: groupRow(9) });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, title: "   " }),
      db.env,
    );

    expect(response.status).toBe(400);
  });
});

describe("рух груп вгору/вниз", () => {
  it("перестановка з сусідом: позиції обох матеріалізуються, відповідь — перелік", async () => {
    const db = database({ group: groupRow(9), groups: [groupRow(8), groupRow(9)] });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, move: "up" }),
      db.env,
    );

    expect(response.status).toBe(200);
    const moves = db.calls.filter((call) =>
      call.sql.startsWith("UPDATE tracker_groups SET position"),
    );
    expect(moves.map((call) => call.values)).toEqual([
      [10, 9, "777"],
      [20, 8, "777"],
    ]);
    const body = (await response.json()) as { groups: { id: number }[] };
    expect(Array.isArray(body.groups)).toBe(true);
  });

  it("межа дерева — без змін, а не помилка", async () => {
    const db = database({ group: groupRow(9), groups: [groupRow(9)] });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, move: "down" }),
      db.env,
    );

    expect(response.status).toBe(200);
    expect(db.calls.some((call) => call.sql.startsWith("UPDATE tracker_groups SET position"))).toBe(
      false,
    );
  });

  it("невідома група — 404", async () => {
    const db = database();
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, move: "up" }),
      db.env,
    );

    expect(response.status).toBe(404);
  });

  it("⛔ напрям поза схемою — відмова від читання тіла", async () => {
    const db = database({ group: groupRow(9), groups: [groupRow(8), groupRow(9)] });
    const response = await handleTrackerGroups(
      request("PATCH", GROUP_URL, { id: 9, move: "sideways" }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.startsWith("UPDATE tracker_groups SET position"))).toBe(
      false,
    );
  });
});

describe("прибирання груп", () => {
  it("метод поза списком — 405", async () => {
    const db = database();
    const response = await handleTrackerGroups(request("GET", GROUP_URL), db.env);

    expect(response.status).toBe(405);
  });

  it("без номера — 400", async () => {
    const db = database();
    const response = await handleTrackerGroups(request("DELETE", GROUP_URL), db.env);

    expect(response.status).toBe(400);
  });

  it("невідома група — 404", async () => {
    const db = database();
    const response = await handleTrackerGroups(request("DELETE", `${GROUP_URL}?id=9`), db.env);

    expect(response.status).toBe(404);
  });

  it("типову тематику не можна прибрати — ключ це контракт сіву", async () => {
    const db = database({ group: groupRow(9, null, "activity") });
    const response = await handleTrackerGroups(request("DELETE", `${GROUP_URL}?id=9`), db.env);

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Типову тематику не можна прибрати.");
  });

  it("верхній рівень садить у «Свої», діти й трекери піднімаються", async () => {
    const db = database({ group: groupRow(9), ownGroup: { id: 13 } });
    const response = await handleTrackerGroups(request("DELETE", `${GROUP_URL}?id=9`), db.env);

    expect(response.status).toBe(200);
    expect(db.batches).toEqual([3]);
    const lift = db.calls.find((call) =>
      call.sql.startsWith("UPDATE tracker_groups SET parent_id"),
    );
    expect(lift?.values).toEqual([13, 9, "777"]);
    const pull = db.calls.find((call) => call.sql.startsWith("UPDATE trackers SET group_id"));
    expect(pull?.values).toEqual([13, 9, "777"]);
    const remove = db.calls.find((call) => call.sql.startsWith("DELETE FROM tracker_groups"));
    expect(remove?.values).toEqual([9, "777"]);
  });

  it("група з батьком піднімає дітей на нього ж", async () => {
    const db = database({ group: groupRow(9, 7), ownGroup: { id: 13 } });
    const response = await handleTrackerGroups(request("DELETE", `${GROUP_URL}?id=9`), db.env);

    expect(response.status).toBe(200);
    const lift = db.calls.find((call) =>
      call.sql.startsWith("UPDATE tracker_groups SET parent_id"),
    );
    expect(lift?.values).toEqual([7, 9, "777"]);
  });

  it("збій бази — 500, а не сіра відповідь", async () => {
    const db = database({ throwOn: "FROM tracker_groups" });
    const response = await handleTrackerGroups(request("DELETE", `${GROUP_URL}?id=9`), db.env);

    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Не вдалося виконати дію");
  });
});
