/**
 * Sites — CRUD сторінок сайту.
 *
 * Сторінка — це `page_data` (Page Builder) плюс мета. Публікація окремої
 * сторінки стається тут: `updateSitePage({ status: "published" })` проставляє
 * `published_at`. Масову публікацію всіх сторінок робить модерація
 * (`./moderation.ts`), коли схвалює сайт.
 *
 * @module api-dev/src/services/sites/pages
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { SitePage, SitePageRow, PageMeta } from "@wwwuabot/shared/types/site";
import { toSitePage } from "@wwwuabot/shared/types/site";
import { ensureSitesTables } from "./schema";

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
