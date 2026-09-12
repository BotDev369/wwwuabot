/**
 * Фабрика CRUD-контролера для таблиць сценаріїв.
 *
 * `scenarios` (портал) і `scenarios-admin` мають ідентичну схему й ідентичну
 * логіку — раніше це були два файли по ~300 рядків, які відрізнялися лише
 * константою `TABLE`. Будь-який фікс доводилось робити двічі, і вони вже
 * встигли розійтися (admin створює таблицю, портал — ні).
 *
 * Тепер логіка одна; таблиця передається аргументом. Маршрути не змінюються —
 * тонкі обгортки `scenarios-admin.controller.ts` / `scenarios-portal.controller.ts`
 * лишаються точками входу для роутера.
 *
 * @module api-dev/src/controllers/scenarios.controller.factory
 */

import type { Env } from "../shared/types";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

/** Опції фабрики контролера сценаріїв. */
export interface ScenariosControllerOptions {
  /** Назва таблиці (вставляється в SQL у лапках). */
  table: string;
  /** Створює таблицю, якщо її немає. Для портальної таблиці не потрібно. */
  ensureTable?: (db: D1Database) => Promise<void>;
}

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

/** SQL створення таблиці зі схемою сценарію. */
export function ensureScenariosTable(db: D1Database, table: string): Promise<void> {
  return db
    .prepare(
      `CREATE TABLE IF NOT EXISTS "${table}" (
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
    .then(() => undefined)
    .catch(() => undefined);
}

/**
 * Створює набір хендлерів для однієї таблиці сценаріїв.
 *
 * Повертає ті самі шість функцій, які раніше експортував кожен контролер.
 */
export function createScenariosController({ table, ensureTable }: ScenariosControllerOptions) {
  const ensure = ensureTable ?? (async () => {});

  /** POST …/read — прочитати один запис. */
  async function handleRead(request: Request, env: Env): Promise<Response> {
    let body: { codeword?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!body.codeword) return json({ error: "codeword required" }, 400);

    await ensure(env.DB);
    const row = await env.DB.prepare(`SELECT * FROM "${table}" WHERE codeword = ?`)
      .bind(body.codeword)
      .first();
    return json({ success: true, data: row ?? null });
  }

  /** POST …/write — UPSERT запису. */
  async function handleWrite(request: Request, env: Env): Promise<Response> {
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
      `INSERT INTO "${table}" (${columns.join(", ")}) VALUES (${placeholders})
       ON CONFLICT(codeword) DO UPDATE SET ${setClause}`,
    )
      .bind(...(values as (string | number | boolean | null)[]))
      .run();

    return json({ success: true, codeword, updated_at: now });
  }

  /** GET …/list — список записів з ETag і 304. */
  async function handleList(request: Request, env: Env): Promise<Response> {
    await ensure(env.DB);
    const meta = await env.DB.prepare(
      `SELECT COUNT(*) AS c, MAX(updated_at) AS m FROM "${table}"`,
    ).first<{ c: number; m: string | null }>();
    const etag = `"${meta?.c ?? 0}-${meta?.m ?? ""}"`;

    if (request.headers.get("If-None-Match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    const result = await env.DB.prepare(`SELECT * FROM "${table}" ORDER BY codeword ASC`).all();
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
  async function handleReadAll(request: Request, env: Env): Promise<Response> {
    let body: { codeword?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    if (!body.codeword) return json({ error: "codeword required" }, 400);

    try {
      await ensure(env.DB);
      const row = await env.DB.prepare(`SELECT * FROM "${table}" WHERE codeword = ?`)
        .bind(body.codeword)
        .first();
      return json({ success: true, data: row ?? null });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "DB error";
      return json({ error: msg }, 500);
    }
  }

  /** POST …/update — оновити передані колонки (за потреби додає нову). */
  async function handleUpdate(request: Request, env: Env): Promise<Response> {
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
      await env.DB.prepare(`UPDATE "${table}" SET ${setClause} WHERE codeword = ?`)
        .bind(...(values as (string | number | boolean | null)[]), codeword)
        .run();
      return json({ success: true, updated_at: now });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("no such column")) {
        const match = msg.match(/no such column: (\w+)/);
        if (match && fields[match[1]] !== undefined) {
          const colName = match[1];
          const type = typeof fields[colName] === "number" ? "INTEGER" : "TEXT";
          await env.DB.prepare(
            `ALTER TABLE "${table}" ADD COLUMN ${colName} ${type} DEFAULT NULL`,
          ).run();
          const now2 = formatSqliteDatetime();
          const setClause2 = [...keys.map((k) => `${k} = ?`), "updated_at = ?"].join(", ");
          const values2 = [...keys.map((k) => fields[k]), now2];
          await env.DB.prepare(`UPDATE "${table}" SET ${setClause2} WHERE codeword = ?`)
            .bind(...(values2 as (string | number | boolean | null)[]), codeword)
            .run();
          return json({ success: true, updated_at: now2 });
        }
      }
      return json({ error: msg }, 500);
    }
  }

  /** POST …/delete — видалити запис. */
  async function handleDelete(request: Request, env: Env): Promise<Response> {
    let body: { codeword?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
    const codeword = typeof body.codeword === "string" ? body.codeword.trim() : "";
    if (!codeword) return json({ error: "codeword required" }, 400);

    const result = await env.DB.prepare(`DELETE FROM "${table}" WHERE codeword = ?`)
      .bind(codeword)
      .run();
    const deleted = (result.meta?.changes ?? 0) > 0;
    return json({ success: true, deleted, codeword });
  }

  return {
    handleRead,
    handleWrite,
    handleList,
    handleReadAll,
    handleUpdate,
    handleDelete,
  };
}
