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

const LIST_LIMIT = 300;
const HTML_LIMIT = 32768;
const FIELDS = [
  "kind",
  "caption",
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

async function scenario(db: D1Database, id: number): Promise<Record<string, unknown> | null> {
  return db
    .prepare("SELECT * FROM bot_scenarios WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
}

/** `GET /api/admin/bot-scenarios` — усі сценарії без важкого HTML. */
export async function handleBotScenariosList(_request: Request, env: Env): Promise<Response> {
  try {
    await ensureTables(env.DB, ["bot_scenarios"]);
    const result = await env.DB.prepare(
      `SELECT id, lookup, kind, caption, is_active, updated_at
         FROM bot_scenarios ORDER BY lookup LIMIT ?`,
    )
      .bind(LIST_LIMIT)
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
    await ensureTables(env.DB, ["bot_scenarios"]);
    const id = readId(await readJsonObject(request));
    if (id === null) return json({ ok: false, error: "id required" }, 400);
    const item = await scenario(env.DB, id);
    return item ? json({ ok: true, item }) : json({ ok: false, error: "Not found" }, 404);
  } catch (error: unknown) {
    apiLog.error("bot scenario read error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/bot-scenarios/update` — зберегти екран. */
export async function handleBotScenarioUpdate(request: Request, env: Env): Promise<Response> {
  try {
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
        WHERE id = ?`,
    )
      .bind(...keys.map((key) => fields[key]), formatSqliteDatetime(), id)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);

    return json({ ok: true, item: await scenario(env.DB, id) });
  } catch (error: unknown) {
    apiLog.error("bot scenario update error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/* ── Сторінки платформи: окрема таблиця, окремий екран, з ботом не пов'язані ── */

const PAGE_FIELDS = [
  "slug",
  "title",
  "photo_url",
  "page_data",
  "template_key",
  "is_active",
  "is_public",
] as const;

function pickPageFields(body: Record<string, unknown>): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = {};
  for (const key of PAGE_FIELDS) {
    if (!(key in body)) continue;
    const value = body[key];
    if (key === "is_active" || key === "is_public") {
      fields[key] = value ? 1 : 0;
      continue;
    }
    fields[key] = typeof value === "string" ? value : value === null ? null : String(value);
  }
  return fields;
}

function validPage(fields: Record<string, string | number | null>): boolean {
  if (!("page_data" in fields)) return true;
  const text = String(fields.page_data ?? "").trim();
  if (text === "") return true;
  try {
    const parsed: unknown = JSON.parse(text);
    return !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

/** `GET /api/admin/platform-pages` — сторінки платформи без `page_data`. */
export async function handlePlatformPagesList(_request: Request, env: Env): Promise<Response> {
  try {
    await ensureTables(env.DB, ["platform_pages"]);
    const result = await env.DB.prepare(
      `SELECT id, slug, title, template_key, is_public, owner_id, updated_at
         FROM platform_pages ORDER BY id LIMIT ?`,
    )
      .bind(LIST_LIMIT)
      .all();
    return json({ ok: true, items: result.results ?? [] });
  } catch (error: unknown) {
    apiLog.error("platform pages list error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

async function pageItem(db: D1Database, id: number): Promise<Record<string, unknown> | null> {
  return db
    .prepare("SELECT * FROM platform_pages WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
}

/** `POST /api/admin/platform-pages/read` — усі поля сторінки. */
export async function handlePlatformPageRead(request: Request, env: Env): Promise<Response> {
  try {
    await ensureTables(env.DB, ["platform_pages"]);
    const id = readId(await readJsonObject(request));
    if (id === null) return json({ ok: false, error: "id required" }, 400);
    const item = await pageItem(env.DB, id);
    return item ? json({ ok: true, item }) : json({ ok: false, error: "Not found" }, 404);
  } catch (error: unknown) {
    apiLog.error("platform page read error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/platform-pages/update` — зберегти поля сторінки. */
export async function handlePlatformPageUpdate(request: Request, env: Env): Promise<Response> {
  try {
    await ensureTables(env.DB, ["platform_pages"]);
    const body = await readJsonObject(request);
    const id = readId(body);
    if (id === null) return json({ ok: false, error: "id required" }, 400);

    const fields = pickPageFields(body);
    if (!validPage(fields))
      return json({ ok: false, error: "page_data: потрібен JSON-об'єкт" }, 400);

    const keys = Object.keys(fields);
    if (keys.length === 0) return json({ ok: false, error: "no fields" }, 400);

    const result = await env.DB.prepare(
      `UPDATE platform_pages SET ${keys.map((key) => `${key} = ?`).join(", ")}, updated_at = ?
        WHERE id = ?`,
    )
      .bind(...keys.map((key) => fields[key]), formatSqliteDatetime(), id)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);

    return json({ ok: true, item: await pageItem(env.DB, id) });
  } catch (error: unknown) {
    apiLog.error("platform page update error", error);
    const message = error instanceof Error ? error.message : "";
    if (/UNIQUE constraint failed: platform_pages\.slug/.test(message)) {
      return json({ ok: false, error: "Адреса вже зайнята іншою сторінкою" }, 409);
    }
    return json({ ok: false, error: "Internal error" }, 500);
  }
}
