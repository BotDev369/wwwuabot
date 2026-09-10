/**
 * Контролер CRUD для шаблонів.
 *
 * Ендпоїнти:
 *   GET  /api/templates          — список (system + мої)
 *   GET  /api/templates/:id      — отримати шаблон
 *   POST /api/templates          — створити шаблон (user)
 *   PUT  /api/templates/:id      — оновити (тільки свої)
 *   DELETE /api/templates/:id    — видалити (тільки свої, не system)
 *
 * @module api-dev/src/controllers/templates.controller
 */

import type { Env } from "../shared/types";
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../services/sites.service";

// ── Helpers ──────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getUserIdFromRequest(request: Request): number | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/user_id=(\d+)/);
  if (match) return parseInt(match[1], 10);
  return null;
}

// ── Handlers ─────────────────────────────────────────────────

/** GET /api/templates — список шаблонів. */
export async function handleListTemplates(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = getUserIdFromRequest(request);

  try {
    const templates = await getTemplates(env.DB, userId ?? undefined);
    return json({ success: true, templates });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** GET /api/templates/:id — отримати шаблон. */
export async function handleGetTemplate(
  request: Request,
  env: Env,
  templateId: string,
): Promise<Response> {
  try {
    const template = await getTemplateById(env.DB, templateId);
    if (!template) return json({ error: "Template not found" }, 404);

    return json({ success: true, template });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/templates — створити шаблон. */
export async function handleCreateTemplate(
  request: Request,
  env: Env,
): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

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
      ownerId: userId,
      tags: body.tags,
    });

    return json({ success: true, template }, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** PUT /api/templates/:id — оновити шаблон. */
export async function handleUpdateTemplate(
  request: Request,
  env: Env,
  templateId: string,
): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const existing = await getTemplateById(env.DB, templateId);
  if (!existing) return json({ error: "Template not found" }, 404);
  if (existing.isSystem) return json({ error: "Cannot edit system template" }, 403);
  if (existing.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  try {
    const template = await updateTemplate(env.DB, templateId, {
      name: typeof body.name === "string" ? body.name : undefined,
      description: typeof body.description === "string" ? body.description : undefined,
      thumbnail: typeof body.thumbnail === "string" ? body.thumbnail : undefined,
      config: body.config as unknown as import("@wwwuabot/shared/types/site").SiteTemplateConfig | import("@wwwuabot/shared/types/site").PageTemplateConfig | undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });

    return json({ success: true, template });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** DELETE /api/templates/:id — видалити шаблон. */
export async function handleDeleteTemplate(
  request: Request,
  env: Env,
  templateId: string,
): Promise<Response> {
  const userId = getUserIdFromRequest(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const existing = await getTemplateById(env.DB, templateId);
  if (!existing) return json({ error: "Template not found" }, 404);
  if (existing.isSystem) return json({ error: "Cannot delete system template" }, 403);
  if (existing.ownerId !== userId) return json({ error: "Forbidden" }, 403);

  try {
    const deleted = await deleteTemplate(env.DB, templateId);
    return json({ success: true, deleted });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}
