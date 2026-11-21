/**
 * Набори на рядках: склад зберігається, чужі рядки не видно, поламаний JSON не
 * ламає список. D1 — фейковий: перевіряються рішення сервісу, а не SQLite.
 *
 * @module api-dev/src/services/analysis-sets.service.test
 */

import { describe, expect, it } from "vitest";
import { deleteAnalysisSet, listAnalysisSets, saveAnalysisSet } from "./analysis-sets.service";

const ME = 1;
const OTHER = 2;

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
        first: async () => null,
        all: async () => {
          if (/PRAGMA|sqlite_master/.test(sql)) return { results: [] };
          const userId = record.binds[0];
          return {
            results: rows
              .filter((row) => row.user_id === userId)
              .sort((left, right) =>
                String(right.created_at).localeCompare(String(left.created_at)),
              ),
          };
        },
        run: async () => {
          if (/^INSERT INTO analysis_sets/.test(sql)) {
            const [userId, id, name, items, createdAt] = record.binds;
            const hit = rows.find((row) => row.user_id === userId && row.id === id);
            if (hit) {
              hit.name = name;
              hit.items = items;
            } else {
              rows.push({
                user_id: userId,
                id,
                name,
                items,
                created_at: createdAt,
                updated_at: createdAt,
              });
            }
          }
          if (/^DELETE FROM analysis_sets/.test(sql)) {
            const [userId, id] = record.binds;
            const before = rows.length;
            for (let index = rows.length - 1; index >= 0; index--) {
              if (rows[index].user_id === userId && rows[index].id === id) rows.splice(index, 1);
            }
            return { meta: { changes: before - rows.length } };
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };

  return { db: db as unknown as D1Database, statements };
}

const ITEMS = [
  { date: "1980-03-03", name: "Олена" },
  { date: "1991-12-31", name: "" },
];

describe("набори для співставлення", () => {
  it("зберігає склад і повертає його у списку", async () => {
    const { db } = makeDb();

    await saveAnalysisSet(db, ME, { id: "a1", name: "Команда", items: ITEMS });
    const sets = await listAnalysisSets(db, ME);

    expect(sets).toHaveLength(1);
    expect(sets[0].name).toBe("Команда");
    expect(sets[0].items).toEqual(ITEMS);
  });

  it("перезаписує набір із тим самим номером, а не додає другий", async () => {
    const { db } = makeDb();
    await saveAnalysisSet(db, ME, { id: "a1", name: "Команда", items: ITEMS });

    await saveAnalysisSet(db, ME, { id: "a1", name: "Колеги", items: [ITEMS[0]] });
    const sets = await listAnalysisSets(db, ME);

    expect(sets).toHaveLength(1);
    expect(sets[0].name).toBe("Колеги");
    expect(sets[0].items).toHaveLength(1);
  });

  it("видаляє лише свій набір", async () => {
    const { db } = makeDb();
    await saveAnalysisSet(db, ME, { id: "a1", name: "Мій", items: ITEMS });
    await saveAnalysisSet(db, OTHER, { id: "a2", name: "Чужий", items: ITEMS });

    expect(await deleteAnalysisSet(db, ME, "a2")).toBe(0);
    expect(await deleteAnalysisSet(db, ME, "a1")).toBe(1);
    expect(await listAnalysisSets(db, OTHER)).toHaveLength(1);
  });

  it("поламаний JSON у рядку не ламає список", async () => {
    const { db } = makeDb([
      {
        user_id: ME,
        id: "bad",
        name: "Старий",
        items: "{не json",
        created_at: "2026-01-01 00:00:00",
        updated_at: "2026-01-01 00:00:00",
      },
    ]);

    const sets = await listAnalysisSets(db, ME);
    expect(sets[0].items).toEqual([]);
  });
});
