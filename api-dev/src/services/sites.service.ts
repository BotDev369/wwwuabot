/**
 * Sites Service — бізнес-логіка для сайтів, сторінок та шаблонів.
 *
 * Відповідає за:
 * - Створення/оновлення/видалення сайтів
 * - CRUD сторінок сайтів
 * - CRUD шаблонів
 * - Публічний каталог
 * - Модерацію
 *
 * @module api-dev/src/services/sites.service
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type {
  Site,
  SitePage,
  Template,
  SiteRow,
  SitePageRow,
  TemplateRow,
  SiteStatus,
  PageStatus,
  SiteSettings,
  PageMeta,
  CatalogSite,
} from "@wwwuabot/shared/types/site";
import { toSite, toSitePage, toTemplate } from "@wwwuabot/shared/types/site";
import {
  HOME_SLUG,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_HOMENavItem,
} from "@wwwuabot/shared/constants/site-defaults";

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

// ── Sites CRUD ───────────────────────────────────────────────

/** Створює новий сайт. */
export async function createSite(
  db: D1Database,
  data: {
    slug: string;
    title: string;
    description?: string;
    ownerId: number;
    templateId?: string;
    settings?: SiteSettings;
    isPublic?: boolean;
  },
): Promise<Site> {
  await ensureSitesTables(db);

  const id = crypto.randomUUID();
  const now = formatSqliteDatetime();
  const settings = data.settings ?? DEFAULT_SITE_SETTINGS;

  await db
    .prepare(
      `INSERT INTO sites (id, slug, title, description, owner_id, status, template_id, settings, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.slug,
      data.title,
      data.description ?? null,
      data.ownerId,
      data.templateId ?? null,
      JSON.stringify(settings),
      data.isPublic ? 1 : 0,
      now,
      now,
    )
    .run();

  // Створюємо першу сторінку (home)
  const pageId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO site_pages (id, site_id, slug, title, page_data, order_index, status, meta, created_at, updated_at)
       VALUES (?, ?, 'home', 'Головна', '{}', 0, 'draft', '{}', ?, ?)`,
    )
    .bind(pageId, id, now, now)
    .run();

  return {
    id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    ownerId: data.ownerId,
    status: "draft",
    templateId: data.templateId,
    settings,
    isPublic: data.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
  };
}

/** Отримує сайт за slug. */
export async function getSiteBySlug(db: D1Database, slug: string): Promise<Site | null> {
  await ensureSitesTables(db);

  const row = await db.prepare("SELECT * FROM sites WHERE slug = ?").bind(slug).first<SiteRow>();

  return row ? toSite(row) : null;
}

/** Отримує сайт за ID. */
export async function getSiteById(db: D1Database, id: string): Promise<Site | null> {
  await ensureSitesTables(db);

  const row = await db.prepare("SELECT * FROM sites WHERE id = ?").bind(id).first<SiteRow>();

  return row ? toSite(row) : null;
}

/** Отримує всі сайти власника. */
export async function getSitesByOwner(db: D1Database, ownerId: number): Promise<Site[]> {
  await ensureSitesTables(db);

  const result = await db
    .prepare("SELECT * FROM sites WHERE owner_id = ? ORDER BY updated_at DESC")
    .bind(ownerId)
    .all<SiteRow>();

  return (result.results ?? []).map(toSite);
}

/** Оновлює сайт. */
export async function updateSite(
  db: D1Database,
  slug: string,
  data: Partial<Pick<Site, "title" | "description" | "settings" | "isPublic" | "thumbnail">>,
): Promise<Site | null> {
  await ensureSitesTables(db);

  const site = await getSiteBySlug(db, slug);
  if (!site) return null;

  const now = formatSqliteDatetime();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.title !== undefined) {
    updates.push("title = ?");
    values.push(data.title);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description ?? null);
  }
  if (data.settings !== undefined) {
    updates.push("settings = ?");
    values.push(JSON.stringify(data.settings));
  }
  if (data.isPublic !== undefined) {
    updates.push("is_public = ?");
    values.push(data.isPublic ? 1 : 0);
  }
  if (data.thumbnail !== undefined) {
    updates.push("thumbnail = ?");
    values.push(data.thumbnail ?? null);
  }

  if (updates.length === 0) return site;

  updates.push("updated_at = ?");
  values.push(now);

  await db
    .prepare(`UPDATE sites SET ${updates.join(", ")} WHERE slug = ?`)
    .bind(...values, slug)
    .run();

  return getSiteBySlug(db, slug);
}

