#!/usr/bin/env node
/**
 * Міграція контенту в одну таблицю: `scenarios` + `scenarios-admin` + `sites` +
 * `site_pages` → `pages`.
 *
 * **Навіщо окремий скрипт, а не код воркера.** DDL не дублюється: схему скрипт
 * бере з реєстру (`packages/shared/src/database/tables.ts`) — тим самим
 * прийомом, що й гейт `check:db`. Тому тут немає жодного `CREATE TABLE` з
 * власним текстом, а `pages` створюється рівно так, як її створить воркер.
 *
 * **Чому не через `ensureTables`.** Міграція — не те, що мусить виконуватись у
 * воркері на кожному запиті: вона запускається один раз, руками або кроком у
 * CI, і її SQL корисніше бачити очима. Тому SQL живе окремим файлом
 * (`migrate-content.sql`), а цей скрипт його збирає, застосовує й звітує.
 *
 * Запуск:
 *   node scripts/migrate-content.mjs --dry-run          # показати SQL, нічого не робити
 *   node scripts/migrate-content.mjs                    # локальна база (wrangler --local)
 *   node scripts/migrate-content.mjs --remote           # дев-база (потрібні CF_API_TOKEN)
 *
 * @module scripts/migrate-content
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ROOT, read } from "./lib/files.mjs";

/** Єдиний файл, якому дозволено оголошувати схему (той самий, що в `check:db`). */
const REGISTRY = join("packages", "shared", "src", "database", "tables.ts");

/** Файл із самим переносом рядків. */
const MIGRATION = join("scripts", "migrate-content.sql");

/** ── Аргументи ─────────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
let target = "local";
let config = join("api-dev", "wrangler.toml");
let database = "DB";
/** Тека локального стану D1. Потрібна, коли треба перевірити на копії. */
let persist = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--local") target = "local";
  else if (arg === "--remote") target = "remote";
  else if (arg === "--config") config = args[++i];
  else if (arg === "--database") database = args[++i];
  else if (arg === "--persist") persist = args[++i];
  else if (arg === "--dry-run") dryRun = true;
  else {
    console.error(`Невідомий аргумент: ${arg}`);
    console.error("Дозволені: --local --remote --config <шлях> --database <ім’я|біндинг>");
    console.error("          --persist <тека> --dry-run");
    process.exit(1);
  }
}

/** ── Схема з реєстру ───────────────────────────────────────────────────── */

/**
 * Чи це повна DDL-інструкція, а не згадка про неї в коментарі.
 *
 * Форма перевіряється **повністю** — не за початком рядка: у шапці реєстру
 * є проза `` `CREATE TABLE IF NOT EXISTS` `` і `` `ALTER TABLE … ADD COLUMN` ``,
 * і перша версія скрипта прийняла першу за справжню інструкцію. Тоді в
 * згенерований файл потрапляло `CREATE TABLE IF NOT EXISTS;` — SQLite
 * відповідав `incomplete input`, і падало все, хоч реєстр був цілий.
 */
function isStatement(text) {
  return (
    /^CREATE TABLE IF NOT EXISTS\s+"?[A-Za-z_][A-Za-z0-9_-]*"?\s*\([\s\S]*\)$/.test(text) ||
    /^CREATE (UNIQUE )?INDEX IF NOT EXISTS\s+"?[A-Za-z_][A-Za-z0-9_-]*"?\s+ON\s/.test(text)
  );
}

/**
 * `CREATE TABLE` / `CREATE INDEX` із реєстру.
 *
 * Витягуємо з тексту файлу, а не парсимо TS: так само робить `check:db`, і
 * сенс той самий — джерело правди одне.
 *
 * Шаблон **прив'язаний до початку литералу** (зворотна галочка одразу перед
 * `CREATE`), а не до пари галочок. Перша версія шукала пари `` `…` `` і
 * загубила `CREATE UNIQUE INDEX … idx_pages_slug`, бо зворотні галочки
 * в коментарях зсували парування. Загублена інструкція не ламала нічого
 * голосно: таблиця створювалась без унікального індексу, і два рядки могли
 * дістати ту саму адресу. Тепер таке ловить ще й перевірка схеми нижче.
 */
