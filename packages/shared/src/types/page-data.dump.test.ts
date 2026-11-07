/**
 * Живий дамп `scenarios` проти схем блоків — звіт у складі тестів.
 *
 * `backups/` gitignored, тож у CI перевірка пропускається, а локально каже
 * числом, що в базі розійшлося з оголошеннями. Помилка → червоний тест.
 *
 * @module packages/shared/src/types/page-data.dump.test
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePageConfig } from "./page-config.utils";
import { countPageDataIssues, validatePageConfig } from "./page-config.validate";

/** Каталог дампів у корені репозиторію (рядок вище пакета й `src`). */
const BACKUPS = fileURLToPath(new URL("../../../../backups/", import.meta.url));

/**
 * Найновіший дамп, у якому справді є `page_data`.
 *
 * Не «найновіший файл із схожою назвою»: поруч лежать звіти (`SELECT id, slug`),
 * і тоді перевірка мовчки дивилася б на інше, ніж база.
 */
function latestDump(): string | null {
  if (!existsSync(BACKUPS)) return null;
  const name = readdirSync(BACKUPS)
    .filter((file) => /^dev-scenarios-.*\.json$/.test(file))
    .sort()
    .reverse()
    .find((file) => {
      try {
        const rows = JSON.parse(readFileSync(`${BACKUPS}${file}`, "utf8"))[0]?.results ?? [];
        return rows.length > 0 && rows.some((row: Record<string, unknown>) => "page_data" in row);
      } catch {
        return false;
      }
    });
  return name ? `${BACKUPS}${name}` : null;
}

const DUMP = latestDump();

describe.skipIf(!DUMP)("page_data у базі", () => {
  it("не має помилок проти схем блоків", () => {
    const rows: { slug: string; page_data: string | null }[] = JSON.parse(
      readFileSync(DUMP as string, "utf8"),
    )[0].results;

    let pages = 0;
    let errors = 0;
    let warnings = 0;
    const details: string[] = [];

    for (const row of rows) {
      const config = parsePageConfig(row.page_data);
      if (!config) continue;
      pages += 1;
      const issues = validatePageConfig(config);
      const counts = countPageDataIssues(issues);
      errors += counts.errors;
      warnings += counts.warnings;
      for (const issue of issues.filter((item) => item.severity === "error")) {
        details.push(`${row.slug} ${issue.path}: ${issue.message}`);
      }
    }

    console.log(
      `page_data: сторінок ${pages}, помилок ${errors}, попереджень ${warnings} (${DUMP})`,
    );
    expect(details).toEqual([]);
  });
});