/** Видаляє сайт та всі його сторінки. */
export async function deleteSite(db: D1Database, slug: string): Promise<boolean> {
  await ensureSitesTables(db);

  const site = await getSiteBySlug(db, slug);
  if (!site) return false;

  // Видаляємо сторінки
  await db.prepare("DELETE FROM site_pages WHERE site_id = ?").bind(site.id).run();

  // Видаляємо сайт
  const result = await db.prepare("DELETE FROM sites WHERE slug = ?").bind(slug).run();

  return (result.meta?.changes ?? 0) > 0;
}

// ── Site Pages CRUD ──────────────────────────────────────────

/** Створює сторінку в сайті. */
export async function createSitePage(
  db: D1Database,
  siteId: string,
  data: {
    slug: string;
    title: string;
    pageData?: Record<string, unknown>;
    orderIndex?: number;
    meta?: PageMeta;
  },
): Promise<SitePage> {
  await ensureSitesTables(db);

  const id = crypto.randomUUID();
  const now = formatSqliteDatetime();

  await db
    .prepare(
      `INSERT INTO site_pages (id, site_id, slug, title, page_data, order_index, status, meta, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?)`,
    )
    .bind(
      id,
      siteId,
      data.slug,
      data.title,
      JSON.stringify(
        data.pageData ?? { version: 1, zones: { sidebar: [], header: [], main: [], footer: [] } },
      ),
      data.orderIndex ?? 0,
      JSON.stringify(data.meta ?? {}),
      now,
      now,
    )
    .run();

  return {
    id,
    siteId,
    slug: data.slug,
    title: data.title,
    pageData: (data.pageData ?? {
      version: 1,
      zones: { sidebar: [], header: [], main: [], footer: [] },
    }) as unknown as SitePage["pageData"],
    orderIndex: data.orderIndex ?? 0,
    status: "draft",
    meta: data.meta,
    createdAt: now,
    updatedAt: now,
  };
}

/** Отримує сторінку за siteId + slug. */
export async function getSitePage(
  db: D1Database,
  siteId: string,
  pageSlug: string,
): Promise<SitePage | null> {
  await ensureSitesTables(db);

  const row = await db
    .prepare("SELECT * FROM site_pages WHERE site_id = ? AND slug = ?")
    .bind(siteId, pageSlug)
    .first<SitePageRow>();

  return row ? toSitePage(row) : null;
}

/** Отримує сторінку за ID. */
export async function getSitePageById(db: D1Database, pageId: string): Promise<SitePage | null> {
  await ensureSitesTables(db);

  const row = await db
    .prepare("SELECT * FROM site_pages WHERE id = ?")
    .bind(pageId)
    .first<SitePageRow>();

  return row ? toSitePage(row) : null;
}

/** Отримує всі сторінки сайту. */
export async function getSitePages(db: D1Database, siteId: string): Promise<SitePage[]> {
  await ensureSitesTables(db);

  const result = await db
    .prepare("SELECT * FROM site_pages WHERE site_id = ? ORDER BY order_index ASC")
    .bind(siteId)
    .all<SitePageRow>();

  return (result.results ?? []).map(toSitePage);
}

