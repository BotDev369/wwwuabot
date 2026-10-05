/**
 * Розмова зі співрозмовником: читати, писати, позначити прочитаним.
 *
 * **Порядок дій у кожному методі однаковий, і це не стиль:** спершу «чи
 * зв'язані» (`areLinked`), і лише потім будь-який пошук розмови. Перевірка
 * зв'язку **до** підказок про існування об'єкта — єдина причина, чому код
 * відповіді не витікає: чужий `peer` дістає ту саму 404, що й неіснуюча
 * розмова (AGENTS.md §7).
 *
 * **Відмова несе причину, а не лише статус.** «Зв'язку немає» і «тіло порожнє» —
 * різні речі для людини, тож обидві кажуть себе вголос; контролер лише
 * перекладає це в HTTP.
 *
 * @module api-dev/src/services/messages/thread
 */

import type { Message, MessageMedia, MessageThread } from "@wwwuabot/shared/messages";
import type { Env } from "../../shared/types";
import {
  MESSAGE_PHOTO_LABEL,
  isSendableMessage,
  messagePreview,
  sanitizeMessageBody,
} from "@wwwuabot/shared/messages";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { areLinked } from "./links";
import { ensureConversation, findConversationId } from "./conversations";
import { dropDraft } from "./drafts";
import { ensureGreeting } from "./greeting";
import { attachableMedia, dropThreadMedia } from "./media";
import { readPeer } from "./peers";

/** Скільки повідомлень показує одна сторінка розмови. */
const THREAD_LIMIT = 50;

/** Результат дії: або дані, або відмова зі статусом і **причиною**. */
export type ThreadResult =
  { ok: true; thread: MessageThread } | { ok: false; status: number; error: string };
export type SendResult =
  { ok: true; message: Message } | { ok: false; status: number; error: string };
export type ReadResult = { ok: true; read: number } | { ok: false; status: number; error: string };

export type ClearResult =
  { ok: true; removed: number } | { ok: false; status: number; error: string };

/**
 * Відмова для того, з ким зв'язку немає.
 *
 * Та сама відповідь і для неіснуючої людини, і для чужої: іншої відповіді тут
 * бути не може, бо інша відповідь **і є** підказкою про існування переписки.
 */
function noLink(status = 404): { ok: false; status: number; error: string } {
  return { ok: false, status, error: "Розмови з цією людиною немає" };
}

interface MessageRow {
  id: number;
  sender_id: number;
  body: string | null;
  created_at: string | null;
  read_at: string | null;
  is_system?: number | null;
  /** Ключ файлу з `message_media`; `null` — повідомлення без фото. */
  media_key?: string | null;
  media_mime?: string | null;
  media_bytes?: number | null;
}

/**
 * Фото повідомлення з приєднаного рядка обліку.
 *
 * Повідомлення без файлу не має ні ключа, ні розміру, тож це не «фото порожнє»,
 * а відсутність фото — саме тому `null`, а не об'єкт із порожніми полями.
 */
function toMedia(row: MessageRow): MessageMedia | null {
  if (!row.media_key) return null;

  return {
    key: row.media_key,
    mime: row.media_mime ?? "",
    bytes: Number(row.media_bytes ?? 0),
  };
}

function toMessage(row: MessageRow): Message {
  return {
    id: Number(row.id),
    senderId: Number(row.sender_id),
    body: row.body ?? "",
    media: toMedia(row),
    createdAt: row.created_at ?? "",
    readAt: row.read_at ?? null,
    system: Number(row.is_system ?? 0) === 1,
  };
}

/**
 * Повідомлення розмови разом із прикріпленими фото — **одним запитом**.
 *
 * `JOIN` тут навмисно другим: окремий запит по ключах був би другим правилом
 * «як дістати фото повідомлення», а стрічка мусить лишатися однією.
 */
const MESSAGE_SELECT = `SELECT m.id, m.sender_id, m.body, m.created_at, m.read_at, m.is_system,
              md.r2_key AS media_key, md.mime AS media_mime, md.bytes AS media_bytes
         FROM messages m
         LEFT JOIN message_media md ON md.id = m.media_id`;

/**
 * Повідомлення розмови — **від старіших до свіжіших**.
 *
 * Читаємо зворотним порядком (`id DESC`) і перевертаємо на місці: так беруться
 * останні `THREAD_LIMIT` повідомлень, а не перші, — а перші в переписці
 * потрібні найменше. `before` — межа для підвантаження старішого тим самим
 * шляхом.
 */
