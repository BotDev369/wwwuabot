/**
 * Тести реєстру таблиць D1.
 *
 * Перевіряється не «що схема гарна», а три речі, які ламались у реальності:
 *
 *   1. **Інваріанти реєстру** — ім'я в оголошенні збігається з ключем, DDL
 *      ідемпотентний (`IF NOT EXISTS`), призначення й власник заповнені.
 *   2. **Колонки виводяться з DDL**, а не з другого списку, і обмеження
 *      таблиці (`FOREIGN KEY`) не вважаються колонками.
 *   3. **`ensureTables` тільки додає** — створює таблицю, додає рівно ті
 *      колонки, яких немає, і не робить нічого при повторному виклику.
 *
 * @module @wwwuabot/shared/database/tables.test
 */

import { describe, expect, it } from "vitest";
import { declaredColumns, ensureTables } from "./ensure-tables";
import { TABLES, TABLE_NAMES, tableDefinition, type TableName } from "./tables";

/** Двійник D1: журнал SQL і список «наявних» колонок для `PRAGMA table_info`. */
function fakeDb(columns: string[]) {
  const statements: string[] = [];
  const db = {
    prepare(raw: string) {
      statements.push(raw.replace(/\s+/g, " ").trim());
      const stmt = {
        bind: () => stmt,
        all: async () => ({ results: columns.map((name) => ({ name })) }),
        first: async () => null,
        run: async () => ({ meta: { changes: 1 } }),
      };
      return stmt;
    },
  } as unknown as D1Database;
  return { db, statements };
}

const scenarioColumns = declaredColumns(TABLES.scenarios).map((c) => c.name);

describe("реєстр таблиць: інваріанти", () => {
  it("кожна таблиця оголошена під своїм іменем", () => {
    expect(TABLE_NAMES.length).toBeGreaterThan(0);
    for (const key of TABLE_NAMES) {
      expect(tableDefinition(key)?.name).toBe(key);
    }
  });

  it("DDL ідемпотентний, і в ньому стоїть саме ім'я таблиці", () => {
    for (const key of TABLE_NAMES) {
      const def = TABLES[key];
      expect(def.create).toMatch(/^CREATE TABLE IF NOT EXISTS /);
      const declared = /^CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/.exec(
        def.create,
      )?.[1];
      expect(declared).toBe(key);
    }
  });

  it("індекси теж ідемпотентні і стосуються своєї таблиці", () => {
    for (const key of TABLE_NAMES) {
      for (const index of tableDefinition(key)?.indexes ?? []) {
        expect(index).toMatch(/^CREATE (UNIQUE )?INDEX IF NOT EXISTS /);
        expect(index).toContain(key);
      }
    }
  });

  /**
   * Імена індексів у SQLite — **глобальні для бази**, не для таблиці. Тому
   * `CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON pages(…)` — це не
   * помилка, а **нічого**: індекс із таким іменем уже створив `site_pages`.
   * Саме так `pages` залишилась без унікальності адреси, і два рядки дістали
   * той самий `slug` — а ні компілятор, ні `check:db`, ні сам SQL не сказали
   * про це жодного слова.
   */
  it("імена індексів не повторюються між таблицями", () => {
    const seen = new Map<string, string>();
    for (const key of TABLE_NAMES) {
      for (const index of tableDefinition(key)?.indexes ?? []) {
        const name = /^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/.exec(
          index,
        )?.[1];
        expect(name).toBeDefined();
        expect(seen.get(name as string)).toBeUndefined();
        seen.set(name as string, key);
      }
    }
  });

  it("у кожного власника є призначення — інакше таблиця нічия", () => {
    for (const key of TABLE_NAMES) {
      expect(["bot-dev", "api-dev"]).toContain(TABLES[key].owner);
      expect(TABLES[key].purpose.trim().length).toBeGreaterThan(10);
    }
  });

  it("неоголошена таблиця — помилка, а не тихе створення", async () => {
    const { db } = fakeDb([]);
    await expect(ensureTables(db, ["не_таблиця" as TableName])).rejects.toThrow(/не оголошена/);
  });
});

describe("колонки виводяться з DDL", () => {
  it("розбирає просту таблицю", () => {
    expect(declaredColumns(TABLES.mydate_analysis)).toEqual([
      { name: "date", type: "TEXT" },
      { name: "systems_data", type: "TEXT" },
      { name: "updated_at", type: "TEXT" },
    ]);
  });

  it("не вважає `FOREIGN KEY` колонкою", () => {
    const names = declaredColumns(TABLES.site_pages).map((c) => c.name);
    expect(names).toContain("site_id");
    expect(names).not.toContain("FOREIGN");
  });

  it("немає дублікатів колонок і непридатних імен", () => {
    for (const key of TABLE_NAMES) {
      const names = declaredColumns(TABLES[key]).map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
      for (const name of names) expect(name).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/);
    }
  });

  it("сценарії мають саме ті колонки, яких потребує код", () => {
    // resolveScenario фільтрує за is_active і web_slug; bot-dev читає решту.
    for (const column of ["web_slug", "is_active", "page_data", "qty_options", "notify_groups"]) {
      expect(scenarioColumns).toContain(column);
    }
    // `web_config` оголошувався в старому DDL, але його не вживає ніхто.
    expect(scenarioColumns).not.toContain("web_config");
  });

  it("дві таблиці сценаріїв мають однаковий набір колонок", () => {
    expect(declaredColumns(TABLES["scenarios-admin"]).map((c) => c.name)).toEqual(scenarioColumns);
  });
});

describe("ensureTables", () => {
  it("створює таблицю і не чіпає колонки, якщо вони вже є", async () => {
    const { db, statements } = fakeDb(scenarioColumns);
    await ensureTables(db, ["scenarios"]);

    expect(statements[0]).toMatch(/^CREATE TABLE IF NOT EXISTS "scenarios"/);
    expect(statements.filter((s) => s.startsWith("ALTER TABLE"))).toEqual([]);
  });

  it("додає рівно ті колонки, яких немає", async () => {
    const without = scenarioColumns.filter((name) => name !== "web_slug");
    const { db, statements } = fakeDb(without);
    await ensureTables(db, ["scenarios"]);

    const alters = statements.filter((s) => s.startsWith("ALTER TABLE"));
    expect(alters).toEqual(['ALTER TABLE "scenarios" ADD COLUMN web_slug TEXT DEFAULT NULL']);
  });

  it("створює і самі таблиці, а не тільки колонки", async () => {
    const { db, statements } = fakeDb(sitePageColumns());
    await ensureTables(db, ["sites", "site_pages", "templates"]);

    expect(statements.filter((s) => s.startsWith("CREATE TABLE"))).toHaveLength(3);
    expect(statements.some((s) => s.startsWith("CREATE INDEX"))).toBe(true);
  });

  it("повторний виклик нічого не додає (пам'ять на об'єкті db)", async () => {
    const { db, statements } = fakeDb(scenarioColumns);
    await ensureTables(db, ["scenarios"]);
    const afterFirst = statements.length;

    await ensureTables(db, ["scenarios"]);
    expect(statements.length).toBe(afterFirst);
  });
});

/** Колонки таблиці `site_pages` — щоб у тесті вище таблиця була «вже наявна». */
function sitePageColumns(): string[] {
  return declaredColumns(TABLES.site_pages).map((c) => c.name);
}
