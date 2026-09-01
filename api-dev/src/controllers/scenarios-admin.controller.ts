/**
 * Контролер CRUD для таблиці `scenarios-admin`.
 *
 * Перенесено з `web-admin/worker.ts` в api/ (задача Фази 3).
 * web/ працює з таблицею `scenarios`, web-admin — з `scenarios-admin`.
 *
 * Ендпоїнти:
 *   POST /api/admin/scenarios/read       — прочитати за codeword
 *   POST /api/admin/scenarios/write      — UPSERT (create/update)
 *   GET  /api/admin/scenarios/list       — список (ETag + 304)
 *   POST /api/admin/scenarios/read-all   — прочитати всі поля за codeword
 *   POST /api/admin/scenarios/update     — оновити передані поля
 *   POST /api/admin/scenarios/delete     — видалити за codeword
 */

import type { Env } from "../shared/types";
import { formatSqliteDatetime } from "../shared/datetime";

/** Назва таблиці для admin-сценаріїв. */
const TABLE = "scenarios-admin";

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Гарантує наявність таблиці (CREATE TABLE IF NOT EXISTS). */
async function ensureTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS "${TABLE}" (
        codeword TEXT PRIMARY KEY,
        title TEXT,
        rich_message TEXT,
        rich_data TEXT,
        caption_top TEXT,
        caption_mid TEXT,
        caption_bot TEXT,
        photo_url TEXT,
        buttons TEXT,
        page_data TEXT,
        keyboard_type TEXT,
        created_at TEXT,
        updated_at TEXT
      )`,
    )
    .run()
    .catch(() => {});
}

const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PROTECTED = new Set(["codeword", "created_at", "updated_at"]);

function filterFields(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED.has(key)) continue;
    if (!SAFE_RE.test(key)) continue;
    fields[key] = value === "" ? null : value;
  }
  return fields;
}

// ── Handlers ──────────────────────────────────────────────────────

/** POST /api/admin/scenarios/read — прочитати один запис. */
export async function handleRead(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { codeword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.codeword) return json({ error: "codeword required" }, 400);

  await ensureTable(env.DB);
  const row = await env.DB.prepare(
    `SELECT * FROM "${TABLE}" WHERE codeword = ?`,
  )
    .bind(body.codeword)
    .first();
  return json({ success: true, data: row ?? null });
}

/** POST /api/admin/scenarios/write — UPSERT запису. */
export async function handleWrite(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const codeword =
    typeof body.codeword === "string" ? body.codeword.trim() : "";
  if (!codeword) return json({ error: "codeword required" }, 400);

  const now = formatSqliteDatetime();
  const fields = filterFields(body);
  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  await ensureTable(env.DB);
  const columns = ["codeword", ...keys, "updated_at"];
  const placeholders = columns.map(() => "?").join(", ");
  const setClause = [
    ...keys.map((k) => `${k} = excluded.${k}`),
    "updated_at = excluded.updated_at",
  ].join(", ");
  const values: unknown[] = [
    codeword,
    ...keys.map((k) => fields[k]),
    now,
  ];

  await env.DB.prepare(
    `INSERT INTO "${TABLE}" (${columns.join(", ")}) VALUES (${placeholders})
     ON CONFLICT(codeword) DO UPDATE SET ${setClause}`,
  )
    .bind(
      ...(values as (string | number | boolean | null)[]),
    )
    .run();

  return json({ success: true, codeword, updated_at: now });
}

/** GET /api/admin/scenarios/list — список записів з ETag. */
export async function handleList(
  request: Request,
  env: Env,
): Promise<Response> {
  await ensureTable(env.DB);
  const meta = await env.DB.prepare(
    `SELECT COUNT(*) AS c, MAX(updated_at) AS m FROM "${TABLE}"`,
  ).first<{ c: number; m: string | null }>();
  const etag = `"${meta?.c ?? 0}-${meta?.m ?? ""}"`;

  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  const result = await env.DB.prepare(
    `SELECT * FROM "${TABLE}" ORDER BY codeword ASC`,
  ).all();
  const items = (result.results ?? []).map(
    (row: Record<string, unknown>) => {
      const copy = { ...row };
      delete copy.buttons;
      delete copy.rich_data;
      return copy;
    },
  );

  return new Response(JSON.stringify({ success: true, items }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
    },
  });
}

/** POST /api/admin/scenarios/read-all — прочитати всі поля. */
export async function handleReadAll(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { codeword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.codeword) return json({ error: "codeword required" }, 400);

  try {
    await ensureTable(env.DB);
    const row = await env.DB.prepare(
      `SELECT * FROM "${TABLE}" WHERE codeword = ?`,
    )
      .bind(body.codeword)
      .first();
    return json({ success: true, data: row ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/scenarios/update — оновити передані колонки. */
export async function handleUpdate(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const codeword =
    typeof body.codeword === "string" ? body.codeword.trim() : "";
  if (!codeword) return json({ error: "codeword required" }, 400);

  const PROTECTED_UPDATE = new Set(["codeword", "created_at"]);
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED_UPDATE.has(key)) continue;
    if (!SAFE_RE.test(key)) continue;
    fields[key] = value;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  try {
    await ensureTable(env.DB);
    const now = formatSqliteDatetime();
    const setClause = [...keys.map((k) => `${k} = ?`), "updated_at = ?"].join(", ");
    const values = [...keys.map((k) => fields[k]), now];
    await env.DB.prepare(
      `UPDATE "${TABLE}" SET ${setClause} WHERE codeword = ?`,
    )
      .bind(
        ...(values as (string | number | boolean | null)[]),
        codeword,
      )
      .run();
    return json({ success: true, updated_at: now });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such column")) {
      const match = msg.match(/no such column: (\w+)/);
      if (match && fields[match[1]] !== undefined) {
        const colName = match[1];
        const type =
          typeof fields[colName] === "number" ? "INTEGER" : "TEXT";
        await env.DB.prepare(
          `ALTER TABLE "${TABLE}" ADD COLUMN ${colName} ${type} DEFAULT NULL`,
        ).run();
        const now2 = formatSqliteDatetime();
        const setClause2 = [
          ...keys.map((k) => `${k} = ?`),
          "updated_at = ?",
        ].join(", ");
        const values2 = [...keys.map((k) => fields[k]), now2];
        await env.DB.prepare(
          `UPDATE "${TABLE}" SET ${setClause2} WHERE codeword = ?`,
        )
          .bind(
            ...(values2 as (string | number | boolean | null)[]),
            codeword,
          )
          .run();
        return json({ success: true, updated_at: now2 });
      }
    }
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/scenarios/delete — видалити запис. */
export async function handleDelete(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { codeword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const codeword =
    typeof body.codeword === "string" ? body.codeword.trim() : "";
  if (!codeword) return json({ error: "codeword required" }, 400);

  const result = await env.DB.prepare(
    `DELETE FROM "${TABLE}" WHERE codeword = ?`,
  )
    .bind(codeword)
    .run();
  const deleted = (result.meta?.changes ?? 0) > 0;
  return json({ success: true, deleted, codeword });
}
