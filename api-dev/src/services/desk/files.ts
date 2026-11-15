/**
 * Файли «Стола»: байти — в R2 (`desk/<thread_id>/…`), облік — у `desk_files`.
 * Завантаження: спершу об'єкт, потім рядок; видалення — навпаки. Автоматичного
 * прибирання немає: зайве видаляє людина, а не розклад.
 *
 * @module api-dev/src/services/desk/files
 */

import { DESK_FILE_MAX_BYTES, type DeskFile, type DeskSide } from "@wwwuabot/shared/desk/model";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../../shared/types";

export { DESK_FILE_MAX_BYTES };

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Ключ R2: `desk/<thread>/<мітка>-<slug>`; справжнє ім'я зберігається окремо. */
export function deskFileKey(threadId: number, name: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-60) || "file";
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return `desk/${threadId}/${stamp}-${slug}`;
}

/** Завантаження: multipart `thread`, необов'язковий `entry`, `file`. */
export async function uploadFile(request: Request, env: Env, side: DeskSide): Promise<Response> {
  if (!env.DESK_FILES) return json({ ok: false, error: "no_bucket" }, 503);

  const form = await request.formData().catch(() => null);
  if (!form) return json({ ok: false, error: "bad_form" }, 400);

  const threadId = Number(form.get("thread"));
  const entryIdRaw = Number(form.get("entry"));
  const entryId = Number.isInteger(entryIdRaw) && entryIdRaw > 0 ? entryIdRaw : null;
  const file = form.get("file");
  if (!Number.isInteger(threadId) || threadId <= 0)
    return json({ ok: false, error: "bad_id" }, 400);
  if (!(file instanceof File)) return json({ ok: false, error: "no_file" }, 400);
  if (file.size > DESK_FILE_MAX_BYTES) return json({ ok: false, error: "too_big" }, 413);

  const exists = await env.DB.prepare("SELECT id FROM desk_threads WHERE id = ?")
    .bind(threadId)
    .first<{ id: number }>();
  if (!exists) return json({ ok: false, error: "not_found" }, 404);

  const key = deskFileKey(threadId, file.name);
  const mime = file.type || "application/octet-stream";
  await env.DESK_FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: mime } });

  const now = formatSqliteDatetime();
  const inserted = await env.DB.prepare(
    `INSERT INTO desk_files (thread_id, entry_id, author, name, mime, bytes, r2_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(threadId, entryId, side, file.name.slice(0, 160), mime, file.size, key, now)
    .run();

  return json({
    ok: true,
    file: {
      id: Number(inserted.meta?.last_row_id ?? 0),
      thread_id: threadId,
      entry_id: entryId,
      author: side,
      name: file.name,
      mime,
      bytes: file.size,
      created_at: now,
    } satisfies DeskFile,
  });
}

/** Віддача байтів: лише за сесією адмінки, кеш приватний. */
export async function serveFile(request: Request, env: Env): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad_id" }, 400);
  if (!env.DESK_FILES) return json({ ok: false, error: "no_bucket" }, 503);

  const row = await env.DB.prepare("SELECT name, mime, r2_key FROM desk_files WHERE id = ?")
    .bind(id)
    .first<{ name: string; mime: string; r2_key: string }>();
  if (!row) return json({ ok: false, error: "not_found" }, 404);

  const object = await env.DESK_FILES.get(row.r2_key);
  if (!object) return json({ ok: false, error: "not_found" }, 404);

  // Ім'я в заголовку — percent-encoding: кирилиця має пережити будь-який клієнт.
  const encoded = encodeURIComponent(row.name).replace(/'/g, "%27");
  return new Response(object.body, {
    headers: {
      "Content-Type": row.mime || "application/octet-stream",
      "Cache-Control": "private, max-age=600",
      "Content-Disposition": `inline; filename*=UTF-8''${encoded}`,
    },
  });
}

/** Видалення файлу: рядок спершу, об'єкт потім. */
export async function deleteFile(request: Request, env: Env): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad_id" }, 400);

  const row = await env.DB.prepare("SELECT r2_key FROM desk_files WHERE id = ?")
    .bind(id)
    .first<{ r2_key: string }>();
  if (!row) return json({ ok: false, error: "not_found" }, 404);

  await env.DB.prepare("DELETE FROM desk_files WHERE id = ?").bind(id).run();
  if (env.DESK_FILES) await env.DESK_FILES.delete(row.r2_key);
  return json({ ok: true, id });
}

/** Файли, прикріплені до запису, — щоб видалити запис разом із ними. */
export async function fileKeysOfEntry(env: Env, entryId: number): Promise<string[]> {
  const rows = await env.DB.prepare("SELECT r2_key FROM desk_files WHERE entry_id = ?")
    .bind(entryId)
    .all<{ r2_key: string }>();
  return (rows.results ?? []).map((row) => row.r2_key);
}

/** Прибрати об'єкти, чиї рядки вже видалені. Викликається лише з дії людини. */
export async function dropObjects(env: Env, keys: string[]): Promise<void> {
  if (!env.DESK_FILES) return;
  for (const key of keys) await env.DESK_FILES.delete(key);
}
