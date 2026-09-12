/**
 * Sites — модерація публікації.
 *
 * Статусний автомат сайту: `draft → pending → published | rejected`, і з
 * `rejected` можна подати знову. Кожен перехід перевіряє поточний статус і
 * повертає `null`, якщо перехід неможливий — саме тому тут не можна стрибнути
 * з `draft` у `published` повз чергу.
 *
 * Схвалення сайту публікує і всі його сторінки: інакше сайт був би видимий, а
 * сторінки — ні.
 *
 * @module api-dev/src/services/sites/moderation
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Site, SiteRow, SiteStatus } from "@wwwuabot/shared/types/site";
import { toSite } from "@wwwuabot/shared/types/site";
import { ensureSitesTables } from "./schema";
import { getSiteBySlug } from "./crud";
import { getSitePages, updateSitePage } from "./pages";

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
