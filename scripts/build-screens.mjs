#!/usr/bin/env node
/**
 * Seed екранів платформи: `registry.json` → SQL.
 *
 * Реєстр — **дані**, а не розмітка: назви, батьки, меню й порядок живуть у
 * `packages/shared/src/screens/registry.json`, і звідти ж читає код. Міграція
 * не пишеться руками, бо два списки розійшлися б на першій правці.
 *
 * `npm run doc:screens` переписує файл, `--check` лише звіряє (гейт).
 *
 * @module scripts/build-screens
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REGISTRY = join(ROOT, "packages/shared/src/screens/registry.json");
const MIGRATIONS = join(ROOT, "scripts/migrations");

/** Один рядок UPSERT: ключ — ідентичність, решта оновлюється. */
function upsert(screen) {
  const sqlText = (value) => (value === null ? "NULL" : `'${String(value).replace(/'/g, "''")}'`);
  return `INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES (${sqlText(screen.key)}, ${sqlText(screen.parent)}, ${sqlText(screen.title)},
        ${sqlText(screen.icon)}, ${screen.sort}, ${screen.inMenu ? 1 : 0}, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;`;
}

/**
 * Слова, які вже лежать у `platform_pages`, переїжджають **копіюванням**, а не
 * переписуванням: 7.2 перенесе решту екранів, і жодне слово не має загубитись
 * на переїзді. Умова `page_data IS NULL` робить крок одноразовим, тож
 * повторний прогін не затирає правок.
 */
const COPY_TEXTS = `UPDATE platform_screens
   SET page_data = (
         SELECT page_data FROM platform_pages
          WHERE platform_pages.slug = platform_screens.key
       )
 WHERE page_data IS NULL
   AND EXISTS (
         SELECT 1 FROM platform_pages
          WHERE platform_pages.slug = platform_screens.key
       );`;

/** Той самий текст, що мусить лежати у файлі міграції. */
export function renderMigration() {
  const screens = JSON.parse(readFileSync(REGISTRY, "utf8"));
  return [
    "-- Згенеровано з `packages/shared/src/screens/registry.json` — не правити руками.",
    "-- Перегенерувати: `npm run doc:screens`; свіжість стереже `npm run check:screens`.",
    "-- Ідемпотентно: ключ — ідентичність, повторний прогін оновлює той самий рядок.",
    "",
    ...screens.map(upsert),
    "",
    COPY_TEXTS,
    "",
    "SELECT key, parent_key, title, in_menu, length(page_data) AS bytes",
    "  FROM platform_screens ORDER BY sort_order, key;",
    "",
  ].join("\n");
}

/** Актуальний файл міграції: один на реєстр, без дат у назві. */
export function migrationFile() {
  const existing = readdirSync(MIGRATIONS).find((name) => name.endsWith("-screens-registry.sql"));
  return existing ? join(MIGRATIONS, existing) : null;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const file = migrationFile();
  if (!file) {
    console.error("✗ Немає файлу *-screens-registry.sql у scripts/migrations/");
    process.exit(1);
  }
  const expected = renderMigration();
  const actual = readFileSync(file, "utf8");
  if (check) {
    if (expected !== actual) {
      console.error(`✗ ${file} розійшовся з registry.json — запусти npm run doc:screens`);
      process.exit(1);
    }
    console.log("✓ seed екранів збігається з реєстром");
  } else {
    writeFileSync(file, expected);
    console.log(`✓ ${file}`);
  }
}
