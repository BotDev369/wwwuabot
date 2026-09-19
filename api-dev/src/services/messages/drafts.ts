/**
 * Чернетки листів — ненадісланий текст, **власні дані того, хто пише**.
 *
 * Співрозмовник про чернетку не знає, тож вона й лежить окремо від переписки:
 * у `messages` — спільне, тут — моє. Ключ тому пара людей, а не розмова:
 * чернетку заводять **до** першого повідомлення, коли рядка `conversations`
 * ще не існує.
 *
 * **Порожнє тіло прибирає чернетку** — і це не «зберегти порожнє»: чернетка без
 * тексту нічого не несе, а рядок, що лишився, змушував би форму відкриватися
 * порожньою й виглядати як «щось збережено».
 *
 * **Зв'язок перевіряється першим** (`areLinked`) — як у решті дій переписки
 * (§7): інакше чернетку можна було б завести кому завгодно, а код відповіді
 * (404 проти 400) підказував би, чи існує така людина.
 *
 * @module api-dev/src/services/messages/drafts
 */

import type { MessageDraft } from "@wwwuabot/shared/messages";
import { sanitizeMessageBody } from "@wwwuabot/shared/messages";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../../shared/types";
import { areLinked } from "./links";

export type DraftResult =
  { ok: true; draft: MessageDraft | null } | { ok: false; status: number; error: string };

interface DraftRow {
  peer_id: number;
  body: string | null;
  updated_at: string | null;
}

/** Та сама відмова, що в читанні розмови: чужий `peer` не має дізнатися нічого. */
function noLink(): { ok: false; status: number; error: string } {
  return { ok: false, status: 404, error: "Розмови з цією людиною немає" };
}

function toDraft(row: DraftRow): MessageDraft {
  return {
    peerId: Number(row.peer_id),
    body: row.body ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/** Чернетки людини — найсвіжіша згори: форма відкривається саме нею. */
export async function readDrafts(env: Env, me: number): Promise<MessageDraft[]> {
  const result = await env.DB.prepare(
    `SELECT peer_id, body, updated_at FROM message_drafts
       WHERE owner_id = ? ORDER BY updated_at DESC, id DESC`,
  )
    .bind(me)
    .all<DraftRow>();

  return (result.results ?? []).map(toDraft);
}

/**
 * Зберегти чернетку; порожнє тіло — прибрати її.
 *
 * `ON CONFLICT … DO UPDATE` тут замість «спитати, а тоді вставити»: чернетка на
 * пару рівно одна (`UNIQUE (owner_id, peer_id)`), і два запити з того самого
 * екрана дали б або помилку обмеження, або другий рядок.
 */
export async function saveDraft(
  env: Env,
  me: number,
  peerId: number,
  rawBody: unknown,
): Promise<DraftResult> {
  if (!(await areLinked(env.DB, me, peerId))) return noLink();

  const body = sanitizeMessageBody(rawBody);

  if (!body) {
    await env.DB.prepare("DELETE FROM message_drafts WHERE owner_id = ? AND peer_id = ?")
      .bind(me, peerId)
      .run();
    return { ok: true, draft: null };
  }

  const now = formatSqliteDatetime();
  await env.DB.prepare(
    `INSERT INTO message_drafts (owner_id, peer_id, body, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(owner_id, peer_id) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
  )
    .bind(me, peerId, body, now)
    .run();

  return { ok: true, draft: { peerId, body, updatedAt: now } };
}

/**
 * Прибрати чернетку цієї пари — **без перевірки зв'язку**.
 *
 * Викликається з надсилання: текст уже пішов у переписку, і чернетка, що
 * лишилась, наступного разу відкрила б форму з уже надісланим. Такого
 * «прибирання за собою» перевіряти нема чого: рядка, якого не видно, не шкода.
 */
export async function dropDraft(db: D1Database, me: number, peerId: number): Promise<void> {
  await db
    .prepare("DELETE FROM message_drafts WHERE owner_id = ? AND peer_id = ?")
    .bind(me, peerId)
    .run();
}
