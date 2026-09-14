/**
 * CRUD-контролер єдиного сховища контенту `scenarios`.
 *
 * Рядок адресується двома назвами, і ролі в них різні: **номер** (`id`) —
 * ідентичність, **адреса** (`slug`) — те, за чим ходять веб і бот. Адресу
 * редагують, тому `update` вимагає номер: інакше перейменування виглядало б як
 * «рядок не знайдено» або створювало б другий рядок з тією ж адресою.
 *
 * Читання й видалення приймають і номер, і адресу — адреса потрібна тому, у
 * кого є лише посилання. Створення (`write`) — єдиний випадок, де адреса є
 * ключем: новий рядок з'являється саме з нею.
 *
 * @module api-dev/src/controllers/scenarios-portal.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";
import {
  filterFields,
  isSlugConflict,
  readId,
  readNextSlug,
  readSlug,
  rowFilter,
  type RowFilter,
} from "../shared/scenarios-address";

const TABLE = "scenarios";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ensure(db: D1Database): Promise<void> {
  return ensureTables(db, [TABLE]);
}

/**
 * Колонка пошуку підставляється в SQL, тому вона мусить бути з білого списку,
 * а не з тіла запиту (`rowFilter` віддає лише `id` або `slug`).
 */
function where(filter: RowFilter): string {
  return `${filter.column} = ?`;
}

async function readRow(env: Env, filter: RowFilter): Promise<Record<string, unknown> | null> {
  await ensure(env.DB);
  return env.DB.prepare(`SELECT * FROM "${TABLE}" WHERE ${where(filter)}`)
    .bind(filter.value)
    .first<Record<string, unknown>>();
}

/** Тіло запиту або `null`, якщо це не JSON-об'єкт. */
async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── read ─────────────────────────────────────────────────────────────
/** POST …/read — прочитати один запис за номером або адресою. */
export async function handleRead(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return json({ error: "Invalid JSON" }, 400);

  const filter = rowFilter(body);
  if (!filter) return json({ error: "id or slug required" }, 400);

  return json({ success: true, data: await readRow(env, filter) });
}

// ── write ────────────────────────────────────────────────────────────
/**
 * POST …/write — UPSERT за адресою.
 *
 * Єдине місце, де адреса є ключем: так створюється новий рядок. Перейменування
 * тут неможливе за побудовою — для нього є `update`, який знає номер.
 */
export async function handleWrite(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return json({ error: "Invalid JSON" }, 400);

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

  // `id` тут не віддаємо: у гілці `DO UPDATE` лічильник вставок SQLite не
  // рухається, тож `last_row_id` показав би **чужий** номер (або 0). Краще
  // промовчати, ніж назвати номер, за яким відкриється інша сторінка.
  return json({ success: true, slug, updated_at: now });
}

// ── list ─────────────────────────────────────────────────────────────
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

  const result = await env.DB.prepare(`SELECT * FROM "${TABLE}" ORDER BY id ASC`).all();
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

// ── read-all ─────────────────────────────────────────────────────────
/** POST …/read-all — прочитати всі поля рядка (редактор картки). */
export async function handleReadAll(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return json({ error: "Invalid JSON" }, 400);

  const filter = rowFilter(body);
  if (!filter) return json({ error: "id or slug required" }, 400);

  try {
    return json({ success: true, data: await readRow(env, filter) });
  } catch (error: unknown) {
    return json({ error: error instanceof Error ? error.message : "DB error" }, 500);
  }
}

// ── update ───────────────────────────────────────────────────────────
/**
 * POST …/update — оновити передані колонки **за номером**.
 *
 * `id` тут обов'язковий: він і є тим, що робить перейменування можливим.
 * Адреса в тілі — нове значення (`slug`), а не ключ пошуку.
 */
export async function handleUpdate(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return json({ error: "Invalid JSON" }, 400);

  const id = readId(body);
  if (id === null) return json({ error: "id required" }, 400);

  const nextSlug = readNextSlug(body);
  if (nextSlug === null) {
    return json({ error: "slug invalid: лише [a-z0-9-] у сегментах, розділювач — «/»" }, 400);
  }

  const fields = filterFields(body);
  if (nextSlug !== undefined) fields.slug = nextSlug;

  const keys = Object.keys(fields);
  if (keys.length === 0) return json({ error: "no fields to update" }, 400);

  await ensure(env.DB);
  const now = formatSqliteDatetime();
  const setClause = [...keys.map((key) => `${key} = ?`), "updated_at = ?"].join(", ");
  const values = [...keys.map((key) => fields[key]), now] as (string | number | boolean | null)[];

  try {
    const info = await env.DB.prepare(`UPDATE "${TABLE}" SET ${setClause} WHERE id = ?`)
      .bind(...values, id)
      .run();

    if ((info.meta?.changes ?? 0) === 0) {
      return json({ error: "row not found", id }, 404);
    }

    const row = nextSlug === undefined ? await readRow(env, { column: "id", value: id }) : null;
    return json({
      success: true,
      id,
      slug: nextSlug ?? (row?.slug as string | undefined) ?? null,
      updated_at: now,
    });
  } catch (error: unknown) {
    if (isSlugConflict(error)) {
      return json({ error: `Адреса «${nextSlug}» вже зайнята іншим рядком` }, 409);
    }
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
}

// ── delete ───────────────────────────────────────────────────────────
/** POST …/delete — видалити рядок за номером або адресою. */
export async function handleDelete(request: Request, env: Env): Promise<Response> {
  const body = await readBody(request);
  if (!body) return json({ error: "Invalid JSON" }, 400);

  const filter = rowFilter(body);
  if (!filter) return json({ error: "id or slug required" }, 400);

  const result = await env.DB.prepare(`DELETE FROM "${TABLE}" WHERE ${where(filter)}`)
    .bind(filter.value)
    .run();
  const deleted = (result.meta?.changes ?? 0) > 0;
  return json({ success: true, deleted, id: readId(body), slug: readSlug(body) });
}
