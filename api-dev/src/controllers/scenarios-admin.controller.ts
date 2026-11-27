/**
 * Правка сценаріїв бота з панелі: `lookup` — один ключ на екран, `kind` —
 * віджет або rich. З платформою сценарій не пов'язаний.
 *
 * HTML перевіряється до запису: 32768 байт — межа Telegram, і краще відмовити в
 * панелі, ніж зберегти екран, який не надішлеться.
 *
 * @module api-dev/src/controllers/scenarios-admin.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveAdminTenant } from "../shared/admin-tenant";

const LIST_LIMIT = 300;
const HTML_LIMIT = 32768;
const FIELDS = [
  "kind",
  "widget_html",
  "widget_data",
  "rich_html",
  "notify_groups",
  "notify_template",
  "is_active",
] as const;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function readId(body: Record<string, unknown>): number | null {
  const id = Number(body.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function pickFields(body: Record<string, unknown>): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = {};
  for (const key of FIELDS) {
    if (!(key in body)) continue;
    const value = body[key];
    if (key === "is_active") {
      fields[key] = value ? 1 : 0;
      continue;
    }
    fields[key] = typeof value === "string" ? value : value === null ? null : String(value);
  }
  return fields;
}

function bytes(text: string): number {
  return new TextEncoder().encode(text).length;
}

function validScenario(fields: Record<string, string | number | null>): string | null {
  const kind = String(fields.kind ?? "");
  if (kind !== "widget" && kind !== "rich") return "kind: потрібен widget або rich";

  if (kind === "widget") {
    const html = String(fields.widget_html ?? "");
    if (!html.trim()) return "widget_html: порожній HTML";
    if (bytes(html) > HTML_LIMIT) return "widget_html: більше 32768 байт";
  }
  if (kind === "rich") {
    const html = String(fields.rich_html ?? "");
    if (!html.trim()) return "rich_html: порожній HTML";
    if (bytes(html) > HTML_LIMIT) return "rich_html: більше 32768 байт";
  }
  return null;
}

async function scenario(
  db: D1Database,
  tenantId: number,
  id: number,
): Promise<Record<string, unknown> | null> {
  return db
    .prepare("SELECT * FROM bot_scenarios WHERE tenant_id = ? AND id = ?")
    .bind(tenantId, id)
    .first<Record<string, unknown>>();
}

/**
 * `POST /api/admin/bot-scenarios/create` — завести екран у проєкті.
 *
 * `lookup` — ключ, за яким бот знайде екран (`/start`, `about`, текст кнопки),
 * тому він не змінюється після створення: інша адреса — інший екран. Повтор
 * того самого ключа в тому самому проєкті — `409`, а не другий рядок.
 */
