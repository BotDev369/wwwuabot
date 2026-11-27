/**
 * Перебудова чотирьох контентних таблиць під `tenant_id`.
 *
 * Рішення «перебудовувати чи ні» ухвалює схема (`PRAGMA table_info`), тому
 * другий прогін нічого не змінює. Деталі й порядок: `docs/D1_OPS.md`.
 *
 * `--db <файл>` — локальна SQLite через `node:sqlite`.
 *
 * @module scripts/migrations/2026-11-27-tenants-content
 */

import { DatabaseSync } from "node:sqlite";

import { mainTenantId } from "./lib-tenants.mjs";

/** Одна таблиця = одна перебудова. Колонки перелічені явно: `SELECT *` змішав би порядок. */
const TABLES = {
  platform_pages: {
    create: `CREATE TABLE "platform_pages" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        slug TEXT NOT NULL,
        title TEXT,
        photo_url TEXT,
        page_data TEXT DEFAULT NULL,
        template_key TEXT,
        owner_id TEXT,
        admin_ids TEXT,
        is_public INTEGER DEFAULT 0,
        viewer_ids TEXT,
        is_active INTEGER DEFAULT 1,
        search_terms TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (tenant_id, slug)
      )`,
    columns: [
      "id",
      "slug",
      "title",
      "photo_url",
      "page_data",
      "template_key",
      "owner_id",
      "admin_ids",
      "is_public",
      "viewer_ids",
      "is_active",
      "search_terms",
      "created_at",
      "updated_at",
    ],
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_platform_pages_owner ON platform_pages(owner_id)",
      "CREATE INDEX IF NOT EXISTS idx_platform_pages_tenant ON platform_pages(tenant_id, id)",
    ],
  },
  platform_screens: {
    create: `CREATE TABLE "platform_screens" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        key TEXT NOT NULL,
        parent_key TEXT,
        title TEXT NOT NULL,
        icon TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        in_menu INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        page_data TEXT DEFAULT NULL,
        search_terms TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (tenant_id, key)
      )`,
    columns: [
      "id",
      "key",
      "parent_key",
      "title",
      "icon",
      "sort_order",
      "in_menu",
      "is_active",
      "page_data",
      "search_terms",
      "created_at",
      "updated_at",
    ],
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_platform_screens_parent ON platform_screens(parent_key)",
      "CREATE INDEX IF NOT EXISTS idx_platform_screens_tenant ON platform_screens(tenant_id, id)",
    ],
  },
  bot_scenarios: {
    create: `CREATE TABLE "bot_scenarios" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id INTEGER NOT NULL DEFAULT 1,
        lookup TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('widget', 'rich')),
        widget_html TEXT,
        widget_data TEXT,
        rich_html TEXT,
        notify_groups TEXT,
        notify_template TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (tenant_id, lookup),
        CHECK (
          (kind = 'widget' AND widget_html IS NOT NULL AND length(trim(widget_html)) > 0)
          OR
          (kind = 'rich' AND rich_html IS NOT NULL AND length(trim(rich_html)) > 0)
        )
      )`,
    columns: [
      "id",
      "lookup",
      "kind",
      "widget_html",
      "widget_data",
      "rich_html",
      "notify_groups",
      "notify_template",
      "is_active",
      "created_at",
      "updated_at",
    ],
    indexes: [],
  },
  slug_aliases: {
    create: `CREATE TABLE "slug_aliases" (
        tenant_id INTEGER NOT NULL DEFAULT 1,
        alias TEXT NOT NULL,
        slug TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (tenant_id, alias)
      )`,
    columns: ["alias", "slug", "created_at"],
    indexes: [],
  },
};

/** Скільки рядків у таблиці; порожня таблиця — законний стан. */
function countRows(db, table) {
  return db.prepare(`SELECT count(*) AS n FROM "${table}"`).get().n;
}

/** Колонки, які справді є в живій таблиці. */
function columnsOf(db, table) {
  return new Set(
    db
      .prepare(`PRAGMA table_info("${table}")`)
      .all()
      .map((row) => row.name),
  );
}

