/**
 * Контролер публічного каталогу.
 *
 * Ендпоїнти:
 *   GET /api/catalog          — опубліковані сайти (pagination)
 *   GET /api/catalog/:slug    — сайт з каталогу
 *
 * Ці ендпоїнти публічні (не потребують auth).
 *
 * @module api-dev/src/controllers/catalog.controller
 */

import type { Env } from "../shared/types";
import { getCatalogSites, getCatalogSiteBySlug } from "../services/sites/catalog";

// ── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Handlers ─────────────────────────────────────────────────

/** GET /api/catalog — публічний каталог сайтів. */
export async function handleCatalogList(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") ?? "1", 10);
  const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

  try {
    const result = await getCatalogSites(env.DB, { page, limit });
    return json({
      success: true,
      sites: result.sites,
      total: result.total,
      page,
      limit,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** GET /api/catalog/:slug — сайт з каталогу. */
export async function handleCatalogSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const result = await getCatalogSiteBySlug(env.DB, slug);
    if (!result) return json({ error: "Site not found or not public" }, 404);

    return json({
      success: true,
      site: result.site,
      pages: result.pages,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}
