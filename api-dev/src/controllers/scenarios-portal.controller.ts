/**
 * CRUD-контролер таблиці `scenarios` — контенту, який читають бот і платформа.
 *
 * **Навіщо тут колись була фабрика.** Поруч жила таблиця `scenarios-admin` з
 * ідентичною схемою, і логіка була винесена в `createScenariosController({ table })`,
 * щоб два контролери не розходились. Адмін-копію видалено 13.09.2026 (її не
 * читав ніхто поза адмінкою), тож фабрика з одним покупцем лишалась би
 * порожньою ланкою — контролер один, і він тут.
 *
 * Схему (таблицю й колонки) дає реєстр (`@wwwuabot/shared/database/tables`):
 * окремого `CREATE TABLE` тут немає й бути не може.
 *
 * Ендпоїнти:
 *   POST /api/portal/scenarios/read       — прочитати за codeword
 *   POST /api/portal/scenarios/write      — UPSERT (create/update)
 *   GET  /api/portal/scenarios/list       — список (ETag + 304)
 *   POST /api/portal/scenarios/read-all   — прочитати всі поля за codeword
 *   POST /api/portal/scenarios/update     — оновити передані поля
 *   POST /api/portal/scenarios/delete     — видалити за codeword
 *
 * @module api-dev/src/controllers/scenarios-portal.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { Env } from "../shared/types";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

/** Єдина таблиця сценаріїв — та сама, з якої читає bot-dev. */
const TABLE = "scenarios";

/** Колонки, які ніколи не приймаються ззовні. */
const PROTECTED = new Set(["codeword", "created_at", "updated_at"]);

/** Дозволені імена колонок — захист від SQL-ін'єкції через ключі об'єкта. */
const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Відкидає службові/небезпечні ключі та серіалізує об'єкти. */
function filterFields(body: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED.has(key)) continue;
    if (!SAFE_RE.test(key)) continue;
    if (value === "") {
      fields[key] = null;
    } else if (value !== null && typeof value === "object") {
      fields[key] = JSON.stringify(value);
    } else {
      fields[key] = value;
    }
  }
  return fields;
}

/** Схему (таблицю і колонки) дає реєстр; тут лишається тільки виклик. */
function ensure(db: D1Database) {
  return ensureTables(db, ["scenarios"]);
}

/** POST …/read — прочитати один запис. */
export async function handleRead(request: Request, env: Env): Promise<Response> {
  let body: { codeword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.codeword) return json({ error: "codeword required" }, 400);

  await ensure(env.DB);
  const row = await env.DB.prepare(`SELECT * FROM "${TABLE}" WHERE codeword = ?`)
    .bind(body.codeword)
    .first();
  return json({ success: true, data: row ?? null });
}

/** POST …/write — UPSERT запису. */
export async function handleWrite(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const codeword = typeof body.codeword === "string" ? body.codeword.trim() : "";
  if (!codeword) return json({ error: "codeword required" }, 400);

  const now = formatSqliteDatetime();
  const fields = filterFields(body);
  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  await ensure(env.DB);
  const columns = ["codeword", ...keys, "updated_at"];
  const placeholders = columns.map(() => "?").join(", ");
  const setClause = [
    ...keys.map((k) => `${k} = excluded.${k}`),
    "updated_at = excluded.updated_at",
  ].join(", ");
  const values: unknown[] = [codeword, ...keys.map((k) => fields[k]), now];

  await env.DB.prepare(
    `INSERT INTO "${TABLE}" (${columns.join(", ")}) VALUES (${placeholders})
       ON CONFLICT(codeword) DO UPDATE SET ${setClause}`,
  )
    .bind(...(values as (string | number | boolean | null)[]))
    .run();

  return json({ success: true, codeword, updated_at: now });
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

  const result = await env.DB.prepare(`SELECT * FROM "${TABLE}" ORDER BY codeword ASC`).all();
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

/** POST …/read-all — прочитати всі поля за codeword. */
export async function handleReadAll(request: Request, env: Env): Promise<Response> {
  let body: { codeword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.codeword) return json({ error: "codeword required" }, 400);

  try {
    await ensure(env.DB);
    const row = await env.DB.prepare(`SELECT * FROM "${TABLE}" WHERE codeword = ?`)
      .bind(body.codeword)
      .first();
    return json({ success: true, data: row ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST …/update — оновити передані колонки. */
export async function handleUpdate(request: Request, env: Env): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const codeword = typeof body.codeword === "string" ? body.codeword.trim() : "";
  if (!codeword) return json({ error: "codeword required" }, 400);

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED.has(key)) continue;
    if (key === "updated_at") continue;
    if (!SAFE_RE.test(key)) continue;
    fields[key] = value;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  try {
    await ensure(env.DB);
    const now = formatSqliteDatetime();
    const setClause = [...keys.map((k) => `${k} = ?`), "updated_at = ?"].join(", ");
    const values = [...keys.map((k) => fields[k]), now];
    await env.DB.prepare(`UPDATE "${TABLE}" SET ${setClause} WHERE codeword = ?`)
      .bind(...(values as (string | number | boolean | null)[]), codeword)
      .run();
    return json({ success: true, updated_at: now });
  } catch (e: unknown) {
    // Колонку, якої немає, більше **не** створюємо на льоту: схема оголошена
    // в реєстрі. Інакше база «доростала» б колонками з помилки SQLite.
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

/** POST …/delete — видалити запис. */
export async function handleDelete(request: Request, env: Env): Promise<Response> {
  let body: { codeword?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const codeword = typeof body.codeword === "string" ? body.codeword.trim() : "";
  if (!codeword) return json({ error: "codeword required" }, 400);

  const result = await env.DB.prepare(`DELETE FROM "${TABLE}" WHERE codeword = ?`)
    .bind(codeword)
    .run();
  const deleted = (result.meta?.changes ?? 0) > 0;
  return json({ success: true, deleted, codeword });
}
