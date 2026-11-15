/**
 * Видалення зі «Стола» — зворотна дія до створення, і єдине місце, де рядки
 * гинуть назавжди. Тут же прибираються об'єкти R2: без цього файл лишався б у
 * бакеті без жодного запису, що на нього вказує.
 *
 * @module api-dev/src/controllers/desk-remove
 */

import type { Env } from "../shared/types";
import { dropObjects, fileKeysOfEntry } from "../services/desk/files";
import { deskJson } from "./desk.controller";

/** Видалити запис разом із його файлами: рядки спершу, об'єкти потім. */
export async function deleteEntry(request: Request, env: Env): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return deskJson({ ok: false, error: "bad_id" }, 400);

  const keys = await fileKeysOfEntry(env, id);
  const result = await env.DB.prepare("DELETE FROM desk_entries WHERE id = ?").bind(id).run();
  if ((result.meta?.changes ?? 0) === 0) return deskJson({ ok: false, error: "not_found" }, 404);

  await env.DB.prepare("DELETE FROM desk_files WHERE entry_id = ?").bind(id).run();
  await dropObjects(env, keys);
  return deskJson({ ok: true, id });
}

/** Видалити тему разом із записами, файлами й позначками прочитаного. */
export async function deleteThread(request: Request, env: Env): Promise<Response> {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return deskJson({ ok: false, error: "bad_id" }, 400);

  const exists = await env.DB.prepare("SELECT id FROM desk_threads WHERE id = ?")
    .bind(id)
    .first<{ id: number }>();
  if (!exists) return deskJson({ ok: false, error: "not_found" }, 404);

  const files = await env.DB.prepare("SELECT r2_key FROM desk_files WHERE thread_id = ?")
    .bind(id)
    .all<{ r2_key: string }>();
  const keys = (files.results ?? []).map((row) => row.r2_key);

  await env.DB.prepare("DELETE FROM desk_entries WHERE thread_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM desk_files WHERE thread_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM desk_reads WHERE thread_id = ?").bind(id).run();
  await env.DB.prepare("DELETE FROM desk_threads WHERE id = ?").bind(id).run();
  await dropObjects(env, keys);
  return deskJson({ ok: true, id });
}
