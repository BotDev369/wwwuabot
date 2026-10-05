/**
 * Фото в листуванні: байти в R2, облік у рядку `message_media`.
 * Патерн той самий, що в файлах магазину: файл спершу завантажують, потім
 * приєднують до повідомлення, тож між кроками він уже існує — без рядка обліку
 * його неможливо прибрати, порахувати й приєднати.
 *
 * @module api-dev/src/services/messages/media
 */

import {
  MESSAGE_MEDIA_PER_USER,
  isMessageMediaKey,
  messageMediaKey,
} from "@wwwuabot/shared/messages";
import { mediaRandomToken, validateImageUpload } from "@wwwuabot/shared/files";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Env } from "../../shared/types";
import { areLinked } from "./links";
import { ensureMessagesSchema } from "./schema";

/** Рядок обліку файлу — те, що база знає про файл. */
export interface MessageMedia {
  id: number;
  key: string;
  mime: string;
  bytes: number;
}

/** Що сталося із завантаженням: контролер перекладає це в код відповіді. */
export type UploadOutcome =
  | { kind: "saved"; media: MessageMedia }
  | { kind: "rejected"; message: string }
  | { kind: "unavailable" }
  | { kind: "no_link" };

/** Колонки читаємо за іменами, а не `SELECT *` (AGENTS.md §7). */
const COLUMNS = "id, r2_key, mime, bytes";
/** Ті самі колонки з префіксом таблиці — для запиту, де є `JOIN`. */
const JOINED_COLUMNS = "md.id, md.r2_key, md.mime, md.bytes";

interface MediaRow {
  id: number;
  r2_key: string;
  mime: string | null;
  bytes: number | null;
}

function toMedia(row: MediaRow): MessageMedia {
  return {
    id: Number(row.id),
    key: row.r2_key,
    mime: row.mime ?? "",
    bytes: Number(row.bytes ?? 0),
  };
}

/** Бакет може бути не прив'язаний — тоді це 503, а не виняток. */
function bucket(env: Env): R2Bucket | null {
  return env.MESSAGE_MEDIA ?? null;
}

/**
 * Завантаження: перевірка → байти в R2 → рядок обліку.
 *
 * Порядок саме такий, бо кожен крок може відмовити: **зв'язок перевіряється
 * першим**, до будь-якого запису про файли — інакше людина, з ким зв'язку немає,
 * дізналася б про відмінну відповідь. Тип і розмір — до читання в пам'ять, рядок
 * пишеться після того, як байти лягли в бакет (рядок без байтів — бите посилання).
 */
export async function uploadMessageMedia(
  env: Env,
  me: number,
  peerId: number,
  file: File,
): Promise<UploadOutcome> {
  if (!(await areLinked(env.DB, me, peerId))) return { kind: "no_link" };

  const target = bucket(env);
  if (!target) return { kind: "unavailable" };

  const checked = validateImageUpload({ mime: file.type, bytes: file.size });
  if (!checked.ok) return { kind: "rejected", message: checked.message };

  await ensureMessagesSchema(env.DB);
  if ((await ownCount(env, me)) >= MESSAGE_MEDIA_PER_USER) {
    return { kind: "rejected", message: "Забагато фото в листуваннях — приберіть старі розмови" };
  }

  const key = messageMediaKey(me, file.name, mediaRandomToken());
  const bytes = await file.arrayBuffer();

  await target.put(key, bytes, { httpMetadata: { contentType: file.type } });

  const inserted = await env.DB.prepare(
    `INSERT INTO message_media (owner_id, r2_key, mime, bytes, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(me, key, file.type, bytes.byteLength, formatSqliteDatetime())
    .run();

  const row = await env.DB.prepare(`SELECT ${COLUMNS} FROM message_media WHERE id = ?`)
    .bind(inserted.meta?.last_row_id ?? 0)
    .first<MediaRow>();

  return row ? { kind: "saved", media: toMedia(row) } : { kind: "unavailable" };
}

/** Скільки фото вже завантажила людина — межа квоти. */
async function ownCount(env: Env, me: number): Promise<number> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS total FROM message_media WHERE owner_id = ?")
    .bind(me)
    .first<{ total: number }>();
  return Number(row?.total ?? 0);
}

/**
 * Фото, яке можна приєднати до нового повідомлення, — `null`, якщо ні.
 *
 * Три умови в одному запиті, бо це три відмови з **однією** відповіддю: не мій
 * рядок, неіснуючий номер і вже приєднане фото. Різні тексти для них показали б
 * за ким у людини є файл, чого вона не має права знати.
 */
export async function attachableMedia(
  env: Env,
  me: number,
  mediaId: number,
): Promise<MessageMedia | null> {
  const row = await env.DB.prepare(
    `SELECT ${JOINED_COLUMNS} FROM message_media md
      WHERE md.id = ? AND md.owner_id = ?
        AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.media_id = md.id)`,
  )
    .bind(mediaId, me)
    .first<MediaRow>();

  return row ? toMedia(row) : null;
}

/**
 * Байти за ключем — те, що віддають назовні.
 *
 * Ключ приходить із адреси, тож спершу перевіряється його форма
 * (`isMessageMediaKey`): без цього `GET /api/messages/media/../../…` питав би
 * бакет про чуже ім'я. Рядок обліку тут **не** читається: файл показують у
 * розмові **без** `initData`, а адреса невгадувана.
 */
export async function readMessageMedia(env: Env, key: string): Promise<R2ObjectBody | null> {
  const target = bucket(env);
  if (!target || !isMessageMediaKey(key)) return null;
  return await target.get(key);
}

/**
 * Прибрати фото розмови — **рядок спершу, байти потім**.
 *
 * Байти без рядка невидимі, а рядок без байтів — це бита картинка на екрані.
 * Викликається **перед** видаленням повідомлень: після нього ніхто не знає,
 * які файли були приєднані.
 */
export async function dropThreadMedia(env: Env, conversationId: number): Promise<void> {
  const attached = await env.DB.prepare(
    `SELECT md.id AS id, md.r2_key AS r2_key
       FROM messages m JOIN message_media md ON md.id = m.media_id
      WHERE m.conversation_id = ?`,
  )
    .bind(conversationId)
    .all<{ id: number; r2_key: string }>();

  const rows = attached.results ?? [];
  if (rows.length === 0) return;

  const placeholders = rows.map(() => "?").join(", ");
  await env.DB.prepare(`DELETE FROM message_media WHERE id IN (${placeholders})`)
    .bind(...rows.map((row) => row.id))
    .run();

  const target = bucket(env);
  if (!target) return;
  for (const row of rows) await target.delete(row.r2_key);
}
