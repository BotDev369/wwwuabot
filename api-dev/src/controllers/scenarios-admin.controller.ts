/**
 * Правка двох таблиць контенту з панелі: `bot_scenarios` і `platform_pages`.
 *
 * Писати можна лише колонки зі списку нижче: ім'я колонки йде в SQL, тож воно
 * мусить бути з коду, а не з тіла запиту. Обидва JSON-поля перевіряються тут.
 *
 * @module api-dev/src/controllers/scenarios-admin.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";

/** Стеля списку: панель показує огляд, а не всю базу. */
const LIST_LIMIT = 300;

/** Що можна змінити в екрані бота. */
const BOT_FIELDS = [
  "bot_command",
  "photo_url",
  "caption_top",
  "caption_mid",
  "caption_bot",
  "keyboard_type",
  "buttons",
  "awaits_input",
  "input_path",
  "input_next",
  "price",
  "qty_options",
  "notify_groups",
  "notify_template",
  "rich_message",
  "rich_data",
  "is_active",
] as const;

/** Що можна змінити в сторінці платформи. */
const PAGE_FIELDS = [
  "slug",
  "title",
  "photo_url",
  "page_data",
  "template_key",
  "is_active",
  "is_public",
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

/** Лише оголошені ключі; решта тіла до SQL не доходить. */
function pickFields(
  allowed: readonly string[],
  body: Record<string, unknown>,
): Record<string, string | number | null> {
  const fields: Record<string, string | number | null> = {};
  for (const key of allowed) {
    if (!(key in body)) continue;
    const value = body[key];
    if (key === "is_active" || key === "is_public") {
      fields[key] = value ? 1 : 0;
      continue;
    }
    if (key === "rich_message") {
      fields[key] = value === true || value === "true" || value === 1 ? "true" : "false";
      continue;
    }
    fields[key] = typeof value === "string" ? value : value === null ? null : String(value);
  }
  return fields;
}

/** JSON-колонки: зламаний текст не має доходити до бази. */
function validJsonColumn(value: string | number | null, kind: "array" | "object"): boolean {
  if (value === null) return true;
  const text = String(value).trim();
  if (text === "") return true;
  try {
    const parsed: unknown = JSON.parse(text);
    return kind === "array"
      ? Array.isArray(parsed)
      : !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
  } catch {
    return false;
  }
}

async function ensure(env: Env): Promise<void> {
  await ensureTables(env.DB, ["bot_scenarios", "platform_pages"]);
}

interface BotListRow {
  id: number;
  slug: string;
  bot_command: string | null;
  title: string | null;
  keyboard_type: string;
  is_active: number | null;
  updated_at: string;
}

const BOT_SELECT = `SELECT b.id, b.slug, b.bot_command, b.keyboard_type, b.is_active,
    b.updated_at, p.title
  FROM bot_scenarios b LEFT JOIN platform_pages p ON p.slug = b.slug`;

async function botItem(db: D1Database, id: number): Promise<Record<string, unknown> | null> {
  return db
    .prepare(`SELECT * FROM bot_scenarios WHERE id = ?`)
    .bind(id)
    .first<Record<string, unknown>>();
}

/** `GET /api/admin/bot-scenarios` — екрани бота з назвою їхньої сторінки. */
export async function handleBotScenariosList(_request: Request, env: Env): Promise<Response> {
  try {
    await ensure(env);
    const result = await env.DB.prepare(`${BOT_SELECT} ORDER BY b.id LIMIT ?`)
      .bind(LIST_LIMIT)
      .all<BotListRow>();
    return json({ ok: true, items: result.results ?? [] });
  } catch (error: unknown) {
    apiLog.error("bot scenarios list error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/bot-scenarios/read` — усі поля екрана. */
export async function handleBotScenarioRead(request: Request, env: Env): Promise<Response> {
  try {
    await ensure(env);
    const id = readId(await readJsonObject(request));
    if (id === null) return json({ ok: false, error: "id required" }, 400);
    const item = await botItem(env.DB, id);
    return item ? json({ ok: true, item }) : json({ ok: false, error: "Not found" }, 404);
  } catch (error: unknown) {
    apiLog.error("bot scenario read error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

/** `POST /api/admin/bot-scenarios/update` — зберегти поля екрана. */
export async function handleBotScenarioUpdate(request: Request, env: Env): Promise<Response> {
  try {
    await ensure(env);
    const body = await readJsonObject(request);
    const id = readId(body);
    if (id === null) return json({ ok: false, error: "id required" }, 400);

    const fields = pickFields(BOT_FIELDS, body);
    if (!validJsonColumn(fields.buttons ?? null, "array")) {
      return json({ ok: false, error: "buttons: потрібен JSON-масив" }, 400);
    }
    if (!validJsonColumn(fields.rich_data ?? null, "array")) {
      return json({ ok: false, error: "rich_data: потрібен JSON-масив" }, 400);
    }

    const keys = Object.keys(fields);
    if (keys.length === 0) return json({ ok: false, error: "no fields" }, 400);

    const result = await env.DB.prepare(
      `UPDATE bot_scenarios SET ${keys.map((key) => `${key} = ?`).join(", ")}, updated_at = ?
        WHERE id = ?`,
    )
      .bind(...keys.map((key) => fields[key]), formatSqliteDatetime(), id)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);

    return json({ ok: true, item: await botItem(env.DB, id) });
  } catch (error: unknown) {
    apiLog.error("bot scenario update error", error);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}

interface PageListRow {
  id: number;
  slug: string;
  title: string | null;
  template_key: string | null;
  is_public: number | null;
  owner_id: string | null;
  updated_at: string;
}

/** `GET /api/admin/platform-pages` — сторінки платформи без `page_data`. */
export async function handlePlatformPagesList(_request: Request, env: Env): Promise<Response> {
  try {
    await ensure(env);
    const result = await env.DB.prepare(
      `SELECT id, slug, title, template_key, is_public, owner_id, updated_at
         FROM platform_pages ORDER BY id LIMIT ?`,
    )
      .bind(LIST_LIMIT)
      .all<PageListRow>();
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
    await ensure(env);
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
    await ensure(env);
    const body = await readJsonObject(request);
    const id = readId(body);
    if (id === null) return json({ ok: false, error: "id required" }, 400);

    const fields = pickFields(PAGE_FIELDS, body);
    if (!validJsonColumn(fields.page_data ?? null, "object")) {
      return json({ ok: false, error: "page_data: потрібен JSON-об'єкт" }, 400);
    }

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
