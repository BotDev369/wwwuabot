/**
 * Контролер адміністрації сайтів (модерація).
 *
 * Ендпоїнти:
 *   GET  /api/admin/sites/pending    — черга модерації
 *   GET  /api/admin/sites            — всі сайти (з фільтрами)
 *   POST /api/admin/sites/:slug/approve — схвалити публікацію
 *   POST /api/admin/sites/:slug/reject  — відхилити
 *   POST /api/admin/templates        — створити system шаблон
 *   DELETE /api/admin/templates/:id  — видалити шаблон
 *
 * @module api-dev/src/controllers/sites-admin.controller
 */

import type { Env } from "../shared/types";
import {
  getPendingSites,
  getAllSites,
  approveSite,
  rejectSite,
  getSiteBySlug,
  createTemplate,
  getTemplateById,
  deleteTemplate,
  ensureSitesTables,
} from "../services/sites.service";
import type { SiteStatus } from "@wwwuabot/shared/types/site";

// ── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Handlers ─────────────────────────────────────────────────

/** GET /api/admin/sites/pending — черга модерації. */
export async function handlePendingSites(request: Request, env: Env): Promise<Response> {
  try {
    const sites = await getPendingSites(env.DB);
    return json({ success: true, sites });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** GET /api/admin/sites — всі сайти (з фільтрами). */
export async function handleAllSites(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as SiteStatus | null;
  const ownerId = url.searchParams.get("owner_id");

  try {
    const sites = await getAllSites(env.DB, {
      status: status ?? undefined,
      ownerId: ownerId ? parseInt(ownerId, 10) : undefined,
    });
    return json({ success: true, sites });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/sites/:slug/approve — схвалити публікацію. */
export async function handleApproveSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  try {
    const site = await approveSite(env.DB, slug);
    if (!site) {
      return json({ error: "Site not found or not pending" }, 404);
    }

    return json({ success: true, site });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/sites/:slug/reject — відхилити публікацію. */
export async function handleRejectSite(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body залишається порожнім
  }

  try {
    const site = await rejectSite(env.DB, slug, body.reason);
    if (!site) {
      return json({ error: "Site not found or not pending" }, 404);
    }

    return json({ success: true, site });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/templates — створити system шаблон. */
export async function handleCreateSystemTemplate(request: Request, env: Env): Promise<Response> {
  let body: {
    name?: string;
    description?: string;
    type?: "site" | "page";
    thumbnail?: string;
    config?: Record<string, unknown>;
    tags?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.name?.trim()) return json({ error: "name required" }, 400);
  if (!body.type || !["site", "page"].includes(body.type)) {
    return json({ error: "type must be 'site' or 'page'" }, 400);
  }
  if (!body.config) return json({ error: "config required" }, 400);

  try {
    const template = await createTemplate(env.DB, {
      name: body.name.trim(),
      description: body.description,
      type: body.type,
      thumbnail: body.thumbnail,
      config: body.config,
      tags: body.tags,
    });

    // Позначаємо як system
    await env.DB.prepare("UPDATE templates SET is_system = 1 WHERE id = ?").bind(template.id).run();

    return json({ success: true, template: { ...template, isSystem: true } }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** DELETE /api/admin/templates/:id — видалити шаблон. */
export async function handleDeleteSystemTemplate(
  request: Request,
  env: Env,
  templateId: string,
): Promise<Response> {
  try {
    const template = await getTemplateById(env.DB, templateId);
    if (!template) return json({ error: "Template not found" }, 404);

    const deleted = await deleteTemplate(env.DB, templateId);
    if (!deleted) {
      return json({ error: "Cannot delete template" }, 400);
    }

    return json({ success: true, deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}