async function readMessages(
  db: D1Database,
  conversationId: number,
  before?: number,
): Promise<Message[]> {
  const result =
    before === undefined
      ? await db
          .prepare(`${MESSAGE_SELECT} WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT ?`)
          .bind(conversationId, THREAD_LIMIT)
          .all<MessageRow>()
      : await db
          .prepare(
            `${MESSAGE_SELECT} WHERE m.conversation_id = ? AND m.id < ? ORDER BY m.id DESC LIMIT ?`,
          )
          .bind(conversationId, before, THREAD_LIMIT)
          .all<MessageRow>();

  return (result.results ?? []).map(toMessage).reverse();
}

/** Розмова зі співрозмовником; порожня розмова — це не помилка. */
export async function readThread(
  env: Env,
  me: number,
  peerId: number,
  before?: number,
): Promise<ThreadResult> {
  if (!(await areLinked(env.DB, me, peerId))) return noLink();

  const conversationId = await findConversationId(env.DB, me, peerId);
  const [peer, messages] = await Promise.all([
    readPeer(env.DB, peerId, me),
    conversationId === null ? [] : readMessages(env.DB, conversationId, before),
  ]);

  return { ok: true, thread: { peer, messages } };
}

/**
 * Відкрити розмову — те саме, що прочитати її, плюс одноразове вітання.
 *
 * Саме тут, а не в контролері: «відкриття» — це дія переписки (вітання
 * ставиться саме при відкритті, один раз на пару), і контролер про неї знати
 * не мусить. Читання старіших повідомлень (`before`) вітання теж лаштує —
 * розмова вже відкрита, і другого вітання не буде: його стереже сам сервіс.
 *
 * **Порядок «спершу зв'язок» не порушено:** перший крок вітання — сама
 * перевірка зв'язку (`isInvitedBy` — той самий рядок `contacts`, лише в
 * напрямку запрошення). Для того, з ким зв'язку немає, не робиться ні запису,
 * ні пошуку розмови, а відповідь та сама 404 (§7).
 */
export async function openThread(
  env: Env,
  me: number,
  peerId: number,
  before?: number,
): Promise<ThreadResult> {
  await ensureGreeting(env, me, peerId);
  return readThread(env, me, peerId, before);
}

/**
 * Надіслати повідомлення.
 *
 * `last_message_*` у розмові оновлює **цей** виклик, а не тригер: список розмов
 * читає саме їх, і розійтися з щойно доданим рядком вони можуть лише тоді,
 * коли про них забули — тож про них не забуває одне місце.
 *
 * **Надіслане прибирає чернетку** — **ту саму**, з якої надіслали (`draftId`), і
 * саме тут, а не в клієнті: текст уже в переписці, і чернетка, що лишилась, у
 * списку виглядала б як не надіслане. За номером, а не за адресатом: чернеток
 * одній людині може бути кілька, і решта — це те, що людина ще пише.
 *
 * Надсилання з розмови (без `draftId`) не чіпає чернеток зовсім: вони не є тим
 * листом, який у цю розмову пішов.
 *
 * **Фото — окремим кроком і приєднується тут** (`mediaId`): скрин спершу
 * завантажують, а потім приєднують до повідомлення, тож порожній текст із
 * фото — законне повідомлення. Приєднати можна лише **свій** файл і лише
 * неприєднаний: чужі номери й повторне приєднання відпадають на одній
 * перевірці (`attachableMedia`), щоб не витікало, чи є в людини такий файл.
 */
