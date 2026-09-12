/**
 * Sites — CRUD самих сайтів.
 *
 * Створення, читання й оновлення запису `sites`. Разом зі створенням сайту
 * з'являється його перша сторінка (`home`) — без неї сайт не відкривається.
 *
 * Модерація живе окремо (`./moderation.ts`), бо це зміна статусу, а не полів:
 * змішувати їх означало б дати `updateSite` змогу опублікувати сайт повз
 * модерацію.
 *
 * @module api-dev/src/services/sites/crud
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Site, SiteRow, SiteSettings } from "@wwwuabot/shared/types/site";
import { toSite } from "@wwwuabot/shared/types/site";
import { DEFAULT_SITE_SETTINGS } from "@wwwuabot/shared/constants/site-defaults";
import { ensureSitesTables } from "./schema";

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
