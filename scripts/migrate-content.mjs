#!/usr/bin/env node
/**
 * Міграція контенту в одну таблицю: `scenarios` + `sites` + `site_pages` →
 * `pages`. (`scenarios-admin` тут немає: це була тестова копія без читачів
 * поза адмінкою — таблицю й маршрути видалено 13.09.2026, переносити нічого.)
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
 * **Звіт читає результат, а не повторює правило.** Жоден запит звіту не
 * обчислює адресу вдруге: скільки рядків доїхало — за префіксом `id`, а зміну
 * діплінка видно з `JOIN pages` (легасі-ключ поруч зі збереженою адресою). Це
 * навмисно: правило нормалізації живе в SQL-файлі, і його копія в JS
 * розійшлася б із ним на першій же правці.
 *
 * Запуск:
 *   node scripts/migrate-content.mjs --dry-run          # показати SQL, нічого не робити
 *   node scripts/migrate-content.mjs                    # локальна база (wrangler --local)
 *   node scripts/migrate-content.mjs --remote           # дев-база (потрібен CLOUDFLARE_API_TOKEN)
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

/**
 * Колонки, яких у `pages` бути не може, — разом із причиною.
 *
 * `ensureTables` уміє лише **додавати** колонки (це навмисно: жива база не
 * має втрачати дані від правки схеми). Тому таблиця, створена давнішою
 * версією реєстру, лишається зі своєю історією — і саме так у ній виживає
 * `codeword`, якого в моделі вже немає. Мовчазна зайва колонка — це та сама
 * «схема, що росте від того, що надіслав клієнт», тільки в інший бік.
 */
const FORBIDDEN_COLUMNS = {
  codeword: "адреса тепер одна — `slug`; дві колонки з тим самим рядком прибрані",
};

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

/** ── Перевірка схеми ДО міграції ───────────────────────────────────────── */

/**
 * Чи не лишилось у `pages` колонок, яких уже немає в моделі.
 *
 * Перевірка **перед** вставкою, бо зайва колонка не ламає вставку — вона
 * ламає *розуміння*: `codeword` у таблиці означав би, що адреса досі двійна,
 * і жоден гейт цього не побачив би. Ремонт — не `ALTER TABLE … DROP COLUMN`
 * (він тягне за собою перебудову таблиці на живій базі), а повне
 * перестворення: `pages` поки що ніким не читається, а джерела даних —
 * легасі-таблиці, тож нічого не втрачається.
 */
function existingColumns(table) {
  return query(`PRAGMA table_info(${table})`).map((row) => row.name);
}

const pagesExists = query(
  `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pages'`,
).length;

if (pagesExists) {
  const columns = existingColumns("pages");
  const stale = Object.entries(FORBIDDEN_COLUMNS).filter(([column]) => columns.includes(column));
  if (stale.length) {
    console.error("✗ Таблиця `pages` створена давнішою версією схеми:");
    for (const [column, why] of stale) console.error(`    ${column} — ${why}`);
    console.error("\n  Перествори її (даних у ній ще немає — її ніхто не читає),");
    console.error("  джерела в легасі-таблицях недоторкані:\n");
    console.error("    npx wrangler d1 execute DB --config api-dev/wrangler.toml \\");
    console.error(
      `      ${target === "remote" ? "--remote" : "--local"} --yes --command 'DROP TABLE pages;'`,
    );
    console.error("\n  і запусти міграцію знову.");
    process.exit(1);
  }
}

/** ── Застосування ──────────────────────────────────────────────────────── */

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

/** ── Звіт ──────────────────────────────────────────────────────────────── */

/** Скільки рядків у легасі-таблицях і скільки з них доїхало. */
const TOTALS = `SELECT
  (SELECT COUNT(*) FROM scenarios) AS scenarios_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'sc:%') AS scenarios_migrated,
  (SELECT COUNT(*) FROM sites) AS sites_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'site:%') AS sites_migrated,
  (SELECT COUNT(*) FROM site_pages) AS site_pages_total,
  (SELECT COUNT(*) FROM pages WHERE id LIKE 'sp:%') AS site_pages_migrated`;

