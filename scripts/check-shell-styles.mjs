/**
 * Гейт «у оболонок немає власного CSS».
 *
 * **Правило.** Увесь вигляд продукту живе в `packages/shared/src/styles/`;
 * `index.css` кожної оболонки — це лише `@import` (вхід спільного шару плюс
 * свій шар із того ж пакета). Своє правило в `web-…/src` — це другий вигляд,
 * який розійдеться з першим на першій же правці палітри.
 *
 * **Чому окремий гейт.** `check:css` стежить, що клас має правило, але не
 * питає, **де** це правило. Досить було одного файлу в оболонці, щоб правило
 * жило повз спільний шар і ніхто цього не помітив.
 *
 * @module scripts/check-shell-styles
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ROOT, SHELLS, isCss, walk } from "./lib/files.mjs";

const files = SHELLS.flatMap((shell) => walk(join(shell, "src"), isCss));

/** Коментарі не рахуються: пояснення в `index.css` — не правило. */
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");

const problems = [];
for (const file of files) {
  const text = stripComments(readFileSync(join(ROOT, file), "utf8"));
  for (const statement of text.split(";")) {
    const body = statement.trim();
    if (!body || body.startsWith("@import")) continue;
    const line = text.slice(0, text.indexOf(statement)).split("\n").length;
    problems.push(`${file}:${line} — ${body.split("\n")[0].slice(0, 60)}`);
  }
}

if (problems.length > 0) {
  console.error("✗ Власний CSS в оболонці — вигляд мусить жити в спільному шарі:");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("  Перенеси правило в `packages/shared/src/styles/` (свій шар оболонки).");
  process.exit(1);
}

console.log(`✓ CSS оболонок: ${files.length} файлів — лише @import, власних правил 0.`);
