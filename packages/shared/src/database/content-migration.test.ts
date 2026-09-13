/**
 * Сторож міграції контенту: `scripts/migrate-content.sql` проти реєстру таблиць.
 *
 * Навіщо тест на SQL-файл. Міграція — це код, який виконується **один раз** і
 * на живій базі, тобто помилка в ній не проявляється ні в тестах, ні в
 * компіляторі. Тому перевіряємо саме ті розбіжності, які нічим іншим не
 * видно:
 *
 *   1. **Міграція нічого не руйнує** — жодного `DELETE`, `DROP`, `UPDATE` чи
 *      `OR REPLACE`: легасі-таблиці лишаються недоторканими, і відкат
 *      можливий.
 *   0. **Адреса в SQL — та сама, що в реєстрі.** `codeword` як окремої колонки
 *      немає, а колонки кожної інструкції мусять дорівнювати оголошеним у
 *      реєстрі — тож «забув прибрати колонку з переносу» неможливо.
 *   2. **SQL не знає власного DDL** — `CREATE TABLE` тут заборонено: схема
 *      живе в реєстрі, інакше вона знову розійдеться на дві правди.
 *   3. **Колонки збігаються з реєстром** — якщо в `pages` додадуть колонку й
 *      забудуть міграцію (або навпаки), це помилка, а не «ну, майже те саме».
 *   4. **Всі три джерела на місці** і кожне має охоронця `id`, тому
 *      повторний запуск не створить дублів.
 *
 * @module packages/shared/src/database/content-migration.test
 */

/// <reference types="node" />
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { declaredColumns } from "./ensure-tables";
import { TABLE_NAMES, TABLES } from "./tables";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const SQL = readFileSync(`${REPO_ROOT}/scripts/migrate-content.sql`, "utf8");

/** SQL без коментарів: пояснення не мусять вважатись інструкціями. */
const BODY = SQL.replace(/^\s*--.*$/gm, "");

/** Легасі-джерела міграції та префікс `id`, яким позначається кожен рядок. */
const SOURCES = [
  { table: "scenarios", prefix: "sc:" },
  { table: "sites", prefix: "site:" },
  { table: "site_pages", prefix: "sp:" },
] as const;

/**
 * Імена CTE (`WITH src AS …`, `ranked AS …`).
 *
 * Без цього `FROM src` виглядає як таблиця `src` — і перевірка «читаємо лише
 * оголошені таблиці» падала б на кожній інструкції.
 */
