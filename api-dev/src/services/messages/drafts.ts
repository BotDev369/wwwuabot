/**
 * Чернетки листів — ненадісланий текст, **власні дані того, хто пише**.
 *
 * Співрозмовник про чернетку не знає, тож вона й лежить окремо від переписки:
 * у `messages` — спільне, тут — моє.
 *
 * **Чернетка — документ зі своїм номером, а не пара людей.** Ключем був
 * `owner + peer`, і ціна цього — тихо з'їдена робота: друга збережена чернетка
 * тому самому адресатові переписувала першу. Тепер чернеток може бути скільки
 * завгодно (у тому числі одній людині — кожна зі своїм текстом), а номер її
 * відрізняє від «ще одної».
 *
 * **Адресат необов'язковий.** Почати лист, ще не вирішивши, кому він, — це
 * нормальний стан, а не помилка: текст уже написано, і втрачати його нема чого.
 * Але якщо адресата вказано, зв'язок перевіряється **першим** (`areLinked`), як
 * у решті дій переписки (§7): інакше чернетку можна було б завести кому
 * завгодно, а код відповіді (404 проти 400) підказував би, чи існує така людина.
 *
 * **Порожнє тіло прибирає чернетку** — і це не «зберегти порожнє»: чернетка без
 * тексту не несе нічого (адресат у ній — це поле, а не вміст), а рядок, що
 * лишився, показував би в списку порожнечу.
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

/** Те, що прийшло від клієнта: `id` — правка наявної, `null` — нова. */
export interface DraftInput {
  id: number | null;
  peerId: number | null;
  body: unknown;
}

interface DraftRow {
  id: number;
  peer_id: number | null;
  body: string | null;
  updated_at: string | null;
}

/** Та сама відмова, що в читанні розмови: чужий `peer` не має дізнатися нічого. */
function noLink(): { ok: false; status: number; error: string } {
  return { ok: false, status: 404, error: "Розмови з цією людиною немає" };
}

/**
 * Чернетки людини — найсвіжіша згори.
 *
 * Порядок тут, а не в клієнті: чернетку показують **списком**, і другий порядок
 * у клієнті означав би, що один список виглядає по-різному залежно від того, хто
 * його намалював.
 */
export async function readDrafts(env: Env, me: number): Promise<MessageDraft[]> {
  const result = await env.DB.prepare(
    `SELECT id, peer_id, body, updated_at FROM message_drafts
       WHERE owner_id = ? ORDER BY updated_at DESC, id DESC`,
  )
    .bind(me)
    .all<DraftRow>();

  return (result.results ?? []).map((row) => ({
    id: Number(row.id),
    peerId: row.peer_id === null ? null : Number(row.peer_id),
    body: row.body ?? "",
    updatedAt: row.updated_at ?? "",
  }));
}

/**
 * Чи це **моя** чернетка — і який номер вона має.
 *
 * Окремою перевіркою, а не умовою в `UPDATE`: чернетка носить чуже ім'я й чужий
 * текст, тож чужий номер мусить відповідати тим самим 404, що й чужий `peer`, —
 * інакше різниця в коді відповіді сама розповіла б, що така чернетка існує (§7).
 */
async function findOwnDraft(env: Env, me: number, id: number): Promise<DraftRow | null> {
  const row = await env.DB.prepare(
    "SELECT id, peer_id, body, updated_at FROM message_drafts WHERE id = ? AND owner_id = ?",
  )
    .bind(id, me)
    .first<DraftRow>();

  return row ?? null;
}

/**
 * Зберегти чернетку: нову (`id: null`) або правку наявної.
 *
 * Порядок перевірок навмисний: спершу «це моя чернетка», потім «з цим адресатом
 * можна писати», і лише потім будь-який запис. Обидві відмови — та сама 404:
 * чернетка несе чуже ім'я й чужий текст, і розрізняти «немає» від «не твоя»
 * означало б підказувати, що десь там воно є.
 */
export async function saveDraft(env: Env, me: number, input: DraftInput): Promise<DraftResult> {
  const body = sanitizeMessageBody(input.body);

  if (input.id !== null && !(await findOwnDraft(env, me, input.id))) {
    return { ok: false, status: 404, error: "Чернетки немає" };
  }
  if (input.peerId !== null && !(await areLinked(env.DB, me, input.peerId))) return noLink();

  // Порожнє тіло — чернетки немає. Для нової це просто «нічого не зберігати»:
  // чиста форма, з якої нічого не написали, не мусить лишати по собі рядок.
  if (!body) {
    if (input.id !== null) {
      await env.DB.prepare("DELETE FROM message_drafts WHERE id = ? AND owner_id = ?")
        .bind(input.id, me)
        .run();
    }
    return { ok: true, draft: null };
  }

  const now = formatSqliteDatetime();

  if (input.id !== null) {
    // Адресата можна **змінити й прибрати** (`NULL`), доки лист не надіслано:
    // чернетка — це текст, а «кому» в ній лишається полем.
    await env.DB.prepare(
      "UPDATE message_drafts SET peer_id = ?, body = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
    )
      .bind(input.peerId, body, now, input.id, me)
      .run();

    return { ok: true, draft: { id: input.id, peerId: input.peerId, body, updatedAt: now } };
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO message_drafts (owner_id, peer_id, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       RETURNING id`,
  )
    .bind(me, input.peerId, body, now, now)
    .first<{ id: number }>();

  return {
    ok: true,
    draft: { id: Number(inserted?.id ?? 0), peerId: input.peerId, body, updatedAt: now },
  };
}

/**
 * Прибрати **одну** чернетку — ту, з якої надіслали.
 *
 * Саме за номером, а не за адресатом: чернеток тій самій людині може бути
 * кілька, і надсилання з однієї не має права прибирати решту — то теж написане,
 * і воно лишається не надісланим.
 *
 * Перевіряти тут нема чого: надсилання вже пройшло перевірку зв'язку, а рядок,
 * якого не видно, не шкода — тому стирання обмежене власником у самому `WHERE`.
 */
export async function dropDraft(db: D1Database, me: number, id: number): Promise<void> {
  await db.prepare("DELETE FROM message_drafts WHERE id = ? AND owner_id = ?").bind(id, me).run();
}
