/**
 * CRUD-контролер єдиного сховища контенту `scenarios`.
 * Адреса запису всюди називається `slug`; веб і Telegram будують її подання
 * через `@wwwuabot/shared/content`.
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { isValidSlug, normalizeSlug } from "@wwwuabot/shared/content";
import type { Env } from "../shared/types";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

const TABLE = "scenarios";
const PROTECTED = new Set(["slug", "created_at", "updated_at"]);
const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensure(db: D1Database): Promise<void> {
  return ensureTables(db, ["scenarios"]);
}

function readSlug(body: Record<string, unknown>): string | null {
  if (typeof body.slug !== "string") return null;
  const slug = normalizeSlug(body.slug);
  return isValidSlug(slug) ? slug : null;
}

function filterFields(body: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED.has(key) || !SAFE_RE.test(key)) continue;
    fields[key] =
      value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : value === ""
          ? null
          : value;
  }
  return fields;
}

async function readBySlug(env: Env, slug: string): Promise<Record<string, unknown> | null> {
  await ensure(env.DB);
  return env.DB.prepare(`SELECT * FROM "${TABLE}" WHERE slug = ?`)
    .bind(slug)
    .first<Record<string, unknown>>();
}

/** POST …/read — прочитати один запис. */
export async function handleRead(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const slug = readSlug(body);
  if (slug === null) return json({ error: "slug required or invalid" }, 400);
  return json({ success: true, data: await readBySlug(env, slug) });
}

/** POST …/write — UPSERT запису. */
export async function handleWrite(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const slug = readSlug(body);
  if (slug === null) return json({ error: "slug required or invalid" }, 400);

  const now = formatSqliteDatetime();
  const fields = filterFields(body);
  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  await ensure(env.DB);
  const columns = ["slug", ...keys, "updated_at"];
  const placeholders = columns.map(() => "?").join(", ");
  const setClause = [
    ...keys.map((key) => `${key} = excluded.${key}`),
    "updated_at = excluded.updated_at",
  ].join(", ");
  const values = [slug, ...keys.map((key) => fields[key]), now] as (
    string | number | boolean | null
  )[];

  await env.DB.prepare(
    `INSERT INTO "${TABLE}" (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(slug) DO UPDATE SET ${setClause}`,
  )
    .bind(...values)
    .run();

  return json({ success: true, slug, updated_at: now });
}

/** GET …/list — список записів з ETag і 304. */
export async function handleList(request: Request, env: Env): Promise<Response> {
  await ensure(env.DB);
  const meta = await env.DB.prepare(
    `SELECT COUNT(*) AS c, MAX(updated_at) AS m FROM "${TABLE}"`,
  ).first<{ c: number; m: string | null }>();
  const etag = `"${meta?.c ?? 0}-${meta?.m ?? ""}"`;

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  const result = await env.DB.prepare(`SELECT * FROM "${TABLE}" ORDER BY slug ASC`).all();
  const items = (result.results ?? []).map((row: Record<string, unknown>) => {
    const copy = { ...row };
    delete copy.buttons;
    delete copy.rich_data;
    return copy;
  });

  return new Response(JSON.stringify({ success: true, items }), {
    status: 200,
    headers: { "Content-Type": "application/json", ETag: etag },
  });
}

/** POST …/read-all — прочитати всі поля за slug. */
export async function handleReadAll(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const slug = readSlug(body);
  if (slug === null) return json({ error: "slug required or invalid" }, 400);
  try {
    return json({ success: true, data: await readBySlug(env, slug) });
  } catch (error: unknown) {
    return json({ error: error instanceof Error ? error.message : "DB error" }, 500);
  }
}

/** POST …/update — оновити передані колонки. */
export async function handleUpdate(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const slug = readSlug(body);
  if (slug === null) return json({ error: "slug required or invalid" }, 400);

  const fields = filterFields(body);
  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  try {
    await ensure(env.DB);
    const now = formatSqliteDatetime();
    const setClause = [...keys.map((key) => `${key} = ?`), "updated_at = ?"].join(", ");
    const values = [...keys.map((key) => fields[key]), now, slug] as (
      string | number | boolean | null
    )[];
    await env.DB.prepare(`UPDATE "${TABLE}" SET ${setClause} WHERE slug = ?`)
      .bind(...values)
      .run();
    return json({ success: true, updated_at: now, slug });
  } catch (error: unknown) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

/** POST …/delete — видалити запис. */
export async function handleDelete(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const slug = readSlug(body);
  if (slug === null) return json({ error: "slug required or invalid" }, 400);

  const result = await env.DB.prepare(`DELETE FROM "${TABLE}" WHERE slug = ?`).bind(slug).run();
  const deleted = (result.meta?.changes ?? 0) > 0;
  return json({ success: true, deleted, slug });
}
