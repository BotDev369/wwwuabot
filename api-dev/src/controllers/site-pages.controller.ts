/**
 * Контролер CRUD для сторінок сайтів.
 *
 * Ендпоїнти:
 *   POST /api/sites/:slug/pages            — створити сторінку
 *   GET  /api/sites/:slug/pages            — всі сторінки
 *   PUT  /api/sites/:slug/pages/:pid       — оновити сторінку
 *   DELETE /api/sites/:slug/pages/:pid     — видалити сторінку
 *   POST /api/sites/:slug/pages/:pid/publish — опублікувати сторінку
 *
 * @module api-dev/src/controllers/site-pages.controller
 */

import type { Env } from "../shared/types";
import { getSiteBySlug } from "../services/sites/crud";
import {
  createSitePage,
  getSitePages,
  getSitePageById,
  updateSitePage,
  deleteSitePage,
} from "../services/sites/pages";
import { isValidSlug, HOME_SLUG } from "@wwwuabot/shared/constants/site-defaults";
import { resolveUserId } from "../shared/identity";

// ── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Handlers ─────────────────────────────────────────────────

/** POST /api/sites/:slug/pages — створити сторінку. */
export async function handleCreatePage(
  request: Request,
  env: Env,
  siteSlug: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  const site = await getSiteBySlug(env.DB, siteSlug);
  if (!site) return json({ error: "Site not found" }, 404);
  if (site.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  let body: {
    slug?: string;
    title?: string;
    pageData?: Record<string, unknown>;
    orderIndex?: number;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const slug = body.slug?.trim();
  if (!slug) return json({ error: "slug required" }, 400);
  if (!isValidSlug(slug)) {
    return json({ error: "Invalid slug. Use lowercase letters, numbers, and hyphens." }, 400);
  }

  const title = body.title?.trim();
  if (!title) return json({ error: "title required" }, 400);

  try {
    const page = await createSitePage(env.DB, site.id, {
      slug,
      title,
      pageData: body.pageData,
      orderIndex: body.orderIndex,
    });

    return json({ success: true, page }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    if (msg.includes("UNIQUE constraint")) {
      return json({ error: "Page with this slug already exists in this site" }, 409);
    }
    return json({ error: msg }, 500);
  }
}

/** GET /api/sites/:slug/pages — всі сторінки. */
export async function handleListPages(
  request: Request,
  env: Env,
  siteSlug: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  const site = await getSiteBySlug(env.DB, siteSlug);
  if (!site) return json({ error: "Site not found" }, 404);
  if (site.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  try {
    const pages = await getSitePages(env.DB, site.id);
    return json({ success: true, pages });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** PUT /api/sites/:slug/pages/:pid — оновити сторінку. */
export async function handleUpdatePage(
  request: Request,
  env: Env,
  _siteSlug: string,
  pageId: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  const page = await getSitePageById(env.DB, pageId);
  if (!page) return json({ error: "Page not found" }, 404);

  // Перевіряємо що сайт належить користувачу
  const site = await getSiteBySlug(env.DB, _siteSlug);
  if (!site || site.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    const updated = await updateSitePage(env.DB, pageId, {
      slug: typeof body.slug === "string" ? body.slug : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      pageData: body.pageData as unknown as
        import("@wwwuabot/shared/types/page-config").PageConfig | undefined,
      orderIndex: typeof body.orderIndex === "number" ? body.orderIndex : undefined,
      meta: body.meta as Record<string, unknown> | undefined,
    });

    return json({ success: true, page: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** DELETE /api/sites/:slug/pages/:pid — видалити сторінку. */
export async function handleDeletePage(
  request: Request,
  env: Env,
  _siteSlug: string,
  pageId: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  const page = await getSitePageById(env.DB, pageId);
  if (!page) return json({ error: "Page not found" }, 404);

  // Не дозволяємо видаляти home
  if (page.slug === HOME_SLUG) {
    return json({ error: "Cannot delete home page" }, 400);
  }

  // Перевіряємо що сайт належить користувачу
  const site = await getSiteBySlug(env.DB, _siteSlug);
  if (!site || site.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  try {
    const deleted = await deleteSitePage(env.DB, pageId);
    return json({ success: true, deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/sites/:slug/pages/:pid/publish — опублікувати сторінку. */
export async function handlePublishPage(
  request: Request,
  env: Env,
  _siteSlug: string,
  pageId: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  const page = await getSitePageById(env.DB, pageId);
  if (!page) return json({ error: "Page not found" }, 404);

  // Перевіряємо що сайт належить користувачу
  const site = await getSiteBySlug(env.DB, _siteSlug);
  if (!site || site.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  try {
    const updated = await updateSitePage(env.DB, pageId, { status: "published" });
    return json({ success: true, page: updated });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}