export async function sendMessage(
  env: Env,
  me: number,
  peerId: number,
  rawBody: unknown,
  draftId: number | null = null,
  mediaId: number | null = null,
): Promise<SendResult> {
  if (!(await areLinked(env.DB, me, peerId))) return noLink();

  const body = sanitizeMessageBody(rawBody);
  const media = mediaId === null ? null : await attachableMedia(env, me, mediaId);
  if (mediaId !== null && !media) {
    return { ok: false, status: 400, error: "Фото не додано" };
  }
  if (!isSendableMessage(body, media !== null)) {
    return { ok: false, status: 400, error: "Порожнє повідомлення" };
  }

  const conversationId = await ensureConversation(env.DB, me, peerId);
  if (!conversationId) return { ok: false, status: 500, error: "Не вдалося відкрити розмову" };

  const now = formatSqliteDatetime();
  const inserted = await env.DB.prepare(
    `INSERT INTO messages (conversation_id, sender_id, body, media_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(conversationId, me, body, media?.id ?? null, now)
    .run();

  // `hidden_* = 0` — **повідомлення вертає розмову обом**, навіть якщо хтось її
  // прибрав: інакше прибрана розмова не мала б жодного шляху назад (у списку її
  // немає, отже й написати в неї нікому), і пара замовкла б назавжди.
  //
  // Останок у списку — саме те, що читає `ConversationList`: фото без тексту
  // підписується словом «Фото», бо порожній рядок у списку виглядав би як
  // порожня розмова, а вона не порожня.
  await env.DB.prepare(
    `UPDATE conversations SET last_message_at = ?, last_message_text = ?, last_sender_id = ?,
            hidden_a = 0, hidden_b = 0
       WHERE id = ?`,
  )
    .bind(now, body ? messagePreview(body) : MESSAGE_PHOTO_LABEL, me, conversationId)
    .run();

  if (draftId !== null) await dropDraft(env.DB, me, draftId);

  return {
    ok: true,
    message: {
      id: Number(inserted.meta?.last_row_id ?? 0),
      senderId: me,
      body,
      media,
      createdAt: now,
      readAt: null,
      system: false,
    },
  };
}

/**
 * Стерти переписку — **у обох**, бо рядок переписки один на пару.
 *
 * `whole` — прибрати розмову **зі списку в обох** (друга з двох дій на екрані).
 * Обидва прапореці ставляться разом навмисно: переписка спільна, і дія на
 * екрані одна — «прибрати розмову» — тож обидві сторони мають бачити те саме.
 * Сам рядок лишається (без нього в пари не було б жодного входу в розмову), а
 * прапорці знімає наступне повідомлення. Без `whole` лишається порожня розмова
 * на місці — її видно у списку, і в неї можна писати далі.
 *
 * **Порядок дій той самий, що в решті методів:** спершу «чи зв'язані», і лише
 * потім будь-який пошук і будь-який `DELETE` (§7). Тому для чужого `peer` не
 * зникає ніщо — ані свого, ані чужого, — а відповідь та сама 404, що й у
 * неіснуючої розмови (різні коди тут теж були б підказкою).
 */
export async function clearThread(
  env: Env,
  me: number,
  peerId: number,
  whole = false,
): Promise<ClearResult> {
  if (!(await areLinked(env.DB, me, peerId))) return noLink();

  const conversationId = await findConversationId(env.DB, me, peerId);
  // Розмови ще немає — стирати нічого, і це не помилка.
  if (conversationId === null) return { ok: true, removed: 0 };

  // Фото — **до** видалення повідомлень: після нього ніхто не знає, які файли
  // були приєднані, і вони лишилися б у сховищі без обліку.
  await dropThreadMedia(env, conversationId);

  const cleared = await env.DB.prepare("DELETE FROM messages WHERE conversation_id = ?")
    .bind(conversationId)
    .run();
  const removed = cleared.meta?.changes ?? 0;

  // Останок у списку — **копія** останнього повідомлення (його оновлює
  // `sendMessage`), тож чистка мусить зачепити й його: інакше список показував
  // би текст, якого в розмові вже немає. `greeted_at` лишається — вітання
  // одноразове, і повторювати його після чистки означало б писати в розмову те,
  // що людина щойно стерла.
  //
  // «Видалити» до цього додає **приховування зі списку в обох** (`hidden_a` /
  // `hidden_b` — див. реєстр таблиць). Обидва прапорці разом, бо розмова одна
  // на пару: прибрати її собі й лишити йому означало б, що та сама дія на
  // екрані дає різний результат двом людям. Рядок лишається, бо без нього в
  // пари не було б жодного входу в розмову — вона зникає зі списку, а інших
  // дверей немає. Прапорці знімає наступне повідомлення (`sendMessage`), і
  // розмова повертається обом.
  await env.DB.prepare(
    `UPDATE conversations SET last_message_at = NULL, last_message_text = NULL, last_sender_id = NULL${
      whole ? ", hidden_a = 1, hidden_b = 1" : ""
    }
       WHERE id = ?`,
  )
    .bind(conversationId)
    .run();

  return { ok: true, removed };
}

/**
 * Позначити прочитаним усе, що написав співрозмовник.
 *
 * Своє не чіпаємо (`sender_id <> ?`): бульбашки автора не мають ставати
 * «прочитаними» від того, що він сам відкрив розмову. Повертаємо **число** —
 * воно ж і знімає бейдж у футері.
 */
export async function markRead(env: Env, me: number, peerId: number): Promise<ReadResult> {
  if (!(await areLinked(env.DB, me, peerId))) return noLink();

  const conversationId = await findConversationId(env.DB, me, peerId);
  if (conversationId === null) return { ok: true, read: 0 };

  const result = await env.DB.prepare(
    `UPDATE messages SET read_at = ?
       WHERE conversation_id = ? AND sender_id <> ? AND read_at IS NULL`,
  )
    .bind(formatSqliteDatetime(), conversationId, me)
    .run();

  return { ok: true, read: result.meta?.changes ?? 0 };
}