function registryDdl() {
  return [...registryText.matchAll(/`(CREATE (?:TABLE|UNIQUE INDEX|INDEX)[^`]*)`/g)]
    .map((match) => match[1].trim())
    .filter(isStatement);
}

const registryText = read(REGISTRY);
const ddl = registryDdl();

/** Ім'я таблиці або індексу з інструкції — щоб потім звірити з базою. */
function statementName(text) {
  return (
    /^CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/.exec(text)?.[1] ??
    /^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/.exec(text)?.[1]
  );
}

const expectedNames = ddl.map(statementName).filter(Boolean);

/** Імена з оголошень реєстру — той самий прийом, що в `check:db`. */
const declaredNames = new Set(
  [...registryText.matchAll(/^\s*name:\s*"([^"]+)",/gm)].map((match) => match[1]),
);

/** Імена, які скрипт справді дістав із `CREATE TABLE`. */
const extractedNames = new Set(
  ddl
    .map((text) => /^CREATE TABLE IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/.exec(text)?.[1])
    .filter(Boolean),
);

/**
 * Якщо витягнуто не все — краще зупинитись, ніж застосувати половину схеми:
 * половина таблиць означала б `no such table` під час міграції, але **тихо
 * пропущений** індекс не проявився б ніяк.
 */
const missing = [...declaredNames].filter((name) => !extractedNames.has(name));
if (missing.length) {
  console.error(
    `✗ З ${REGISTRY} витягнуто ${extractedNames.size} з ${declaredNames.size} таблиць. ` +
      `Не знайдено: ${missing.join(", ")}.`,
  );
  process.exit(1);
}

if (!extractedNames.has("pages")) {
  console.error(`✗ У реєстрі (${REGISTRY}) немає таблиці \`pages\` — міграції нікуди писати.`);
  process.exit(1);
}

const combined = [
  "-- ЗГЕНЕРОВАНО: scripts/migrate-content.mjs — не правити руками.",
  "-- Схема: packages/shared/src/database/tables.ts (реєстр таблиць).",
  ...ddl.map((text) => `${text.trim()};`),
  "",
  read(MIGRATION),
].join("\n");

if (dryRun) {
  console.log(combined);
  console.log(`\n— dry-run: нічого не виконано (${ddl.length} DDL-інструкцій із реєстру).`);
  process.exit(0);
}

/** ── Wrangler ──────────────────────────────────────────────────────────── */

