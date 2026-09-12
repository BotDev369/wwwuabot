/**
 * Контролер CRUD для сайтів.
 *
 * Ендпоїнти:
 *   POST /api/sites              — створити сайт
 *   GET  /api/sites              — мої сайти
 *   GET  /api/sites/:slug        — отримати сайт
 *   PUT  /api/sites/:slug        — оновити сайт
 *   DELETE /api/sites/:slug      — видалити сайт
 *   POST /api/sites/:slug/publish — подати на модерацію
 *   POST /api/sites/:slug/unpublish — зняти з модерації
 *
 * @module api-dev/src/controllers/sites.controller
 */

import type { Env } from "../shared/types";
import {
  createSite,
  getSiteBySlug,
  getSitesByOwner,
  updateSite,
  deleteSite,
} from "../services/sites/crud";
import { submitSiteForModeration, unpublishSite } from "../services/sites/moderation";
import { isValidSlug, generateSlug } from "@wwwuabot/shared/constants/site-defaults";
import { resolveUserId } from "../shared/identity";

// ── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Handlers ─────────────────────────────────────────────────

/** POST /api/sites — створити сайт. */
export async function handleCreateSite(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  let body: {
    slug?: string;
    title?: string;
    description?: string;
    templateId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // Валідація slug
  const slug = body.slug?.trim() || generateSlug(body.title ?? "");
  if (!slug) return json({ error: "slug or title required" }, 400);
  if (!isValidSlug(slug)) {
    return json({ error: "Invalid slug. Use lowercase letters, numbers, and hyphens." }, 400);
  }

  // Перевіряємо унікальність
  const existing = await getSiteBySlug(env.DB, slug);
  if (existing) {
    return json({ error: "Site with this slug already exists" }, 409);
  }

  const title = body.title?.trim();
  if (!title) return json({ error: "title required" }, 400);

  try {
    const site = await createSite(env.DB, {
      slug,
      title,
      description: body.description,
      ownerId: userId,
      templateId: body.templateId,
    });

    return json({ success: true, site }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** GET /api/sites — мої сайти. */
export async function handleListSites(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  try {
    const sites = await getSitesByOwner(env.DB, userId);
    return json({ success: true, sites });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** GET /api/sites/:slug — отримати сайт. */
export async function handleGetSite(request: Request, env: Env, slug: string): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  try {
    const site = await getSiteBySlug(env.DB, slug);
    if (!site) return json({ error: "Site not found" }, 404);
    if (site.ownerId !== userId) return json({ error: "Forbidden" }, 403);

    return json({ success: true, site });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** PUT /api/sites/:slug — оновити сайт. */
export async function handleUpdateSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    const existing = await getSiteBySlug(env.DB, slug);
    if (!existing) return json({ error: "Site not found" }, 404);
    if (existing.ownerId !== userId) return json({ error: "Forbidden" }, 403);

    const site = await updateSite(env.DB, slug, {
      title: typeof body.title === "string" ? body.title : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      settings: body.settings as Record<string, unknown> | undefined,
      isPublic: typeof body.isPublic === "boolean" ? body.isPublic : undefined,
      thumbnail: typeof body.thumbnail === "string" ? body.thumbnail : undefined,
    });

    return json({ success: true, site });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** DELETE /api/sites/:slug — видалити сайт. */
export async function handleDeleteSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  try {
    const existing = await getSiteBySlug(env.DB, slug);
    if (!existing) return json({ error: "Site not found" }, 404);
    if (existing.ownerId !== userId) return json({ error: "Forbidden" }, 403);

    const deleted = await deleteSite(env.DB, slug);
    return json({ success: true, deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/sites/:slug/publish — подати на модерацію. */
export async function handlePublishSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  try {
    const existing = await getSiteBySlug(env.DB, slug);
    if (!existing) return json({ error: "Site not found" }, 404);
    if (existing.ownerId !== userId) return json({ error: "Forbidden" }, 403);

    const site = await submitSiteForModeration(env.DB, slug);
    if (!site) {
      return json({ error: "Cannot submit for moderation (check site status)" }, 400);
    }

    return json({ success: true, site });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/sites/:slug/unpublish — зняти з модерації. */
export async function handleUnpublishSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  const userId = identity.userId;

  try {
    const existing = await getSiteBySlug(env.DB, slug);
    if (!existing) return json({ error: "Site not found" }, 404);
    if (existing.ownerId !== userId) return json({ error: "Forbidden" }, 403);

    const site = await unpublishSite(env.DB, slug);
    if (!site) {
      return json({ error: "Cannot unpublish (site must be pending)" }, 400);
    }

    return json({ success: true, site });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}
