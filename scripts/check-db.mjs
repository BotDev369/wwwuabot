#!/usr/bin/env node
/**
 * Гейт схеми D1 — той самий принцип, що `check:css` для класів, але для таблиць.
 *
 * **Навіщо.** До 13.09.2026 DDL був розсипаний по чотирьох файлах, дві таблиці
 * (`users`, `mydate_analysis`) не створював **ніхто** — вони існували лише тому,
 * що їх колись завели руками в дашборді Cloudflare, — а `scenarios` і
 * `scenarios-admin` розійшлися колонками, бо кожен мав власний `CREATE TABLE`.
 * Це і є той «каша з таблицями», яку не видно ні в компіляторі, ні в тестах.
 *
 * **Що перевіряється:**
 *
 *   1. `CREATE TABLE` дозволений лише в реєстрі
 *      (`packages/shared/src/database/tables.ts`). Будь-де інде — помилка.
 *   2. Кожне ім'я таблиці в SQL (`FROM` / `INTO` / `UPDATE` / `JOIN`) мусить
 *      бути оголошене в реєстрі. Друкарська помилка в імені — помилка гейта,
 *      а не «порожній результат» у рантаймі.
 *   3. `ALTER TABLE` — лише для оголошених таблиць (схема не народжується з
 *      помилки SQLite під час запису).
 *   4. `ensureTables(db, ["…"])` мусить називати оголошені таблиці.
 *   5. Сам реєстр консистентний: імена з ключів і з DDL — це один і той самий
 *      набір.
 *
 * **Чому ключові слова шукаються у верхньому регістрі.** SQL у цьому проєкті
 * пишеться великими літерами, і на цьому гейт стоїть: інакше `import … from
 * "react"` — це «таблиця react», а `log("update received")` — «таблиця
 * received». Такі хибні спрацювання змусили б тримати список виключень, який
 * довелось би поповнювати після кожного нового рядка логу.
 *
 * Запуск: `npm run check:db` (той самий крок у CI).
 *
 * @module scripts/check-db
 */

import { join } from "node:path";
import { allSourceFiles, read, stripComments } from "./lib/files.mjs";

/** Єдиний файл, якому дозволено оголошувати схему. */
const REGISTRY = join("packages", "shared", "src", "database", "tables.ts");

/** Службові таблиці SQLite — вони не наші, оголошувати їх не треба. */
const BUILTIN_TABLES = new Set(["sqlite_master", "sqlite_schema", "pragma_table_info"]);

/**
 * SQL у коді — тільки верхній регістр. Це не смак: саме так гейт відрізняє
 * `FROM users` від `from "react"` і `update received`.
 */
const FROM_RE = /(?<![A-Za-z0-9_.])(?:FROM|INTO|UPDATE|JOIN)\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g;
const ALTER_RE = /(?<![A-Za-z0-9_.])ALTER\s+TABLE\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g;

/**
 * Ключові слова, які `UPDATE`/`FROM`-подібний шаблон може прийняти за ім'я
 * таблиці: `DO UPDATE SET …`, `INSERT INTO … SELECT`. Це не таблиці.
 */
const SQL_KEYWORDS = new Set([
  "SET",
  "SELECT",
  "VALUES",
  "WHERE",
  "DEFAULT",
  "NULL",
  "OR",
  "NOT",
  "EXISTS",
  "DUAL",
  "LATERAL",
  "ORDER",
  "GROUP",
]);

const errors = [];

/** SQL у коді, а не в коментарі. */
function sqlOf(file) {
  return stripComments(read(file));
}

// ── 1. Реєстр: імена з ключів проти імен з DDL ─────────────────────────────

const registry = read(REGISTRY);

const declared = new Set([...registry.matchAll(/^\s*name:\s*"([^"]+)",/gm)].map((m) => m[1]));
const inDdl = new Set(
  [...registry.matchAll(/CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/g)].map(
    (m) => m[1],
  ),
);

if (declared.size === 0) {
  errors.push(`${REGISTRY}: реєстр порожній — не знайдено жодного оголошення таблиці.`);
}
for (const name of inDdl) {
  if (!declared.has(name)) errors.push(`${REGISTRY}: у DDL є «${name}», але немає оголошення.`);
}
for (const name of declared) {
  if (!inDdl.has(name)) errors.push(`${REGISTRY}: «${name}» оголошена, але DDL її не створює.`);
}

// ── 2. Код: таблиці можна створювати тільки через реєстр ───────────────────

const files = allSourceFiles();

for (const file of files) {
  const text = sqlOf(file);
  text.split("\n").forEach((line, i) => {
    if (!/CREATE\s+TABLE/i.test(line)) return;
    if (file === REGISTRY) return;
    errors.push(
      `${file}:${i + 1} — \`CREATE TABLE\` поза реєстром. Оголоси таблицю в ${REGISTRY} ` +
        `і створи її через \`ensureTables(db, ["…"])\`.`,
    );
  });
}

// ── 3. Імена таблиць у SQL мусять бути оголошені ───────────────────────────

for (const file of files) {
  const text = sqlOf(file);
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(FROM_RE)) {
      const name = m[1];
      if (BUILTIN_TABLES.has(name) || SQL_KEYWORDS.has(name) || declared.has(name)) continue;
      errors.push(
        `${file}:${i + 1} — таблиця «${name}» не оголошена в ${REGISTRY}. ` +
          `Якщо це друкарська помилка — вона пройшла б геть усі інші гейти.`,
      );
    }
    for (const m of line.matchAll(ALTER_RE)) {
      const name = m[1];
      // `${...}` у шаблоні не збігається з цим шаблоном, тому реєстр із
      // динамічним `ALTER TABLE "${def.name}"` сюди не попадає.
      if (declared.has(name)) continue;
      errors.push(`${file}:${i + 1} — \`ALTER TABLE ${name}\`: таблиця не оголошена.`);
    }
  });
}

// ── 4. Виклики ensureTables мусять називати оголошені таблиці ───────────────

for (const file of files) {
  const text = sqlOf(file);
  for (const m of text.matchAll(/ensureTables\(\s*[^,()]+,\s*\[([^\]]*)\]/g)) {
    for (const name of [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1])) {
      if (!declared.has(name)) {
        errors.push(`${file} — \`ensureTables\` кличе «${name}», якої немає в ${REGISTRY}.`);
      }
    }
  }
}

// ── 5. Реєстр не має залишитись без читачів ────────────────────────────────
// Файл, який ніхто не імпортує, «живе» лише доти, доки про нього памʼятають.

const importers = allSourceFiles().filter(
  (file) => file !== REGISTRY && /database\/tables/.test(read(file)),
);

if (importers.length === 0) {
  errors.push(`${REGISTRY}: схему ніхто не імпортує — таблиці створюються повз реєстр.`);
}

// ── Звіт ──────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error("✗ Схема D1 не пройшла перевірку:\n");
  for (const error of errors) console.error(`  ${error}`);
  console.error(
    "\nВиправлення: оголоси таблицю в packages/shared/src/database/tables.ts " +
      'і створи її через ensureTables(db, ["…"]).\n',
  );
  process.exitCode = 1;
} else {
  const tables = [...declared].sort().join(", ");
  console.log(
    `✓ Схема D1: ${declared.size} таблиць — ${tables}; поза реєстром не створюється жодна.`,
  );
}