export async function handleBotScenarioCreate(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    await ensureTables(env.DB, ["bot_scenarios"]);
    const body = await readJsonObject(request);
    const lookup = String(body.lookup ?? "").trim();
    if (!lookup) return json({ ok: false, error: "lookup required" }, 400);
    if (lookup.length > 128) return json({ ok: false, error: "lookup too long" }, 400);

    const fields = pickFields(body);
    const problem = validScenario(fields);
    if (problem) return json({ ok: false, error: problem }, 400);

    const result = await env.DB.prepare(
      `INSERT OR IGNORE INTO bot_scenarios
         (tenant_id, lookup, kind, widget_html, widget_data, rich_html,
          notify_groups, notify_template, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        tenant.tenant.id,
        lookup,
        fields.kind,
        fields.widget_html ?? null,
        fields.widget_data ?? null,
        fields.rich_html ?? null,
        fields.notify_groups ?? null,
        fields.notify_template ?? null,
        "is_active" in fields ? fields.is_active : 1,
        formatSqliteDatetime(),
      )
      .run();
    if ((result.meta?.changes ?? 0) === 0) {
      return json({ ok: false, error: "lookup_taken" }, 409);
    }

    const item = await env.DB.prepare(
      "SELECT * FROM bot_scenarios WHERE tenant_id = ? AND lookup = ?",
    )
      .bind(tenant.tenant.id, lookup)
      .first<Record<string, unknown>>();
    return json({ ok: true, item }, 201);
  } catch (error: unknown) {
    apiLog.error("bot scenario create error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `GET /api/admin/bot-scenarios` — усі сценарії без важкого HTML. */
export async function handleBotScenariosList(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    await ensureTables(env.DB, ["bot_scenarios"]);
    const result = await env.DB.prepare(
      `SELECT id, lookup, kind, is_active, updated_at
         FROM bot_scenarios WHERE tenant_id = ? ORDER BY lookup LIMIT ?`,
    )
      .bind(tenant.tenant.id, LIST_LIMIT)
      .all();
    return json({ ok: true, items: result.results ?? [] });
  } catch (error: unknown) {
    apiLog.error("bot scenarios list error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/bot-scenarios/read` — один сценарій із HTML. */
export async function handleBotScenarioRead(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    await ensureTables(env.DB, ["bot_scenarios"]);
    const id = readId(await readJsonObject(request));
    if (id === null) return json({ ok: false, error: "id required" }, 400);
    const item = await scenario(env.DB, tenant.tenant.id, id);
    return item ? json({ ok: true, item }) : json({ ok: false, error: "Not found" }, 404);
  } catch (error: unknown) {
    apiLog.error("bot scenario read error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/bot-scenarios/update` — зберегти екран. */
export async function handleBotScenarioUpdate(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    await ensureTables(env.DB, ["bot_scenarios"]);
    const body = await readJsonObject(request);
    const id = readId(body);
    if (id === null) return json({ ok: false, error: "id required" }, 400);

    const fields = pickFields(body);
    if (Object.keys(fields).length === 0) return json({ ok: false, error: "no fields" }, 400);
    if ("kind" in fields) {
      const problem = validScenario(fields);
      if (problem) return json({ ok: false, error: problem }, 400);
    }

    const keys = Object.keys(fields);
    const result = await env.DB.prepare(
      `UPDATE bot_scenarios SET ${keys.map((key) => `${key} = ?`).join(", ")}, updated_at = ?
        WHERE tenant_id = ? AND id = ?`,
    )
      .bind(...keys.map((key) => fields[key]), formatSqliteDatetime(), tenant.tenant.id, id)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);

    return json({ ok: true, item: await scenario(env.DB, tenant.tenant.id, id) });
  } catch (error: unknown) {
    apiLog.error("bot scenario update error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/* ── Сторінки платформи: окрема таблиця, окремий екран, з ботом не пов'язані ── */

async function pageItem(
  db: D1Database,
  tenantId: number,
  id: number,
): Promise<Record<string, unknown> | null> {
  return db
    .prepare("SELECT * FROM platform_pages WHERE tenant_id = ? AND id = ?")
    .bind(tenantId, id)
    .first<Record<string, unknown>>();
}

/** `GET /api/admin/platform-pages` — сторінки платформи без `page_data`. */
export async function handlePlatformPagesList(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    await ensureTables(env.DB, ["platform_pages"]);
    const result = await env.DB.prepare(
      `SELECT id, slug, title, template_key, is_public, owner_id, updated_at
         FROM platform_pages WHERE tenant_id = ? ORDER BY id LIMIT ?`,
    )
      .bind(tenant.tenant.id, LIST_LIMIT)
      .all();
    return json({ ok: true, items: result.results ?? [] });
  } catch (error: unknown) {
    apiLog.error("platform pages list error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/platform-pages/read` — усі поля сторінки. */
export async function handlePlatformPageRead(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    await ensureTables(env.DB, ["platform_pages"]);
    const id = readId(await readJsonObject(request));
    if (id === null) return json({ ok: false, error: "id required" }, 400);
    const item = await pageItem(env.DB, tenant.tenant.id, id);
    return item ? json({ ok: true, item }) : json({ ok: false, error: "Not found" }, 404);
  } catch (error: unknown) {
    apiLog.error("platform page read error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}
