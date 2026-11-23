#!/usr/bin/env node
/**
 * Гейт реєстру екранів: **один** список мусить бути несуперечливим.
 *
 * Перевіряє те, що інакше ламається мовчки: дубль ключа чи адреси, батько, якого
 * немає, цикл у крохах, меню з екрана без адреси, і розбіжність згенерованої
 * міграції з `registry.json`.
 *
 * Карта `key → компонент` живе в коді (React-компонент не буває даними), і її
 * повноту перевіряє тест `web-platform-dev/src/app/screen-routes.test.tsx`.
 *
 * @module scripts/check-screens
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderMigration, migrationFile } from "./build-screens.mjs";

const ROOT = process.cwd();
const REGISTRY = join(ROOT, "packages/shared/src/screens/registry.json");
const KEY = /^[a-z][a-z0-9]*(?:\.[a-z0-9]+)*$/;
const PATH = /^\/[A-Za-z0-9:/*-]*$/;

const screens = JSON.parse(readFileSync(REGISTRY, "utf8"));
const errors = [];

/** Один прохід: форма, унікальність, батько, цикл. */
const byKey = new Map();
for (const screen of screens) {
  if (!KEY.test(screen.key)) errors.push(`ключ «${screen.key}» не за граматикою`);
  if (byKey.has(screen.key)) errors.push(`ключ «${screen.key}» повторюється`);
  byKey.set(screen.key, screen);
  if (typeof screen.title !== "string" || screen.title.trim() === "")
    errors.push(`«${screen.key}» без назви`);
  if (!Number.isInteger(screen.sort)) errors.push(`«${screen.key}»: sort не число`);
  if (typeof screen.inMenu !== "boolean") errors.push(`«${screen.key}»: inMenu не boolean`);
  if (screen.icon !== null && typeof screen.icon !== "string")
    errors.push(`«${screen.key}»: icon не рядок`);
  if (screen.path !== null && !PATH.test(screen.path))
    errors.push(`«${screen.key}»: адреса «${screen.path}» не за граматикою`);
  if (screen.inMenu && screen.path === null) errors.push(`«${screen.key}»: пункт меню без адреси`);
  if (screen.inMenu && !screen.icon) errors.push(`«${screen.key}»: пункт меню без знака (icon)`);
}

const paths = new Map();
for (const screen of screens) {
  if (screen.path !== null) {
    const twin = paths.get(screen.path);
    if (twin) errors.push(`адреса «${screen.path}» у «${twin}» і «${screen.key}»`);
    paths.set(screen.path, screen.key);
  }
  if (screen.parent !== null && !byKey.has(screen.parent))
    errors.push(`«${screen.key}»: батька «${screen.parent}» немає`);
  let cursor = screen;
  const seen = new Set();
  while (cursor.parent) {
    if (seen.has(cursor.key)) {
      errors.push(`цикл у крохах: «${screen.key}»`);
      break;
    }
    seen.add(cursor.key);
    cursor = byKey.get(cursor.parent);
    if (!cursor) break;
  }
}

const file = migrationFile();
if (!file) errors.push("немає scripts/migrations/*-screens-registry.sql");
else if (readFileSync(file, "utf8") !== renderMigration())
  errors.push(`${file} розійшовся з registry.json — запусти npm run doc:screens`);

if (errors.length) {
  console.error("✗ Реєстр екранів:");
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}

console.log(`✓ Реєстр екранів: ${screens.length} рядків, ${paths.size} адрес, без розбіжностей`);
