#!/usr/bin/env node
/**
 * Пише `docs/API.md` з роутера `api-dev` (див. `scripts/lib/api-routes.mjs`).
 *
 * Це єдиний документ, який генерується: список ендпоїнтів руками не тримають,
 * бо він бреше першим. `check:docs` порівнює файл із кодом, тож забути
 * перегенерувати не вийде.
 *
 * Запуск: `npm run doc:api` (після нової або зміненої адреси).
 *
 * @module scripts/doc-api
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/files.mjs";
import { API_DOC, renderApiDoc } from "./lib/api-routes.mjs";

try {
  const markdown = renderApiDoc();
  writeFileSync(join(ROOT, API_DOC), markdown);
  const routes = markdown.split("\n").filter((line) => line.startsWith("| `")).length;
  console.log(`✓ ${API_DOC} перегенеровано: ${routes} шляхів.`);
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