/** Оновлює сторінку. */
export async function updateSitePage(
  db: D1Database,
  pageId: string,
  data: Partial<Pick<SitePage, "title" | "pageData" | "orderIndex" | "status" | "meta" | "slug">>,
): Promise<SitePage | null> {
  await ensureSitesTables(db);

  const page = await getSitePageById(db, pageId);
  if (!page) return null;

  const now = formatSqliteDatetime();
  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.slug !== undefined) {
    updates.push("slug = ?");
    values.push(data.slug);
  }
  if (data.title !== undefined) {
    updates.push("title = ?");
    values.push(data.title);
  }
  if (data.pageData !== undefined) {
    updates.push("page_data = ?");
    values.push(JSON.stringify(data.pageData));
  }
  if (data.orderIndex !== undefined) {
    updates.push("order_index = ?");
    values.push(data.orderIndex);
  }
  if (data.status !== undefined) {
    updates.push("status = ?");
    values.push(data.status);
    if (data.status === "published") {
      updates.push("published_at = ?");
      values.push(now);
    }
  }
  if (data.meta !== undefined) {
    updates.push("meta = ?");
    values.push(JSON.stringify(data.meta));
  }

  if (updates.length === 0) return page;

  updates.push("updated_at = ?");
  values.push(now);

  await db
    .prepare(`UPDATE site_pages SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values, pageId)
    .run();

  return getSitePageById(db, pageId);
}

/** Видаляє сторінку. */
export async function deleteSitePage(db: D1Database, pageId: string): Promise<boolean> {
  await ensureSitesTables(db);

  const result = await db.prepare("DELETE FROM site_pages WHERE id = ?").bind(pageId).run();

  return (result.meta?.changes ?? 0) > 0;
}

// ── Templates CRUD ───────────────────────────────────────────

/** Створює шаблон. */
export async function createTemplate(
  db: D1Database,
  data: {
    name: string;
    description?: string;
    type: "site" | "page";
    thumbnail?: string;
    config: Record<string, unknown>;
    ownerId?: number;
    tags?: string[];
  },
): Promise<Template> {
  await ensureSitesTables(db);

  const id = crypto.randomUUID();
  const now = formatSqliteDatetime();

  await db
    .prepare(
      `INSERT INTO templates (id, name, description, type, thumbnail, config, is_system, owner_id, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .bind(
      id,
      data.name,
      data.description ?? null,
      data.type,
      data.thumbnail ?? null,
      JSON.stringify(data.config),
      data.ownerId ?? null,
      JSON.stringify(data.tags ?? []),
      now,
    )
    .run();

  return {
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    thumbnail: data.thumbnail,
    config: data.config as unknown as Template["config"],
    isSystem: false,
    ownerId: data.ownerId,
    tags: data.tags ?? [],
    createdAt: now,
  };
}

/** Отримує шаблон за ID. */
export async function getTemplateById(db: D1Database, id: string): Promise<Template | null> {
  await ensureSitesTables(db);

  const row = await db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .bind(id)
    .first<TemplateRow>();

  return row ? toTemplate(row) : null;
}

/** Отримує всі шаблони (system + user). */
export async function getTemplates(db: D1Database, userId?: number): Promise<Template[]> {
  await ensureSitesTables(db);

  let result;
  if (userId) {
    result = await db
      .prepare(
        "SELECT * FROM templates WHERE is_system = 1 OR owner_id = ? ORDER BY created_at DESC",
      )
      .bind(userId)
      .all<TemplateRow>();
  } else {
    result = await db
      .prepare("SELECT * FROM templates WHERE is_system = 1 ORDER BY created_at DESC")
      .all<TemplateRow>();
  }

  return (result.results ?? []).map(toTemplate);
}

/** Оновлює шаблон (тільки свої, не system). */
export async function updateTemplate(
  db: D1Database,
  id: string,
  data: Partial<Pick<Template, "name" | "description" | "thumbnail" | "config" | "tags">>,
): Promise<Template | null> {
  await ensureSitesTables(db);

  const template = await getTemplateById(db, id);
  if (!template || template.isSystem) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description ?? null);
  }
  if (data.thumbnail !== undefined) {
    updates.push("thumbnail = ?");
    values.push(data.thumbnail ?? null);
  }
  if (data.config !== undefined) {
    updates.push("config = ?");
    values.push(JSON.stringify(data.config));
  }
  if (data.tags !== undefined) {
    updates.push("tags = ?");
    values.push(JSON.stringify(data.tags));
  }

  if (updates.length === 0) return template;

  await db
    .prepare(`UPDATE templates SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values, id)
    .run();

  return getTemplateById(db, id);
}

/** Видаляє шаблон (тільки свої, не system). */
export async function deleteTemplate(db: D1Database, id: string): Promise<boolean> {
  await ensureSitesTables(db);

  const template = await getTemplateById(db, id);
  if (!template || template.isSystem) return false;

  const result = await db.prepare("DELETE FROM templates WHERE id = ?").bind(id).run();

  return (result.meta?.changes ?? 0) > 0;
}

// ── Moderation ───────────────────────────────────────────────

/** Подати сайт на модерацію. */
export async function submitSiteForModeration(db: D1Database, slug: string): Promise<Site | null> {
  await ensureSitesTables(db);

  const site = await getSiteBySlug(db, slug);
  if (!site || (site.status !== "draft" && site.status !== "rejected")) return null;

  const now = formatSqliteDatetime();
  await db
    .prepare(
      "UPDATE sites SET status = 'pending', updated_at = ?, reject_reason = NULL WHERE slug = ?",
    )
    .bind(now, slug)
    .run();

  return getSiteBySlug(db, slug);
}

/** Зняти сайт з модерації (повернути в draft). */
export async function unpublishSite(db: D1Database, slug: string): Promise<Site | null> {
  await ensureSitesTables(db);

  const site = await getSiteBySlug(db, slug);
  if (!site || site.status !== "pending") return null;

  const now = formatSqliteDatetime();
  await db
    .prepare("UPDATE sites SET status = 'draft', updated_at = ? WHERE slug = ?")
    .bind(now, slug)
    .run();

  return getSiteBySlug(db, slug);
}

/** Схвалити публікацію (admin). */
export async function approveSite(db: D1Database, slug: string): Promise<Site | null> {
  await ensureSitesTables(db);

  const site = await getSiteBySlug(db, slug);
  if (!site || site.status !== "pending") return null;

  const now = formatSqliteDatetime();
  await db
    .prepare(
      "UPDATE sites SET status = 'published', published_at = ?, updated_at = ? WHERE slug = ?",
    )
    .bind(now, now, slug)
    .run();

  // Публікуємо всі сторінки
  const pages = await getSitePages(db, site.id);
  for (const page of pages) {
    await updateSitePage(db, page.id, { status: "published" });
  }

  return getSiteBySlug(db, slug);
}

/** Відхилити публікацію (admin). */
export async function rejectSite(
  db: D1Database,
  slug: string,
  reason?: string,
): Promise<Site | null> {
  await ensureSitesTables(db);

  const site = await getSiteBySlug(db, slug);
  if (!site || site.status !== "pending") return null;

  const now = formatSqliteDatetime();
  await db
    .prepare(
      "UPDATE sites SET status = 'rejected', reject_reason = ?, updated_at = ? WHERE slug = ?",
    )
    .bind(reason ?? null, now, slug)
    .run();

  return getSiteBySlug(db, slug);
}

/** Отримує всі сайти на модерації (admin). */
export async function getPendingSites(db: D1Database): Promise<Site[]> {
  await ensureSitesTables(db);

  const result = await db
    .prepare("SELECT * FROM sites WHERE status = 'pending' ORDER BY updated_at ASC")
    .all<SiteRow>();

  return (result.results ?? []).map(toSite);
}

/** Отримує всі сайти (admin, з фільтрами). */
export async function getAllSites(
  db: D1Database,
  filters?: { status?: SiteStatus; ownerId?: number },
): Promise<Site[]> {
  await ensureSitesTables(db);

  let query = "SELECT * FROM sites";
  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (filters?.status) {
    conditions.push("status = ?");
    values.push(filters.status);
  }
  if (filters?.ownerId) {
    conditions.push("owner_id = ?");
    values.push(filters.ownerId);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY updated_at DESC";

  const result = await db
    .prepare(query)
    .bind(...values)
    .all<SiteRow>();

  return (result.results ?? []).map(toSite);
}

// ── Catalog ──────────────────────────────────────────────────

/** Отримує публічний каталог (опубліковані сайти). */
export async function getCatalogSites(
  db: D1Database,
  options?: { page?: number; limit?: number },
): Promise<{ sites: CatalogSite[]; total: number }> {
  await ensureSitesTables(db);

  const page = options?.page ?? 1;
  const limit = Math.min(options?.limit ?? 20, 50);
  const offset = (page - 1) * limit;

  // Отримуємо загальну кількість
  const countResult = await db
    .prepare("SELECT COUNT(*) as c FROM sites WHERE status = 'published' AND is_public = 1")
    .first<{ c: number }>();
  const total = countResult?.c ?? 0;

  // Отримуємо сторінку
  const result = await db
    .prepare(
      "SELECT * FROM sites WHERE status = 'published' AND is_public = 1 ORDER BY published_at DESC LIMIT ? OFFSET ?",
    )
    .bind(limit, offset)
    .all<SiteRow>();

  const sites: CatalogSite[] = (result.results ?? []).map((row) => ({
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    thumbnail: row.thumbnail ?? undefined,
    publishedAt: row.published_at ?? row.updated_at,
  }));

  return { sites, total };
}

/** Отримує сайт з каталогу за slug. */
export async function getCatalogSiteBySlug(
  db: D1Database,
  slug: string,
): Promise<{ site: Site; pages: SitePage[] } | null> {
  await ensureSitesTables(db);

  const row = await db
    .prepare("SELECT * FROM sites WHERE slug = ? AND status = 'published' AND is_public = 1")
    .bind(slug)
    .first<SiteRow>();

  if (!row) return null;

  const site = toSite(row);
  const pages = await getSitePages(db, site.id);

  return { site, pages };
}