function cteNames(): Set<string> {
  const names = new Set<string>();
  for (const match of BODY.matchAll(/(?:\bWITH|,)\s+([A-Za-z_][A-Za-z0-9_]*)\s+AS\s*\(/g)) {
    names.add(match[1]);
  }
  return names;
}

/** Усі імена таблиць, згадані в SQL (без CTE). */
function tablesInSql(): string[] {
  const ctes = cteNames();
  const found = new Set<string>();
  for (const re of [
    /\bINSERT INTO\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g,
    /\bFROM\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g,
    /\bJOIN\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g,
  ]) {
    for (const match of BODY.matchAll(re)) {
      if (!ctes.has(match[1])) found.add(match[1]);
    }
  }
  return [...found];
}

/** Колонки з кожної інструкції `INSERT INTO pages (…)`. */
function insertColumnLists(): string[][] {
  return [...BODY.matchAll(/INSERT INTO pages \(([\s\S]*?)\)/g)].map((match) =>
    match[1]
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
}

describe("міграція контенту: безпека", () => {
  it("тільки додає — нічого не видаляє й не перезаписує", () => {
    for (const forbidden of [/\bDELETE\b/, /\bDROP\b/, /\bUPDATE\b/, /OR\s+REPLACE/i]) {
      expect(BODY).not.toMatch(forbidden);
    }
  });

  it("не оголошує схему сам — DDL лишається в реєстрі", () => {
    expect(BODY).not.toMatch(/CREATE\s+TABLE/i);
  });

  it("пише лише в `pages` і читає лише оголошені таблиці", () => {
    const written = [...BODY.matchAll(/INSERT INTO\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g)].map(
      (match) => match[1],
    );
    expect(new Set(written)).toEqual(new Set(["pages"]));

    for (const table of tablesInSql()) {
      expect(TABLE_NAMES).toContain(table);
    }
  });

  it("кожен CTE справді оголошений (інакше `FROM src` — це таблиця)", () => {
    for (const name of cteNames()) {
      expect(tablesInSql()).not.toContain(name);
    }
  });
});

describe("міграція контенту: схема", () => {
  it("`pages` оголошена з єдиною унікальною адресою", () => {
    expect(TABLE_NAMES).toContain("pages");
    const indexes = TABLES.pages.indexes ?? [];
    expect(indexes.some((sql) => /UNIQUE INDEX.*\(slug\)$/.test(sql))).toBe(true);
    // Другої колонки адреси немає — це і є те, що прибрали: `codeword`
    // і `web_slug` були тим самим рядком у двох колонках.
    expect(declaredColumns(TABLES.pages).map((column) => column.name)).not.toContain("codeword");
  });

  it("колонки в SQL — це рівно колонки `pages` з реєстру", () => {
    const declared = declaredColumns(TABLES.pages)
      .map((column) => column.name)
      .sort();
    for (const columns of insertColumnLists()) {
      expect([...columns].sort()).toEqual(declared);
    }
  });

  it("кожне джерело переноситься зі своїм набором колонок", () => {
    expect(insertColumnLists()).toHaveLength(SOURCES.length);
  });

  /**
   * Адресу рахує **кожне** джерело тим самим виразом. Це не стилістика: якщо
   * одне джерело нормалізує інакше, з'явиться адреса, якої не бачить
   * охоронець унікальності, — і та сама сторінка матиме два `slug`.
   */
  it("усі джерела нормалізують адресу однаково", () => {
    expect(BODY.split("lower(").length - 1).toBe(SOURCES.length);
    expect(BODY.split("'_', '-'").length - 1).toBe(SOURCES.length);
  });

  it("кожна інструкція відкидає некоректну адресу, а не вставляє її", () => {
    expect(BODY.split("GLOB '*[^a-z0-9/-]*'").length - 1).toBe(SOURCES.length);
  });

  /**
   * Сторінка сайту їде тільки разом зі своєю групою. Якщо сайт лишився в
   * легасі-таблиці (його адресу зайняв інший рядок), дитина без нього — сирота:
   * навігація обчислюється з групи, тож таку сторінку не побачить ніхто.
   */
  it("дитина не переїжджає без своєї групи", () => {
    expect(BODY).toContain("AND EXISTS (SELECT 1 FROM pages p WHERE p.id = r.parent_id)");
  });
});

describe("міграція контенту: повторний запуск", () => {
  it("усі три легасі-таблиці на місці", () => {
    const tables = tablesInSql();
    for (const { table } of SOURCES) expect(tables).toContain(table);
  });

  it("кожне джерело має детермінований `id`", () => {
    for (const { prefix } of SOURCES) {
      expect(BODY).toContain(`'${prefix}' ||`);
    }
  });

  it("кожна інструкція має охоронця `id` і охоронця адреси", () => {
    expect(
      BODY.match(/NOT EXISTS \(SELECT 1 FROM pages p WHERE p\.id = r\.id\)/g) ?? [],
    ).toHaveLength(SOURCES.length);
    expect(BODY.match(/p\.slug = r\.slug/g) ?? []).toHaveLength(SOURCES.length);
  });

  /**
   * Найважливіша деталь усієї міграції: `NOT EXISTS` усередині `INSERT … SELECT`
   * бачить таблицю **до** вставки, тож двоє рядків з однаковою адресою проходять
   * охоронця обидва, і `UNIQUE`-індекс валить **усю** інструкцію. Саме тому
   * адреса спочатку ранжується, і береться один представник.
   */
  it("дублі адрес усередині джерела лишаються одному рядку", () => {
    const ranked = BODY.match(/ROW_NUMBER\(\) OVER \(/g) ?? [];
    expect(ranked).toHaveLength(SOURCES.length);
    expect(BODY.match(/WHERE r\.pick = 1/g) ?? []).toHaveLength(SOURCES.length);
  });
});