/** Один виклик `wrangler d1 execute`. Повертає stdout. */
function d1(extra) {
  const argv = [
    "--no-install",
    "wrangler",
    "d1",
    "execute",
    database,
    "--config",
    config,
    "--yes",
    target === "remote" ? "--remote" : "--local",
    ...(persist ? ["--persist-to", persist] : []),
    ...extra,
  ];
  return execFileSync("npx", argv, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

/** `SELECT`, результат якого потрібен у звіті. */
function query(sql) {
  const out = d1(["--command", sql, "--json"]);
  const start = out.indexOf("[");
  if (start === -1) throw new Error(`wrangler не повернув JSON:\n${out}`);
  const parsed = JSON.parse(out.slice(start));
  return parsed[parsed.length - 1]?.results ?? [];
}

/** ── Звіт ──────────────────────────────────────────────────────────────── */

/** Скільки рядків у легасі-таблицях і скільки з них доїхало. */
const TOTALS = `SELECT
  (SELECT COUNT(*) FROM scenarios) AS scenarios_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'sc:%') AS scenarios_migrated,
  (SELECT COUNT(*) FROM "scenarios-admin") AS admin_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'sa:%') AS admin_migrated,
  (SELECT COUNT(*) FROM sites) AS sites_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'site:%') AS sites_migrated,
  (SELECT COUNT(*) FROM site_pages) AS site_pages_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'sp:%') AS site_pages_migrated`;

/**
 * Рядки, які **не** перенеслись: конфлікт адреси чи `codeword`, або сирота.
 *
 * Друкуємо на ім'я, бо рішення тут — не за скриптом: два рядки можуть мати
 * той самий `codeword`, і вибрати за власника «правильний» означало б тихо
 * втратити чужий контент.
 */
/**
 * Адреси, які **всередині однієї легасі-таблиці** належать кільком рядкам.
 *
 * Це найчастіша причина пропуску: `web_slug` у сценаріїв не був унікальним,
 * тож дві сторінки могли претендувати на одну адресу. Показуємо обидва
 * `codeword`-и — рішення «яка з них головна» за власником, не за скриптом.
 */
const DUPLICATE_ADDRESSES = `SELECT 'scenarios' AS source, codeword FROM scenarios
  WHERE (CASE WHEN codeword = '__base__' THEN ''
              ELSE COALESCE(NULLIF(TRIM(COALESCE(web_slug, ''), '/'), ''), codeword) END)
    IN (SELECT COALESCE(NULLIF(TRIM(COALESCE(web_slug, ''), '/'), ''), codeword) AS slug
        FROM scenarios GROUP BY slug HAVING COUNT(*) > 1)
UNION ALL
SELECT 'scenarios-admin', codeword FROM "scenarios-admin"
  WHERE (CASE WHEN codeword = '__base__' THEN ''
              ELSE COALESCE(NULLIF(TRIM(COALESCE(web_slug, ''), '/'), ''), codeword) END)
    IN (SELECT COALESCE(NULLIF(TRIM(COALESCE(web_slug, ''), '/'), ''), codeword) AS slug
        FROM "scenarios-admin" GROUP BY slug HAVING COUNT(*) > 1)`;

const SKIPPED = `SELECT 'scenarios' AS source, COALESCE(codeword, '') AS key FROM scenarios
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'sc:' || scenarios.codeword)
UNION ALL
SELECT 'scenarios-admin', COALESCE(codeword, '') FROM "scenarios-admin"
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'sa:' || "scenarios-admin".codeword)
UNION ALL
SELECT 'sites', slug FROM sites
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'site:' || sites.id)
UNION ALL
SELECT 'site_pages', sp.id FROM site_pages sp
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'sp:' || sp.id)`;

console.log(`▶ Застосовую міграцію (${target === "remote" ? "ВІДДАЛЕНА база" : "локальна база"})…`);

const generated = join(dirname(config), ".wrangler", "migrate-content.sql");
mkdirSync(dirname(join(ROOT, generated)), { recursive: true });
writeFileSync(join(ROOT, generated), combined, "utf8");

d1(["--file", generated]);

console.log(`✓ Застосовано. Зібраний SQL: ${generated} (тека .wrangler ігнорується git-ом).`);

// ── Перевірка схеми ───────────────────────────────────────────────────────
// Зібрали N інструкцій — мусить створитись N об'єктів. Розбіжність означала б,
// що частина схеми не доїхала, і це саме той випадок, коли «нічого не видно»
// гірше за помилку: таблиця без унікального індексу тихо приймає дублі.
//
// Перевіряється **і таблиця-власник** індексу, а не лише ім'я. У SQLite імена
// індексів глобальні для бази, тому `CREATE UNIQUE INDEX IF NOT EXISTS` з чужим
// іменем не помилка — а нічого не робить. Саме так `idx_pages_slug`,
// зайнятий `site_pages`, залишив `pages` без унікальності адреси.
const existing = new Map(
  query(`SELECT name, tbl_name FROM sqlite_master WHERE type IN ('table', 'index')`).map((row) => [
    row.name,
    row.tbl_name,
  ]),
);

const notCreated = expectedNames.filter((name) => !existing.has(name));
if (notCreated.length) {
  console.error(`\n✗ Схема неповна — не створено: ${notCreated.join(", ")}`);
  console.error(`  Зібрано інструкцій: ${ddl.length}. Перевір ${REGISTRY}.`);
  process.exit(1);
}

const wrongOwner = ddl
  .map((text) => {
    const index =
      /^CREATE (?:UNIQUE )?INDEX IF NOT EXISTS\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?\s+ON\s+"?([A-Za-z_][A-Za-z0-9_-]*)"?/.exec(
        text,
      );
    if (!index) return null;
    const [, name, table] = index;
    return existing.get(name) === table ? null : `${name} → ${existing.get(name)} (треба ${table})`;
  })
  .filter(Boolean);

if (wrongOwner.length) {
  console.error(`\n✗ Індекси належать не тим таблицям — імена індексів у SQLite глобальні:`);
  for (const line of wrongOwner) console.error(`    ${line}`);
  process.exit(1);
}

console.log(`✓ Схема повна: ${expectedNames.length} об'єктів із реєстру на місці.\n`);

// ── Звіт ──────────────────────────────────────────────────────────────────

const totals = query(TOTALS)[0] ?? {};
const groups = query(
  `SELECT COALESCE(json_extract(meta, '$.legacy_source'), '(новий рядок)') AS source,
          kind, COUNT(*) AS n FROM pages GROUP BY 1, 2 ORDER BY 1, 2`,
);
const skipped = query(SKIPPED);
const duplicates = query(DUPLICATE_ADDRESSES);

console.log("— Скільки доїхало —");
const pairs = [
  ["scenarios", "scenarios_total", "scenarios_migrated"],
  ["scenarios-admin", "admin_total", "admin_migrated"],
  ["sites", "sites_total", "sites_migrated"],
  ["site_pages", "site_pages_total", "site_pages_migrated"],
];
for (const [label, totalKey, migratedKey] of pairs) {
  const total = Number(totals[totalKey] ?? 0);
  const migrated = Number(totals[migratedKey] ?? 0);
  const mark = migrated === total ? "✓" : "!";
  console.log(`  ${mark} ${label.padEnd(16)} ${migrated}/${total}`);
}

console.log("\n— Що тепер у `pages` —");
for (const row of groups) {
  console.log(`  ${String(row.source).padEnd(18)} ${String(row.kind).padEnd(11)} ${row.n}`);
}

if (duplicates.length) {
  console.log("\n— Одна адреса, кілька рядків у легасі-таблиці —");
  for (const row of duplicates) {
    console.log(`  ${String(row.source).padEnd(16)} ${row.codeword}`);
  }
  console.log("  Перенесено одного представника адреси — того, чий codeword і є адресою.");
}

if (skipped.length === 0) {
  console.log("\n✓ Пропущених рядків немає.");
} else {
  console.log(`\n! Не перенесено рядків: ${skipped.length} — потрібне рішення власника,`);
  console.log("  бо в них конфлікт адреси чи codeword, або вони сироти:");
  for (const row of skipped.slice(0, 20)) {
    console.log(`    ${String(row.source).padEnd(16)} ${row.key}`);
  }
  if (skipped.length > 20) console.log(`    … і ще ${skipped.length - 20}`);
}

console.log(
  "\nЛегасі-таблиці не змінені: міграція лише додає. Відкат — `DELETE FROM pages;`\n" +
    "і повторний запуск (id детермінований, дублів не буде).",
);
