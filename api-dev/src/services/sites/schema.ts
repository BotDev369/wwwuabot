/**
 * Sites — схема таблиць.
 *
 * Єдина точка, яка створює таблиці `sites`, `site_pages` і `templates`, та
 * спільна залежність усіх решти модулів теки: `ensureSitesTables` кличе кожна
 * публічна функція сервісу.
 *
 * Це не «авто-міграція замість shared» (`AGENTS.md` §7): той модуль додає
 * колонки до наявних таблиць, а тут — `CREATE TABLE IF NOT EXISTS` для трьох
 * таблиць домену сайтів. `withAutoMigrate` про них не знає, бо таблиці
 * створюються при першому зверненні, а не при старті воркера.
 *
 * @module api-dev/src/services/sites/schema
 */

// ── Table Creation ───────────────────────────────────────────

/** Гарантує наявність всіх таблиць Sites. */
export async function ensureSitesTables(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'draft',
        template_id TEXT,
        settings TEXT DEFAULT '{}',
        is_public INTEGER DEFAULT 0,
        thumbnail TEXT,
        reject_reason TEXT,
        created_at TEXT,
        updated_at TEXT,
        published_at TEXT
      )`,
    )
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_sites_owner ON sites(owner_id)`)
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status)`)
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_sites_public ON sites(is_public, status)`)
    .run()
    .catch(() => {});

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS site_pages (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        page_data TEXT DEFAULT '{}',
        order_index INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        meta TEXT DEFAULT '{}',
        created_at TEXT,
        updated_at TEXT,
        published_at TEXT,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
    )
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON site_pages(site_id, slug)`)
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_pages_site ON site_pages(site_id)`)
    .run()
    .catch(() => {});

  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        thumbnail TEXT,
        config TEXT NOT NULL,
        is_system INTEGER DEFAULT 0,
        owner_id INTEGER,
        tags TEXT DEFAULT '[]',
        created_at TEXT
      )`,
    )
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type, is_system)`)
    .run()
    .catch(() => {});

  await db
    .prepare(`CREATE INDEX IF NOT EXISTS idx_templates_owner ON templates(owner_id)`)
    .run()
    .catch(() => {});
}