/**
 * Рядки, які **не** доїхали, — з їхніми легасі-полями, без здогадів про причину.
 *
 * Причина майже завжди одна з двох: адресу вже зайняв інший рядок (у межах
 * джерела або з іншої легасі-таблиці — адреса тепер одна на всю `pages`), або
 * адреса не пройшла перевірку. Порівнявши `web_slug`/`codeword` у цьому
 * списку з адресами, рішення ухвалює власник — скрипт не має права тихо
 * перейменувати чужу сторінку.
 */
const SKIPPED = `SELECT 'scenarios' AS source, COALESCE(codeword, '') AS key,
         COALESCE(web_slug, '') AS web_slug FROM scenarios
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'sc:' || scenarios.codeword)
UNION ALL
SELECT 'sites', COALESCE(slug, ''), '' FROM sites
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'site:' || sites.id)
UNION ALL
SELECT 'site_pages', sp.slug, '' FROM site_pages sp
  WHERE NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = 'sp:' || sp.id)`;

/**
 * Рядки, у яких **змінилась діплінк-адреса**.
 *
 * Діплінк бота більше не береться з `codeword`: він будується з адреси
 * (`toBotPayload`). Там, де легасі-ключ відрізнявся від адреси сторінки,
 * старе посилання після фази 3 перестане вести на цю сторінку. Запит читає
 * **результат** (`pages.slug`), а не обчислює правило вдруге.
 */
const DEEPLINK_CHANGED = `SELECT 'scenarios' AS source, s.codeword AS legacy_key, p.slug AS new_slug
  FROM scenarios s
  JOIN pages p ON p.id = 'sc:' || s.codeword
  WHERE COALESCE(s.codeword, '') NOT IN ('', '__base__') AND p.slug <> '' AND s.codeword <> p.slug`;

const totals = query(TOTALS)[0] ?? {};
const groups = query(
  `SELECT COALESCE(json_extract(meta, '$.legacy_source'), '(новий рядок)') AS source,
          kind, COUNT(*) AS n FROM pages GROUP BY 1, 2 ORDER BY 1, 2`,
);
const skipped = query(SKIPPED);
const changed = query(DEEPLINK_CHANGED);

console.log("— Скільки доїхало —");
const pairs = [
  ["scenarios", "scenarios_total", "scenarios_migrated"],
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

if (changed.length) {
  console.log(`\n! Діплінк змінюється у ${changed.length} рядків — старий ключ ≠ нова адреса:`);
  for (const row of changed.slice(0, 20)) {
    console.log(`    ${String(row.source).padEnd(16)} ${row.legacy_key} → ${row.new_slug}`);
  }
  if (changed.length > 20) console.log(`    … і ще ${changed.length - 20}`);
  console.log("  Старе посилання можна лишити живим псевдонімом — але це рішення власника.");
}

if (skipped.length === 0) {
  console.log("\n✓ Пропущених рядків немає.");
} else {
  console.log(`\n! Не перенесено рядків: ${skipped.length} — потрібне рішення власника.`);
  console.log("  Причина: адресу вже зайняв інший рядок (адреса одна на всю `pages`)");
  console.log("  або вона не пройшла перевірку. Порівняй легасі-поля:");
  for (const row of skipped.slice(0, 20)) {
    const web = row.web_slug === "" ? "—" : row.web_slug;
    console.log(
      `    ${String(row.source).padEnd(16)} ${String(row.key).padEnd(24)} web_slug=${web}`,
    );
  }
  if (skipped.length > 20) console.log(`    … і ще ${skipped.length - 20}`);
}

console.log(
  "\nЛегасі-таблиці не змінені: міграція лише додає. Відкат — `DELETE FROM pages;`\n" +
    "і повторний запуск (id детермінований, дублів не буде).",
);
