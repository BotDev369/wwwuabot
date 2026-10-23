import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  TRACKER_CATALOG,
  TRACKER_CATALOG_GROUPS,
  TRACKER_LIMITS,
  todayTrackerDay,
} from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { handleTrackerGroupClear } from "./trackers-groups.controller";
import {
  handleTrackerEntry,
  handleTrackerPublic,
  handleTrackers,
  handleTrackerTemplates,
} from "./trackers.controller";

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
    /** Група, яку бачить `readGroup` (для очищення й видалення). */
    group?: { id: number; parent_id: number | null; title: string; key: string | null } | null;
    /** Дерево груп для `listGroups` — щоб дійшло піддерево очищення. */
    groupRows?: { id: number; parent_id: number | null; key: string | null }[];
    /** SQL, на якому фейк падає: шлях контролера до відповіді 500. */
    throwOn?: string;
  } = {},
) {
  const calls: { sql: string; values: unknown[] }[] = [];
  const batches: number[] = [];
  // Рядок існує лише після INSERT: інакше пошук «уже доданого» повертав би
  // рядок на порожній базі, і повторне додавання виглядало б як перше.
  // Ключі — окремо: у пачці другий трекер не має знайти рядок першого.
  const keys = new Set<string>();
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
          if (sql.includes("FROM tracker_groups")) return options.group ?? null;
          if (sql.includes("FROM trackers")) {
            if (options.tracker !== undefined) return options.tracker;
            if (sql.includes("AND key = ?"))
              return keys.has(String(call.values[1])) ? TRACKER_ROW : null;
            return TRACKER_ROW;
          }
          return null;
        },
        // Сів груп читає їх назад із бази — мок віддає щойно «сіяні» ключі.
        all: async () => {
          if (options.throwOn && sql.includes(options.throwOn)) throw new Error("D1 недоступна");
          if (sql.includes("FROM tracker_groups")) {
            if (options.groupRows) return { results: options.groupRows };
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
        run: async () => {
          if (sql.includes("INSERT INTO trackers")) keys.add(String(call.values[1]));
          return { meta: { changes: options.changes ?? 1, last_row_id: options.lastRowId ?? 21 } };
        },
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

  it("⛔ каталог не сіється: читання «Моїх» не пише в trackers", async () => {
    const db = database();
    const response = await handleTrackers(request("GET"), db.env);
    const body = (await response.json()) as { trackers: unknown[] };

    expect(body.trackers).toEqual([]);
    // Сіються лише тематики — вони дерево стрічки, а не вміст «Моїх».
    // Каталог живе в «Шаблонах», і копія в «Моїх» — явний крок людини.
    expect(db.batches).toEqual([TRACKER_CATALOG_GROUPS.length]);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO trackers"))).toBe(false);
    // Стрічка й записи звужені підписом, а не параметром запиту.
    const list = db.calls.find((call) => call.sql.includes("FROM trackers WHERE owner_id"));
    expect(list?.values).toEqual(["777"]);
  });

  it("«Шаблони» — каталог із прапорцем «вже доданій»", async () => {
    const db = database();
    const response = await handleTrackerTemplates(
      request("GET", "https://example.com/api/user/trackers/templates"),
      db.env,
    );
    const body = (await response.json()) as { templates: { added: boolean }[] };

    expect(response.status).toBe(200);
    expect(body.templates).toHaveLength(TRACKER_CATALOG.length);
    expect(body.templates.every((template: { added: boolean }) => template.added === false)).toBe(
      true,
    );
  });

  it("додавання шаблону — копія з ключем каталогу, а не сів", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", { from: "catalog:water" }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.includes("INSERT INTO trackers"));
    // Ключ каталогу лишається своїм — він же і є захистом від дубля.
    expect(insert?.values[1]).toBe("water");
    expect(insert?.values).toContain("catalog:water");
  });

  it("додавання всієї групи — дві копії однією відповіддю", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", {
        sources: ["catalog:water", "catalog:sleep"],
      }),
      db.env,
    );
    const body = (await response.json()) as { trackers: unknown[] };

    expect(response.status).toBe(200);
    expect(body.trackers).toHaveLength(2);
    expect(db.calls.filter((call) => call.sql.includes("INSERT INTO trackers"))).toHaveLength(2);
  });

  it("вигадане джерело в пачці — 400 і жодного INSERT", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", {
        sources: ["catalog:water", "catalog:вигадка"],
      }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO trackers"))).toBe(false);
  });

  it("вигаданий шаблон — 400, а не порожня копія", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", { from: "catalog:вигадка" }),
      db.env,
    );

    expect(response.status).toBe(400);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO trackers"))).toBe(false);
  });

  it("чужий закритий трекер не копіюється — та сама відповідь, що й неіснуючий", async () => {
    const db = database({ tracker: null });
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", { from: "public:12" }),
      db.env,
    );

    expect(response.status).toBe(404);
    expect(db.calls.some((call) => call.sql.includes("INSERT INTO trackers"))).toBe(false);
  });

  it("порядок — рух у межах групи, перелік приходить від сервера", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PATCH", "https://example.com/api/user/trackers", { id: 4, move: "up" }),
      db.env,
    );
    const body = (await response.json()) as { trackers: unknown[] };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.trackers)).toBe(true);
    // Сусіди беруться в тому самому порядку, що й стрічка: позиція, потім id.
    const siblings = db.calls.find((call) => call.sql.includes("FROM trackers WHERE owner_id"));
    expect(siblings?.sql).toContain("COALESCE(position, 0)");
  });

  it("публічність — прапорець рядка, а не друга таблиця", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PATCH", "https://example.com/api/user/trackers", { id: 4, isPublic: true }),
      db.env,
    );

    expect(response.status).toBe(200);
    const update = db.calls.find((call) => call.sql.includes("SET is_public"));
    expect(update?.values).toEqual([1, 4, "777"]);
  });

  it("PATCH без зміни — 400: тіло не має бути порожнім", async () => {
    const db = database();
    const response = await handleTrackers(
      request("PATCH", "https://example.com/api/user/trackers", { id: 4 }),
      db.env,
    );

    expect(response.status).toBe(400);
  });

  it("«Публічні» — лише визначення: запит не торкається tracker_entries", async () => {
    const db = database();
    const response = await handleTrackerPublic(
      request("GET", "https://example.com/api/user/trackers/public"),
      db.env,
    );

    expect(response.status).toBe(200);
    expect(db.calls.some((call) => call.sql.includes("tracker_entries"))).toBe(false);
    const select = db.calls.find((call) => call.sql.includes("FROM trackers t"));
    expect(select?.sql).toContain("is_public = 1");
  });

  it("⛔ без підпису «Шаблони» й «Публічні» не читаються", async () => {
    mocks.identity.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    const db = database();

    expect(
      (
        await handleTrackerTemplates(
          request("GET", "https://example.com/api/user/trackers/templates"),
          db.env,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await handleTrackerPublic(
          request("GET", "https://example.com/api/user/trackers/public"),
          db.env,
        )
      ).status,
    ).toBe(401);
    expect(db.calls).toHaveLength(0);
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

  it("тип «так-ні» їде в колонку, а числові поля цього типу не існують", async () => {
    const db = database();
    const response = await handleTrackers(
      request("POST", "https://example.com/api/user/trackers", {
        title: "Не палю",
        // Приховані формою поля: сервер не має ані вимагати їх, ані приймати.
        unit: "днів",
        goal: 5,
        step: 999,
        valueType: "boolean",
      }),
      db.env,
    );

    expect(response.status).toBe(200);
    const insert = db.calls.find((call) => call.sql.includes("INSERT INTO trackers"));
    expect(insert?.values).toContain("boolean");
    expect(insert?.values).toContain("Не палю");
    expect(insert?.values).not.toContain("днів");
    expect(insert?.values).not.toContain(5);
    expect(insert?.values).not.toContain(999);
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

describe("очищення групи", () => {
  const builtin = { id: 11, parent_id: null, title: "Активність", key: "activity" };

  it("прибирає мірки піддерева й лишає саму тематику", async () => {
    const db = database({
      group: builtin,
      changes: 3,
      groupRows: [
        { id: 11, parent_id: null, key: "activity" },
        { id: 12, parent_id: 11, key: null },
        { id: 13, parent_id: 12, key: null },
        { id: 14, parent_id: null, key: null },
      ],
    });
    const response = await handleTrackerGroupClear(
      request("DELETE", "https://example.com/api/user/trackers/group/trackers?id=11"),
      db.env,
    );
    const body = (await response.json()) as { removed: number };

    expect(response.status).toBe(200);
    expect(body.removed).toBe(3);
    const update = db.calls.find((call) => call.sql.includes("UPDATE trackers SET is_active = 0"));
    // Піддерево — переліком `IN (…)`: у підгрупах теж мірки, а сусідня гілка
    // (`14`) лишається — очищення не має виходити за межі групи.
    expect(update?.sql).toContain("IN (?, ?, ?)");
    // Перший бінд — власник: мірки чужої людини очищення не зачіпає.
    expect(update?.values.slice(1)).toEqual([11, 12, 13]);
    expect(db.calls.some((call) => call.sql.includes("DELETE FROM tracker_groups"))).toBe(false);
  });

  it("чужа або неіснуюча група — 404 без UPDATE", async () => {
    const db = database({ group: null });
    const response = await handleTrackerGroupClear(
      request("DELETE", "https://example.com/api/user/trackers/group/trackers?id=11"),
      db.env,
    );

    expect(response.status).toBe(404);
    expect(db.calls.some((call) => call.sql.includes("UPDATE trackers"))).toBe(false);
  });

  it("метод поза списком — 405 без читань", async () => {
    const db = database();
    const response = await handleTrackerGroupClear(
      request("GET", "https://example.com/api/user/trackers/group/trackers?id=11"),
      db.env,
    );

    expect(response.status).toBe(405);
    expect(db.calls).toHaveLength(0);
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

describe("скидання сьогодні", () => {
  it("прибирає лише сьогоднішні виміри трекера", async () => {
    const db = database({ changes: 2 });
    const response = await handleTrackerEntry(
      request("DELETE", "https://example.com/api/user/trackers/entry?trackerId=4"),
      db.env,
    );
    const body = (await response.json()) as { removed: number };

    expect(response.status).toBe(200);
    expect(body.removed).toBe(2);
    const statement = db.calls.find((call) => call.sql.includes("DELETE FROM tracker_entries"));
    // День ставить сервер: клієнт не обирає, який день скидати.
    expect(statement?.sql).toContain("AND day = ?");
    expect(statement?.values).toContain(todayTrackerDay());
  });

  it("чужий трекер — 404 без DELETE: номер не підтверджує, що рядок існує", async () => {
    const db = database({ tracker: null });
    const response = await handleTrackerEntry(
      request("DELETE", "https://example.com/api/user/trackers/entry?trackerId=4"),
      db.env,
    );

    expect(response.status).toBe(404);
    expect(db.calls.some((call) => call.sql.includes("DELETE FROM tracker_entries"))).toBe(false);
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
