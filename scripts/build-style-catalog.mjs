#!/usr/bin/env node
/**
 * Пише два документи, які виводяться з CSS: каталог вигляду
 * (`packages/shared/src/styles/catalog.json`) і палітру картки теми
 * (`packages/shared/src/styles/theme-palette.json`).
 *
 * Перелік токенів і кирпичиків руками не тримають, бо він розходиться з CSS на
 * першій же правці. Сторінка `/style` в адмінці показує каталог як інвентар
 * вигляду, а картка теми малює зразки з палітри — тож обидва мусять приходити
 * з того самого джерела.
 *
 * `--check` нічого не пише: порівнює файли з CSS і падає, якщо хоч один
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
import { PALETTE_FILE, renderThemePalette } from "./lib/theme-palette.mjs";

const checkOnly = process.argv.includes("--check");

/** Що виводиться з CSS і чим це перевіряється. */
const ARTIFACTS = [
  {
    file: CATALOG_FILE,
    render: renderCatalog,
    summary: (text) => {
      const catalog = JSON.parse(text);
      return (
        `${catalog.tokens.length} токенів, ` +
        `${catalog.local.length} місцевих мірок, ` +
        `${Object.values(catalog.classes)
          .flat()
          .reduce((n, group) => n + group.names.length, 0)} класів`
      );
    },
  },
  {
    file: PALETTE_FILE,
    render: renderThemePalette,
    summary: (text) => {
      const palette = JSON.parse(text);
      const themes = Object.values(palette.themes);
      return `палітра карток: ${themes.length} тем, ${palette.roles.length} ролей`;
    },
  },
];

let failed = false;

for (const artifact of ARTIFACTS) {
  try {
    const next = artifact.render();
    const path = join(ROOT, artifact.file);
    const current = existsSync(path) ? readFileSync(path, "utf8") : "";

    if (checkOnly) {
      if (current !== next) {
        console.error(
          `✗ ${artifact.file} застарів: CSS змінився, файл — ні.\n` +
            `  Перегенеруй: npm run doc:style`,
        );
        failed = true;
      } else {
        console.log(`✓ ${artifact.file} збігається з CSS.`);
      }
      continue;
    }

    writeFileSync(path, next);
    console.log(`✓ ${artifact.file}: ${artifact.summary(next)}.`);
  } catch (error) {
    console.error(`✗ ${artifact.file}: ${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
