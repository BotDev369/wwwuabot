#!/usr/bin/env node
/*
 * Гейт «нуль інлайнових стилів» для адмінки.
 *
 * Правило продукту — вигляд живе в одному місці (`packages/shared/src/styles/`),
 * а не в розмітці. У блоках сторінок це вже так; в інтерфейсі адмінки лишився
 * борг, який цей скрипт рахує, не дає йому вирости й показує, скільки лишилось.
 *
 * `scripts/inline-styles-baseline.mjs` — знімок боргу: файл не може мати
 * більше `style={{`, ніж записано, новий файл із ними — помилка. Прибираєш
 * інлайн — зменшуй число в базі, інакше гейт попередить, що база застаріла.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { BASELINE } from "./inline-styles-baseline.mjs";

const ROOT = "web-admin-dev/src";
const PATTERN = /style=\{\{/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (path.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const actual = new Map();
for (const file of walk(ROOT)) {
  const count = (readFileSync(file, "utf8").match(PATTERN) ?? []).length;
  if (count > 0) actual.set(file, count);
}

const problems = [];
for (const [file, count] of actual) {
  const allowed = BASELINE.files[file];
  if (allowed === undefined)
    problems.push(`${file}: ${count} інлайнових стилів, файла немає в базі`);
  else if (count > allowed) problems.push(`${file}: ${count} > ${allowed} (база) — інлайн додано`);
  else if (count < allowed)
    problems.push(`${file}: ${count} < ${allowed} (база) — борг зменшено, зменш число в базі`);
}
for (const file of Object.keys(BASELINE.files)) {
  if (!actual.has(file))
    problems.push(`${file}: 0, а в базі ${BASELINE.files[file]} — файл чистий, прибери запис`);
}

const total = [...actual.values()].reduce((sum, n) => sum + n, 0);
if (total > BASELINE.total) problems.push(`разом ${total} > ${BASELINE.total} (база)`);

if (problems.length > 0) {
  console.error("✗ Інлайнові стилі в адмінці:");
  for (const problem of problems) console.error(`  • ${problem}`);
  process.exit(1);
}

console.log(`✓ Інлайнові стилі адмінки: ${total} у ${actual.size} файлах (база ${BASELINE.total})`);
