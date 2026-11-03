/**
 * Міграції, що переписують `page_data`, мусять класти туди справжній JSON.
 *
 * Уже траплялось: лапки в SQL зайве екранували, у базу лягало `{\"version\"…}`,
 * `parsePageConfig` повертав null — і сторінка показувала «Сторінка тимчасово
 * недоступна». Тест читає кожен `SET page_data = '…'` із `scripts/migrations/`
 * і перевіряє, що це парситься як конфігурація сторінки.
 *
 * @module packages/shared/src/types/page-data-migrations.test
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parsePageConfig } from "./page-config.utils";

/** SQL-літерал у одинарних лапках; `''` — це одна лапка всередині. */
function sqlLiterals(sql: string): string[] {
  const values: string[] = [];
  const marker = "SET page_data = '";
  let from = sql.indexOf(marker);
  while (from !== -1) {
    let i = from + marker.length;
    let value = "";
    while (i < sql.length) {
      if (sql[i] === "'") {
        if (sql[i + 1] === "'") {
          value += "'";
          i += 2;
          continue;
        }
        break;
      }
      value += sql[i];
      i += 1;
    }
    values.push(value);
    from = sql.indexOf(marker, i);
  }
  return values;
}

const MIGRATIONS_DIR = join(process.cwd(), "scripts/migrations");

describe("page_data у міграціях", () => {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8") }))
    .map((file) => ({ ...file, values: sqlLiterals(file.sql) }))
    .filter((file) => file.values.length > 0);

  it("є хоч одна міграція зі сторінкою", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [file.name, file.values] as const))(
    "%s кладе валідний JSON без екранованих лапок",
    (_name, values) => {
      for (const value of values) {
        expect(value).not.toContain('\\"');
        expect(parsePageConfig(value)).not.toBeNull();
      }
    },
  );
});
