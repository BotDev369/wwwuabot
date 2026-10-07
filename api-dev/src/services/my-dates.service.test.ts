/**
 * Дати на рядках: чого сервіс не має дозволити. Чужий рядок не видно («чи
 * мій» виконнує сам запит), правка не зачіпає сусідні дати, видалення повертає
 * реально видалене число, а власний вид не губиться (`BUILTIN_TYPES` — палітра,
 * а не набір). D1 — фейковий: перевіряються рішення сервісу, а не SQLite.
 *
 * @module api-dev/src/services/my-dates.service.test
 */

import { describe, expect, it } from "vitest";

import {
  addMyDate,
  dateNamesFor,
  deleteMyDates,
  listMyDates,
  normalizeType,
  updateMyDate,
} from "./my-dates.service";

const ME = 372567448;
const OTHER = 1049272067;

interface Captured {
  sql: string;
  binds: unknown[];
}

function makeDb(rows: Array<Record<string, unknown>> = []): {
  db: D1Database;
  statements: Captured[];
} {
  const statements: Captured[] = [];

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => {
          // Умова власника виконується тут справжня: інакше тест «чужого рядка
          // правка не створює» перевіряв би лише те, що `user_id` є в тексті.
          const [userId, id] = record.binds;
          const mine = /user_id/.test(sql);
          const hit = rows.find((row) => (mine ? row.user_id === userId : true) && row.id === id);
          return hit ?? null;
        },
        all: async () => {
          if (/PRAGMA|sqlite_master/.test(sql)) return { results: [] };
          const userId = record.binds[0];
          const owned = /user_id/.test(sql) ? rows.filter((row) => row.user_id === userId) : rows;
          // Порядок із самого запиту: тест має впасти, якщо SQL перестане
          // впорядковувати за датою.
          const sorted = /ORDER BY date/.test(sql)
            ? [...owned].sort((left, right) => String(left.date).localeCompare(String(right.date)))
            : owned;
          return { results: sorted };
        },
        run: async () => {
          if (/^\s*INSERT INTO my_dates/.test(sql)) {
            const [userId, id, date, type, name, tags, notes] = record.binds;
            rows.push({
              user_id: userId,
              id,
              date,
              type,
              name,
              tags,
              notes,
              created_at: "2026-01-01 00:00:00",
              updated_at: "2026-01-01 00:00:00",
            });
          }
          if (/^\s*DELETE FROM my_dates/.test(sql)) {
            const mine = /user_id/.test(sql);
            const [userId, ...ids] = record.binds;
            let changes = 0;
            for (let index = rows.length - 1; index >= 0; index--) {
              const row = rows[index];
              if ((mine ? row.user_id === userId : true) && ids.includes(row.id as string)) {
                rows.splice(index, 1);
                changes++;
              }
            }
            return { meta: { changes } };
          }
          if (/^\s*UPDATE my_dates/.test(sql)) {
            const mine = /user_id/.test(sql);
            const [date, type, name, tags, notes, , userId, id] = record.binds;
            const row = rows.find(
              (item) => (mine ? item.user_id === userId : true) && item.id === id,
            );
            if (!row) return { meta: { changes: 0 } };
            row.date = date ?? row.date;
            row.type = type ?? row.type;
            row.name = name ?? row.name;
            row.tags = tags ?? row.tags;
            row.notes = notes ?? row.notes;
            return { meta: { changes: 1 } };
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };

  return { db: db as unknown as D1Database, statements };
}

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "mt8kflzpsu4c",
    date: "1980-03-03",
    type: "person",
    name: "Сергій",
    tags: "[]",
    notes: "",
    created_at: "2026-08-25 11:12:27",
    updated_at: "2026-08-25 13:54:17",
    ...overrides,
  };
}

describe("список дат", () => {
  it("читаються лише дати цієї людини", async () => {
    const rows = [
      { user_id: ME, ...item({ id: "a", date: "1980-03-03" }) },
      { user_id: OTHER, ...item({ id: "b", date: "1990-01-01", name: "Чужий" }) },
    ];
    const { db } = makeDb(rows);

    const dates = await listMyDates(db, ME);
    expect(dates.map((date) => date.id)).toEqual(["a"]);
  });

  it("порядок задає сама дата, а не порядок запису", async () => {
    const rows = [
      { user_id: ME, ...item({ id: "b", date: "2003-02-15" }) },
      { user_id: ME, ...item({ id: "a", date: "1954-06-25" }) },
    ];
    const { db } = makeDb(rows);

    expect((await listMyDates(db, ME)).map((date) => date.date)).toEqual([
      "1954-06-25",
      "2003-02-15",
    ]);
  });

  it("теги приходять масивом навіть із поламаного JSON", async () => {
    const { db } = makeDb([{ user_id: ME, ...item({ tags: "{не json" }) }]);
    expect((await listMyDates(db, ME))[0].tags).toEqual([]);
  });

  it("людина не має дат — це порожній список, а не помилка", async () => {
    const { db } = makeDb([]);
    expect(await listMyDates(db, ME)).toEqual([]);
  });
});

