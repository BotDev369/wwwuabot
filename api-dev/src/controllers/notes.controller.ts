/**
 * Контролер нотаток — один на обидва простори.
 *
 * Різниця між платформою й панеллю тут рівно одна: **звідки береться власник**.
 * У платформі це Telegram-id із підписаного `initData` (`resolveUserId`), у
 * панелі — акаунт cookie-сесії, яку вже перевірив адмін-гейт у `router.ts`.
 * Усе інше — список, валідація, запис — те саме, тому й код той самий: друга
 * копія цих правил для адмінки розійшлася б із першою тихо.
 *
 * Сховище — таблиця `notes` (`packages/shared/src/database/tables.ts`).
 *
 * @module api-dev/src/controllers/notes.controller
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  SHARED_ADMIN_OWNER,
  parseTagsJson,
  sanitizeNoteText,
  sanitizeTags,
  tagsToJson,
  type NoteRow,
  type NoteScope,
} from "@wwwuabot/shared/notes";
import { resolveUserId } from "../shared/identity";
import { apiLog } from "../shared/logger";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

/** Стеля списку: нотатки — не стрічка новин, а робоча поверхня. */
const LIST_LIMIT = 200;

/** Колонки читаємо за іменами, а не `SELECT *`: так само, як у інших таблицях. */
const COLUMNS = "id, scope, owner_id, text, tags, created_at, updated_at";

/** Рядок, як він лежить у D1. */
interface NoteRecord {
  id: number;
  scope: string;
  owner_id: string;
  text: string | null;
  tags: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Рядок бази → нотатка для клієнта (JSON тегів розбирає спільне правило). */
function toNote(row: NoteRecord): NoteRow {
  return {
    id: row.id,
    scope: row.scope === "admin" ? "admin" : "user",
    owner_id: row.owner_id,
    text: row.text ?? "",
    tags: parseTagsJson(row.tags),
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

async function listNotes(db: D1Database, scope: NoteScope, ownerId: string): Promise<NoteRow[]> {
  const result = await db
    .prepare(
      `SELECT ${COLUMNS} FROM notes WHERE scope = ? AND owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`,
    )
    .bind(scope, ownerId, LIST_LIMIT)
    .all<NoteRecord>();
  return (result.results ?? []).map(toNote);
}

/** Читає один рядок — **разом з умовою власника**, щоб чужий не віддався. */
async function readNote(
  db: D1Database,
  id: number,
  scope: NoteScope,
  ownerId: string,
): Promise<NoteRow | null> {
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM notes WHERE id = ? AND scope = ? AND owner_id = ?`)
    .bind(id, scope, ownerId)
    .first<NoteRecord>();
  return row ? toNote(row) : null;
}

/**
 * Запис нотатки: `id` є — правка, немає — нова.
 *
 * Власник стоїть **у самому `WHERE`**, а не окремою перевіркою «це мій
 * розділ»: інакше чужий номер під своїм користувачем пройшов би перевірку й
 * переписав чужий рядок. З тієї ж причини не існує й різних відповідей для
 * «немає» та «чужий» — обидві 404, бо код відповіді теж витік (AGENTS.md §7).
 */
async function saveNote(
  request: Request,
  db: D1Database,
  scope: NoteScope,
  ownerId: string,
): Promise<Response> {
  let body: { id?: unknown; text?: unknown; tags?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  const text = sanitizeNoteText(body.text);
  const tags = sanitizeTags(body.tags);
  if (text === "" && tags.length === 0) {
    return json({ ok: false, error: "Порожня нотатка" }, 400);
  }

  const id = Number(body.id);
  const now = formatSqliteDatetime();

  if (Number.isInteger(id) && id > 0) {
    const result = await db
      .prepare(
        "UPDATE notes SET text = ?, tags = ?, updated_at = ? WHERE id = ? AND scope = ? AND owner_id = ?",
      )
      .bind(text, tagsToJson(tags), now, id, scope, ownerId)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, note: await readNote(db, id, scope, ownerId) });
  }

  const inserted = await db
    .prepare(
      "INSERT INTO notes (scope, owner_id, text, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(scope, ownerId, text, tagsToJson(tags), now, now)
    .run();

  const newId = inserted.meta?.last_row_id ?? 0;
  return json({ ok: true, note: await readNote(db, newId, scope, ownerId) });
}

/** Спільний обробник: дозволені лише `GET` (список) і `POST` (запис). */
async function handle(
  request: Request,
  env: Env,
  scope: NoteScope,
  ownerId: string,
): Promise<Response> {
  try {
    await ensureTables(env.DB, ["notes"]);

    if (request.method === "GET") {
      return json({ ok: true, notes: await listNotes(env.DB, scope, ownerId) });
    }
    if (request.method === "POST") {
      return await saveNote(request, env.DB, scope, ownerId);
    }
    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Notes error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
}

/**
 * `GET` / `POST /api/notes` — нотатки людини.
 *
 * Ідентичність — тільки з підписаного `initData`: жоден заголовок чи параметр
 * не називає власника (AGENTS.md §7).
 */
export async function handleNotes(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;
  return handle(request, env, "user", String(identity.userId));
}

/**
 * `GET` / `POST /api/admin/notes` — нотатки про проєкт із панелі.
 *
 * Особи в cookie-сесії поки немає (вхід — один пароль), тож власник спільний.
 * Коли з'являться особисті входи, тут стане id людини — і більше нічого
 * міняти не треба (`SHARED_ADMIN_OWNER`).
 */
export async function handleAdminNotes(request: Request, env: Env): Promise<Response> {
  return handle(request, env, "admin", SHARED_ADMIN_OWNER);
}