/** `CREATE TABLE` із `sqlite_master`: за ним видно, чи унікальність уже в межах проєкту. */
function schemaOf(db, table) {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return row?.sql ?? null;
}

function isScopedSchema(sql) {
  return (
    Boolean(sql) && /UNIQUE\s*\(\s*tenant_id\s*,|PRIMARY\s+KEY\s*\(\s*tenant_id\s*,/i.test(sql)
  );
}

/**
 * План для однієї таблиці: `null`, коли вона вже в потрібній формі.
 *
 * Копіювання бере `tenant_id` з рядка, якщо колонка вже є (після першого
 * прогону), і `main` — якщо її немає (наявні дані до міграції).
 */
function planTable(db, table, spec, mainId) {
  const columns = columnsOf(db, table);
  if (columns.size === 0) return null;

  const hasTenant = columns.has("tenant_id");
  if (hasTenant && isScopedSchema(schemaOf(db, table))) return null;

  const temp = `${table}_new`;
  const source = spec.columns.filter((column) => columns.has(column));
  const tenantExpr = hasTenant ? "COALESCE(tenant_id, ?)" : "?";
  const copyColumns = ["tenant_id", ...source].join(", ");
  const selectColumns = [tenantExpr, ...source].join(", ");

  return [
    `DROP TABLE IF EXISTS "${temp}"`,
    spec.create.replace(`"${table}"`, `"${temp}"`),
    `INSERT INTO "${temp}" (${copyColumns}) SELECT ${selectColumns} FROM "${table}"`,
    `ALTER TABLE "${table}" RENAME TO "${table}_legacy_20261127"`,
    `ALTER TABLE "${temp}" RENAME TO "${table}"`,
    // Індекси старої таблиці звуться так само: спершу звільняємо імена, потім заводимо свої.
    ...spec.indexes.map(
      (sql) => `DROP INDEX IF EXISTS ${/INDEX IF NOT EXISTS (\w+)/.exec(sql)[1]}`,
    ),
    ...spec.indexes,
  ].map((statement) => ({ statement, binds: statement.startsWith("INSERT") ? [mainId] : [] }));
}

/** Повний план: спершу проєкт `main`, потім перебудови. */
export function buildPlan(db) {
  const mainId = mainTenantId(db);
  const steps = [];
  for (const [table, spec] of Object.entries(TABLES)) {
    const plan = planTable(db, table, spec, mainId);
    if (plan) steps.push(...plan);
  }
  return steps;
}

/** Прогін плану в транзакції: частково перебудованих таблиць не буває. */
export function migrate(db) {
  const before = Object.fromEntries(
    Object.keys(TABLES).map((table) => [table, countRows(db, table)]),
  );
  const steps = buildPlan(db);
  if (steps.length === 0) return { changed: false, before, after: before };

  db.exec("BEGIN");
  try {
    for (const { statement, binds } of steps) {
      const prepared = db.prepare(statement);
      if (binds.length > 0) prepared.run(...binds);
      else prepared.run();
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const after = Object.fromEntries(
    Object.keys(TABLES).map((table) => [table, countRows(db, table)]),
  );
  for (const table of Object.keys(TABLES)) {
    if (before[table] !== after[table]) {
      throw new Error(`migration lost rows in ${table}: ${before[table]} -> ${after[table]}`);
    }
  }
  return { changed: true, before, after };
}

const args = process.argv.slice(2);
const dbFlag = args.indexOf("--db");

if (dbFlag !== -1) {
  const db = new DatabaseSync(args[dbFlag + 1]);
  const result = migrate(db);
  console.log(
    result.changed
      ? `migrated: ${JSON.stringify(result.after)}`
      : `already scoped: ${JSON.stringify(result.after)}`,
  );
} else if (args.includes("--emit-sql")) {
  console.error("--emit-sql потребує --db: SQL залежить від живої схеми.");
  process.exit(1);
}