describe("додавання", () => {
  it("номер приходить від людини й лишається таким на всіх пристроях", async () => {
    const rows: Array<Record<string, unknown>> = [];
    const { db } = makeDb(rows);

    const created = await addMyDate(db, ME, {
      id: "mtuser0001",
      date: "1980-03-03",
      type: "person",
      name: "Сергій",
      tags: [],
      notes: "",
    });

    expect(created.id).toBe("mtuser0001");
    expect(created.user_id).toBe(ME);
    expect(rows[0].user_id).toBe(ME);
  });

  it("теги зберігаються як JSON, а не як текст через кому", async () => {
    const rows: Array<Record<string, unknown>> = [];
    const { db, statements } = makeDb(rows);

    await addMyDate(db, ME, {
      id: "mtuser0002",
      date: "1980-03-03",
      type: "person",
      name: "Сергій",
      tags: ["предки", "кишилівка"],
      notes: "",
    });

    const insert = statements.find((s) => /INSERT INTO my_dates/.test(s.sql));
    expect(insert?.binds[5]).toBe('["предки","кишилівка"]');
  });
});

describe("правка", () => {
  it("порожнє поле — це «стерти значення», а не «лишити як було»", async () => {
    const rows = [{ user_id: ME, ...item({ notes: "була нотатка", name: "Сергій" }) }];
    const { db } = makeDb(rows);

    const updated = await updateMyDate(db, ME, "mt8kflzpsu4c", { notes: "", name: "Сер." });
    expect(updated?.notes).toBe("");
    expect(updated?.name).toBe("Сер.");
  });

  it("чужого або неіснуючого рядка правка не створює", async () => {
    const rows = [{ user_id: OTHER, ...item({ id: "чужа" }) }];
    const { db } = makeDb(rows);

    expect(await updateMyDate(db, ME, "чужа", { name: "моє" })).toBeNull();
    expect(rows[0].name).toBe("Сергій");
  });
});

describe("видалення", () => {
  it("повертає реально видалені рядки, а не запрошені", async () => {
    const rows = [{ user_id: ME, ...item({ id: "a" }) }];
    const { db } = makeDb(rows);

    expect(await deleteMyDates(db, ME, ["a", "немає-такої"])).toBe(1);
    expect(await deleteMyDates(db, ME, ["немає-такої"])).toBe(0);
  });

  it("чужий рядок не видаляється навіть за його номером", async () => {
    const rows = [{ user_id: OTHER, ...item({ id: "чужа" }) }];
    const { db } = makeDb(rows);

    expect(await deleteMyDates(db, ME, ["чужа"])).toBe(0);
    expect(rows).toHaveLength(1);
  });

  it("без номера не йдемо в базу взагалі", async () => {
    const { db, statements } = makeDb([]);

    expect(await deleteMyDates(db, ME, [])).toBe(0);
    expect(statements.some((s) => /DELETE FROM my_dates/.test(s.sql))).toBe(false);
  });
});

/**
 * Назви дат для шапки таблиці аналізу: стовпець підписано датою, але людина знає
 * свої дати за назвою. Порожня назва — не назва: другого рядка не буде.
 */
describe("назви дат", () => {
  it("назву бере за датою, а порожню не віддає", async () => {
    const { db, statements } = makeDb([
      { user_id: ME, id: "a", date: "1980-03-03", name: "Мама" },
      { user_id: ME, id: "b", date: "2004-10-07", name: "   " },
    ]);

    await expect(dateNamesFor(db, ME, ["1980-03-03", "2004-10-07"])).resolves.toEqual({
      "1980-03-03": "Мама",
    });

    // Дати відсікає сам `WHERE`, а не пам'ять після читання всіх рядків людини.
    expect(statements.at(-1)?.binds).toEqual([ME, "1980-03-03", "2004-10-07"]);
  });

  it("одна дата в кількох рядках — назва не губиться", async () => {
    const { db } = makeDb([
      { user_id: ME, id: "a", date: "1980-03-03", name: "" },
      { user_id: ME, id: "b", date: "1980-03-03", name: "Мама" },
    ]);

    await expect(dateNamesFor(db, ME, ["1980-03-03"])).resolves.toEqual({ "1980-03-03": "Мама" });
  });

  // `IN ()` — це помилка SQL, а не порожній перелік: без дат запиту немає.
  it("без дат у базу не йде", async () => {
    const { db, statements } = makeDb([]);

    await expect(dateNamesFor(db, ME, [])).resolves.toEqual({});
    expect(statements).toHaveLength(0);
  });
});

describe("вид дати", () => {
  it("власний вид людини не губиться", () => {
    expect(normalizeType("тривалість")).toBe("тривалість");
  });

  it("порожній вид — це `other`, а не рядок у базі", () => {
    expect(normalizeType(undefined)).toBe("other");
    expect(normalizeType("   ")).toBe("other");
  });
});
