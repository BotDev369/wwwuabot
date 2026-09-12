/**
 * Sites — публічний каталог.
 *
 * Єдиний модуль теки без авторизації: сюди потрапляють лише сайти, які
 * `status = 'published'` **і** `is_public = 1`. Друга умова — не формальність:
 * без неї сайт, опублікований для себе, показувався б у спільному каталозі.
 *
 * @module api-dev/src/services/sites/catalog
 */

import type { Site, SiteRow, SitePage, CatalogSite } from "@wwwuabot/shared/types/site";
import { toSite } from "@wwwuabot/shared/types/site";
import { ensureSitesTables } from "./schema";
import { getSitePages } from "./pages";

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
