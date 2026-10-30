#!/usr/bin/env node
/**
 * Пише каталог вигляду (`packages/shared/src/styles/catalog.json`) з CSS.
 *
 * Другий документ, який генерується (перший — `docs/API.md`): перелік токенів і
 * кирпичиків руками не тримають, бо він розходиться з CSS на першій же правці.
 * Сторінка `/style` в адмінці показує цей файл як інвентар вигляду.
 *
 * `--check` нічого не пише: порівнює файл із CSS і падає, якщо каталог
 * застарів. Саме цей режим стоїть у `npm run check:style` і в CI.
 *
 * Запуск: `npm run doc:style` (після зміни CSS).
 *
 * @module scripts/build-style-catalog
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/files.mjs";
import { CATALOG_FILE, renderCatalog } from "./lib/style-catalog.mjs";

const checkOnly = process.argv.includes("--check");

try {
  const next = renderCatalog();
  const path = join(ROOT, CATALOG_FILE);
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";

  if (checkOnly) {
    if (current !== next) {
      console.error(
        `✗ ${CATALOG_FILE} застарів: CSS змінився, каталог — ні.\n` +
          `  Перегенеруй: npm run doc:style`,
      );
      process.exitCode = 1;
    } else {
      console.log(`✓ Каталог вигляду збігається з CSS (${CATALOG_FILE}).`);
    }
  } else {
    writeFileSync(path, next);
    const catalog = JSON.parse(next);
    console.log(
      `✓ ${CATALOG_FILE}: ${catalog.tokens.length} токенів, ` +
        `${catalog.local.length} місцевих мірок, ` +
        `${Object.values(catalog.classes)
          .flat()
          .reduce((n, g) => n + g.names.length, 0)} класів.`,
    );
  }
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
