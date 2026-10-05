/**
 * Фото в листуванні — **єдиний шлюз** до файлів:
 *
 *   POST /api/messages/media      — завантажити фото (multipart: `peer`, `file`)
 *   GET  /api/messages/media/<…>  — **сам файл**, без авторизації
 *
 * @module api-dev/src/controllers/message-media.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { readMessageMedia, uploadMessageMedia } from "../services/messages/media";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Номер співрозмовника; `null` — не заданий або не номер. */
function readPeer(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * `POST /api/messages/media` — завантажити фото в розмову.
 *
 * Форма, а не тіло з байтами, бо поруч із файлом їде **кому**: співрозмовника
 * бере з форми, а не з адреси — інакше його можна було б підмінити непомітно серед
 * решти тіла.
 */
export async function handleMessageMediaUpload(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Очікується форма з файлом" }, 400);
  }

  const peer = readPeer(form.get("peer"));
  if (peer === null) return json({ ok: false, error: "Missing peer" }, 400);

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, error: "Файл не додано" }, 400);
  }

  try {
    const outcome = await uploadMessageMedia(env, identity.userId, peer, file);

    // Та сама відмова, що й в неіснуючої розмови: інша виказала б, що переписка
    // з цією людиною є (AGENTS.md §7).
    if (outcome.kind === "no_link") {
      return json({ ok: false, error: "Розмови з цією людиною немає" }, 404);
    }
    if (outcome.kind === "unavailable") {
      return json({ ok: false, error: "Сховище файлів не налаштоване" }, 503);
    }
    if (outcome.kind === "rejected") return json({ ok: false, error: outcome.message }, 400);

    return json({ ok: true, media: outcome.media });
  } catch (e: unknown) {
    apiLog.error("Message media upload error", e);
    return json({ ok: false, error: "Не вдалося завантажити фото" }, 500);
  }
}

/**
 * `GET /api/messages/media/<ключ>` — байти файлу.
 *
 * Ключ приходить з адреси цілком (він містить слеші), і його форму перевіряє
 * сервіс. `Cache-Control: immutable` — не прикраса: ключ видається разом із
 * завантаженням і не змінюється ніколи.
 */
export async function handleMessageMediaFile(env: Env, key: string): Promise<Response> {
  try {
    const object = await readMessageMedia(env, key);
    if (!object) return new Response("Not Found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");

    return new Response(object.body, { headers });
  } catch (e: unknown) {
    apiLog.error("Message media read error", e);
    return new Response("Internal error", { status: 500 });
  }
}
