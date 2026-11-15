/**
 * «Стіл»: теми, записи й прочитане; файли — поряд (`services/desk/files.ts`).
 * Пише й читає лише адмінка, тож автор тут сталий `serhii`. «Чия черга» —
 * рішення сторони, не висновок з останнього запису. Слова назовні — кодами.
 *
 * @module api-dev/src/controllers/desk.controller
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { parseTagsJson, sanitizeTags, tagsToJson } from "@wwwuabot/shared/notes";
import {
  buildEntryInput,
  buildThreadInput,
  type DeskEntry,
  type DeskFile,
  type DeskSide,
  type DeskThread,
} from "@wwwuabot/shared/desk/model";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { deleteFile, serveFile, uploadFile } from "../services/desk/files";
import { deleteEntry, deleteThread } from "./desk-remove";

/** Стеля списку: стіл — робоча поверхня, а не нескінченна стрічка. */
const LIST_LIMIT = 200;
/** Скільки останніх записів віддає одна тема за раз. */
const FEED_LIMIT = 200;

const THREAD_COLUMNS =
  "id, group_key, subgroup, title, status, turn, tags, due_at, priority, created_at, updated_at, last_entry_at, archived_at";
const ENTRY_COLUMNS = "id, thread_id, author, kind, body, meta, reply_to, created_at, edited_at";
const FILE_COLUMNS =
  "id, thread_id, entry_id, author, name, mime, bytes, r2_key, sha256, created_at";

/** Формат відповіді один на весь домен: JSON без кешу — це приватні дані. */
export function deskJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const threadSelect = THREAD_COLUMNS.split(", ")
  .map((column) => `t.${column}`)
  .join(", ");

function toThread(row: Record<string, unknown>): DeskThread {
  return {
    id: Number(row.id),
    group: String(row.group_key ?? ""),
    subgroup: String(row.subgroup ?? ""),
    title: String(row.title ?? ""),
    status: String(row.status ?? ""),
    turn: String(row.turn ?? ""),
    tags: parseTagsJson(row.tags as string | null),
    due_at: (row.due_at as string | null) ?? null,
    priority: Number(row.priority ?? 0),
    created_at: String(row.created_at ?? ""),
    updated_at: String(row.updated_at ?? ""),
    last_entry_at: String(row.last_entry_at ?? ""),
    archived: Boolean(row.archived_at),
    entries: Number(row.entries ?? 0),
    unread: Number(row.unread ?? 0),
  };
}

function toEntry(row: Record<string, unknown>): DeskEntry {
  let meta: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(row.meta ?? "{}"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) meta = parsed;
  } catch {
    meta = {};
  }
  return {
    id: Number(row.id),
    thread_id: Number(row.thread_id),
    author: String(row.author ?? ""),
    kind: String(row.kind ?? ""),
    body: String(row.body ?? ""),
    meta,
    reply_to: row.reply_to === null || row.reply_to === undefined ? null : Number(row.reply_to),
    created_at: String(row.created_at ?? ""),
    edited_at: (row.edited_at as string | null) ?? null,
  };
}

function toFile(row: Record<string, unknown>): DeskFile {
  return {
    id: Number(row.id),
    thread_id: Number(row.thread_id),
    entry_id: row.entry_id === null || row.entry_id === undefined ? null : Number(row.entry_id),
    author: String(row.author ?? ""),
    name: String(row.name ?? ""),
    mime: String(row.mime ?? ""),
    bytes: Number(row.bytes ?? 0),
    created_at: String(row.created_at ?? ""),
  };
}

/**
 * Список тем із лічильниками груп.
 *
 * `unread` — записи понад `last_seen_entry_id` **іншої** сторони: те, що
 * написали мені, а не те, що я написав сам. Рахується в SQL: окремий запит на
 * кожну тему був би N+1 на порожньому місці.
 */
async function listThreads(request: Request, env: Env, side: DeskSide): Promise<Response> {
  const url = new URL(request.url);
  const group = url.searchParams.get("group") ?? "all";
  const status = url.searchParams.get("status") ?? "all";
  const turn = url.searchParams.get("turn") ?? "all";
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  // Архів: `hide` (типово), `only`, `all`. Сховане не зникає — його видно в архіві.
  const archived = url.searchParams.get("archived") ?? "hide";

  const where: string[] = [];
  const conditions: unknown[] = [];
  if (group !== "all") {
    where.push("t.group_key = ?");
    conditions.push(group);
  }
  if (status !== "all") {
    where.push("t.status = ?");
    conditions.push(status);
  }
  if (turn !== "all") {
    where.push("t.turn = ?");
    conditions.push(turn);
  }
  if (archived === "hide") where.push("t.archived_at IS NULL");
  if (archived === "only") where.push("t.archived_at IS NOT NULL");
  if (query) {
    where.push("(LOWER(t.title) LIKE ? OR LOWER(t.tags) LIKE ? OR LOWER(t.subgroup) LIKE ?)");
    conditions.push(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  const sql = `SELECT ${threadSelect},
      (SELECT COUNT(*) FROM desk_entries e WHERE e.thread_id = t.id) AS entries,
      (SELECT COUNT(*) FROM desk_entries u
         WHERE u.thread_id = t.id AND u.author <> ? AND u.id > COALESCE(r.last_seen_entry_id, 0)) AS unread
    FROM desk_threads t
    LEFT JOIN desk_reads r ON r.thread_id = t.id AND r.side = ?
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY t.archived_at IS NOT NULL, t.priority DESC, t.last_entry_at DESC, t.id DESC
    LIMIT ?`;

  // Порядок зв'язувань — як у SQL: підзапит `unread`, `LEFT JOIN`, умови, стеля.
  const result = await env.DB.prepare(sql)
    .bind(side, side, ...conditions, LIST_LIMIT)
    .all<Record<string, unknown>>();

  const counts = await env.DB.prepare(
    `SELECT group_key, COUNT(*) AS total FROM desk_threads
       WHERE archived_at IS NULL GROUP BY group_key`,
  ).all<{ group_key: string; total: number }>();

  return deskJson({
    ok: true,
    threads: (result.results ?? []).map(toThread),
    counts: Object.fromEntries((counts.results ?? []).map((row) => [row.group_key, row.total])),
    total: (result.results ?? []).length,
  });
}

/** Одна тема: шапка, стрічка з найстаріших і всі файли теми. */
async function readThread(request: Request, env: Env): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return deskJson({ ok: false, error: "bad_id" }, 400);

  const thread = await env.DB.prepare(`SELECT ${threadSelect} FROM desk_threads t WHERE t.id = ?`)
    .bind(id)
    .first<Record<string, unknown>>();
  if (!thread) return deskJson({ ok: false, error: "not_found" }, 404);

  const entries = await env.DB.prepare(
    `SELECT ${ENTRY_COLUMNS} FROM desk_entries WHERE thread_id = ? ORDER BY id ASC LIMIT ?`,
  )
    .bind(id, FEED_LIMIT)
    .all<Record<string, unknown>>();

  const files = await env.DB.prepare(
    `SELECT ${FILE_COLUMNS} FROM desk_files WHERE thread_id = ? ORDER BY id ASC`,
  )
    .bind(id)
    .all<Record<string, unknown>>();

  return deskJson({
    ok: true,
    thread: toThread(thread),
    entries: (entries.results ?? []).map(toEntry),
    files: (files.results ?? []).map(toFile),
  });
}

/** Створити або змінити тему: `id` є — правка, немає — нова. */
async function saveThread(request: Request, env: Env, side: DeskSide): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return deskJson({ ok: false, error: "bad_json" }, 400);

  const input = buildThreadInput(body, sanitizeTags(body.tags));
  if (!input) return deskJson({ ok: false, error: "empty_title" }, 400);

  const id = Number(body.id);
  const now = formatSqliteDatetime();
  const tags = tagsToJson(input.tags);

  if (Number.isInteger(id) && id > 0) {
    // `archived` — три стани: `true` — в архів, `false` — назад, відсутнє —
    // не чіпати. Інакше кожна правка назви повертала б тему з архіву.
    const archived =
      body.archived === true || body.archived === 1
        ? now
        : body.archived === false || body.archived === 0
          ? null
          : undefined;
    const archiveSql = archived === undefined ? "" : ", archived_at = ?";
    const result = await env.DB.prepare(
      `UPDATE desk_threads
         SET group_key = ?, subgroup = ?, title = ?, status = ?, turn = ?, tags = ?,
             due_at = ?, priority = ?, updated_at = ?${archiveSql}
       WHERE id = ?`,
    )
      .bind(
        input.group,
        input.subgroup,
        input.title,
        input.status,
        input.turn,
        tags,
        input.due_at,
        input.priority,
        now,
        ...(archived === undefined ? [] : [archived]),
        id,
      )
      .run();
    if ((result.meta?.changes ?? 0) === 0) return deskJson({ ok: false, error: "not_found" }, 404);
    return readThread(new Request(`${new URL(request.url).origin}?id=${id}`), env);
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO desk_threads
       (group_key, subgroup, title, status, turn, tags, due_at, priority, created_at, updated_at, last_entry_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      input.group,
      input.subgroup,
      input.title,
      input.status,
      input.turn,
      tags,
      input.due_at,
      input.priority,
      now,
      now,
      now,
    )
    .run();

  // Щойно створена тема не має світитись як «нове» для того, хто її створив.
  const newId = Number(inserted.meta?.last_row_id ?? 0);
  await env.DB.prepare(
    `INSERT INTO desk_reads (side, thread_id, last_seen_entry_id, seen_at) VALUES (?, ?, 0, ?)
       ON CONFLICT(side, thread_id) DO UPDATE SET seen_at = excluded.seen_at`,
  )
    .bind(side, newId, now)
    .run();

  return readThread(new Request(`${new URL(request.url).origin}?id=${newId}`), env);
}

/** Додати або виправити запис; хід теми не перекидається. */
async function saveEntry(request: Request, env: Env, side: DeskSide): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return deskJson({ ok: false, error: "bad_json" }, 400);

  const threadId = Number(body.thread_id);
  if (!Number.isInteger(threadId) || threadId <= 0)
    return deskJson({ ok: false, error: "bad_id" }, 400);

  const input = buildEntryInput(body);
  if (!input) return deskJson({ ok: false, error: "empty_body" }, 400);

  const exists = await env.DB.prepare("SELECT id FROM desk_threads WHERE id = ?")
    .bind(threadId)
    .first<{ id: number }>();
  if (!exists) return deskJson({ ok: false, error: "not_found" }, 404);

  const now = formatSqliteDatetime();
  const entryId = Number(body.id);

  if (Number.isInteger(entryId) && entryId > 0) {
    // Правка не рухає `last_entry_at`: інакше виправлена кома стрибала б у
    // списку вище за справді нові теми.
    const result = await env.DB.prepare(
      `UPDATE desk_entries SET kind = ?, body = ?, meta = ?, edited_at = ? WHERE id = ? AND thread_id = ?`,
    )
      .bind(input.kind, input.body, JSON.stringify(input.meta), now, entryId, threadId)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return deskJson({ ok: false, error: "not_found" }, 404);
  } else {
    await env.DB.prepare(
      `INSERT INTO desk_entries (thread_id, author, kind, body, meta, reply_to, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(threadId, side, input.kind, input.body, JSON.stringify(input.meta), input.reply_to, now)
      .run();

    await env.DB.prepare("UPDATE desk_threads SET last_entry_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, threadId)
      .run();
  }

  return readThread(new Request(`${new URL(request.url).origin}?id=${threadId}`), env);
}

/** Позначити тему вичитаною: `last_seen_entry_id` тільки росте. */
async function markRead(request: Request, env: Env, side: DeskSide): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const threadId = Number(body?.thread_id);
  const lastSeen = Number(body?.last_seen_entry_id ?? 0);
  if (!Number.isInteger(threadId) || threadId <= 0)
    return deskJson({ ok: false, error: "bad_id" }, 400);

  await env.DB.prepare(
    `INSERT INTO desk_reads (side, thread_id, last_seen_entry_id, seen_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(side, thread_id) DO UPDATE
         SET last_seen_entry_id = MAX(last_seen_entry_id, excluded.last_seen_entry_id),
             seen_at = excluded.seen_at`,
  )
    .bind(
      side,
      threadId,
      Number.isFinite(lastSeen) ? Math.max(0, Math.trunc(lastSeen)) : 0,
      formatSqliteDatetime(),
    )
    .run();
  return deskJson({ ok: true });
}

/**
 * `/api/admin/desk/*`: один домен — один модуль, як `routes/trackers.ts`.
 * Підшлях приходить без префікса, а бік — із сесії (розбір — `routes/desk.ts`).
 */
export async function handleDesk(
  request: Request,
  env: Env,
  sub: string,
  side: DeskSide,
): Promise<Response> {
  try {
    await ensureTables(env.DB, ["desk_threads", "desk_entries", "desk_files", "desk_reads"]);

    switch (sub) {
      case "threads":
        return await listThreads(request, env, side);
      case "thread":
        if (request.method === "GET") return await readThread(request, env);
        if (request.method === "POST") return await saveThread(request, env, side);
        if (request.method === "DELETE") return await deleteThread(request, env);
        return deskJson({ ok: false, error: "method_not_allowed" }, 405);
      case "entry":
        if (request.method === "POST") return await saveEntry(request, env, side);
        if (request.method === "DELETE") return await deleteEntry(request, env);
        return deskJson({ ok: false, error: "method_not_allowed" }, 405);
      case "read":
        if (request.method === "POST") return await markRead(request, env, side);
        return deskJson({ ok: false, error: "method_not_allowed" }, 405);
      case "file":
        if (request.method === "GET") return await serveFile(request, env);
        if (request.method === "POST") return await uploadFile(request, env, side);
        if (request.method === "DELETE") return await deleteFile(request, env);
        return deskJson({ ok: false, error: "method_not_allowed" }, 405);
      default:
        return deskJson({ ok: false, error: "not_found" }, 404);
    }
  } catch (e: unknown) {
    apiLog.error("Desk error", e);
    return deskJson({ ok: false, error: e instanceof Error ? e.message : "unknown" }, 500);
  }
}
