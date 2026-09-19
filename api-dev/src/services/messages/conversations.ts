/**
 * Список розмов людини — дані, а не HTTP.
 *
 * **Останнє повідомлення лежить у самій розмові** (`last_message_*`), а не
 * вибирається з `messages`: інакше список читав би **всі** повідомлення людини,
 * щоб показати по одному рядку на розмову. Ціна цього — оновлювати дві колонки
 * на кожному надсиланні, і це робить `sendMessage` (у тій самій транзакції
 * дій, де пише повідомлення).
 *
 * **Непрочитані рахуються запитом, а не колонкою.** `read_at IS NULL` працює по
 * індексу, а лічильник у розмові був би другим сховищем того самого факту — і
 * розійшовся б із ним на першій же помилці (AGENTS.md §7).
 *
 * **Прибрана розмова ховається на стороні.** `hidden_a` / `hidden_b` — те, чим
 * `clearThread` позначає «мені цієї розмови не показувати»; фільтр живе в
 * **обох** джерелах списку, інакше прибране поверталося б другим із них
 * (зв'язані контакти — це той самий список, а не окремий перелік). Прибирає
 * прапорець наступне повідомлення (`sendMessage`), і тоді розмова повертається
 * обом: іншого входу в неї немає.
 *
 * @module api-dev/src/services/messages/conversations
 */

import type { Conversation, MessagePeer } from "@wwwuabot/shared/messages";
import type { Env } from "../../shared/types";
import { conversationPair, peerLabel, peerOf } from "@wwwuabot/shared/messages";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { readPeers, unknownPeer } from "./peers";

/** Стеля списку: розмови — це те, що людина справді веде, а не стрічка. */
const CONVERSATION_LIMIT = 100;

interface ConversationRow {
  id: number;
  peer_a: number;
  peer_b: number;
  last_message_at: string | null;
  last_message_text: string | null;
  last_sender_id: number | null;
}

/**
 * Номер розмови цих двох — або `null`, якщо її ще немає.
 *
 * Пара береться **впорядкованою** (`conversationPair`): те саме правило, за
 * яким розмова створюється. Порівняння «peer_a = я» на місці дало б другу
 * розмову в того, хто написав першим.
 */
export async function findConversationId(
  db: D1Database,
  me: number,
  peer: number,
): Promise<number | null> {
  const [a, b] = conversationPair(me, peer);
  const row = await db
    .prepare("SELECT id FROM conversations WHERE peer_a = ? AND peer_b = ?")
    .bind(a, b)
    .first<{ id: number }>();

  return row ? Number(row.id) : null;
}

/**
 * Номер розмови цих двох — створює її, якщо її ще немає.
 *
 * `ON CONFLICT … DO UPDATE` тут навмисно **замість** «спитати, а тоді вставити»:
 * двоє можуть написати одночасно, і два `INSERT` без `UNIQUE` дали б дві
 * розмови на ту саму пару (саме від цього стоїть `UNIQUE (peer_a, peer_b)`).
 * Оновлення — порожнє (`id = id`): цей запит лише тримає номер.
 */
export async function ensureConversation(
  db: D1Database,
  me: number,
  peer: number,
): Promise<number> {
  const [a, b] = conversationPair(me, peer);
  const row = await db
    .prepare(
      `INSERT INTO conversations (peer_a, peer_b, created_at) VALUES (?, ?, ?)
         ON CONFLICT(peer_a, peer_b) DO UPDATE SET id = id
         RETURNING id`,
    )
    .bind(a, b, formatSqliteDatetime())
    .first<{ id: number }>();

  return Number(row?.id ?? 0);
}

/**
 * З ким людина зв'язана через контакти — те саме правило, що в `areLinked`.
 *
 * **Навіщо в списку розмов.** Розмова народжується першим повідомленням, але
 * перше повідомлення нема звідки надіслати, якщо в списку видно лише вже
 * початі розмови — виходив глухий кут: написати першим не міг **ніхто**.
 * Тому список — це «кому я можу писати», а не «що вже почалось».
 *
 * Читаємо лише ті рядки, де хтось справді прийшов (`joined_user_id IS NOT
 * NULL`): контакт без входу — це ще не зв'язок, і пропонувати йому написати
 * означало б показати людину, якої в продукті немає.
 */
async function linkedPeerIds(env: Env, me: number): Promise<number[]> {
  const result = await env.DB.prepare(
    `SELECT DISTINCT CASE WHEN owner_id = ? THEN joined_user_id ELSE owner_id END AS peer_id
       FROM contacts
      WHERE joined_user_id IS NOT NULL AND (owner_id = ? OR joined_user_id = ?)`,
  )
    .bind(me, me, me)
    .all<{ peer_id: number }>();

  // Прибрані розмови не вертаємо **саме тут**: список — це «кому я можу
  // писати», і без цього фільтра прибране з'являлося б назад як «Почніть
  // розмову» (зв'язок через контакти ж нікуди не подівся).
  const hidden = await hiddenPeerIds(env, me);

  return (result.results ?? [])
    .map((row) => Number(row.peer_id))
    .filter((id) => Number.isInteger(id) && id > 0 && id !== me && !hidden.has(id));
}

/**
 * Ті, чию розмову я прибрав собі — з їхнім боком у парі.
 *
 * Прапорців два, бо пара впорядкована (`peer_a` < `peer_b`): «прибрано в мене»
 * — це не ознака розмови, а ознака **сторони**, тож одна колонка зі списком
 * значень була б третім поданням того самого (`hidden_sides = "a,b"` — це вже
 * схема в рядку, яку читав би власний парсер).
 */
async function hiddenPeerIds(env: Env, me: number): Promise<Set<number>> {
  // `COALESCE` не для краси: колонка, додана наявній таблиці, приходить від
  // `ensureTables` як `DEFAULT NULL` (ні `NOT NULL`, ні `DEFAULT` з реєстру вона
  // не отримує), тож у старому рядку тут `NULL`, а не `0`. Без цього кожна жива
  // розмова зникла б зі списку як «прибрана».
  const result = await env.DB.prepare(
    `SELECT peer_a, peer_b FROM conversations
      WHERE (peer_a = ? AND COALESCE(hidden_a, 0) = 1) OR (peer_b = ? AND COALESCE(hidden_b, 0) = 1)`,
  )
    .bind(me, me)
    .all<{ peer_a: number; peer_b: number }>();

  return new Set(
    (result.results ?? []).map((row) => peerOf(Number(row.peer_a), Number(row.peer_b), me)),
  );
}

/** Скільки повідомлень співрозмовника не прочитано — по кожній розмові. */
async function unreadByConversation(
  db: D1Database,
  ids: readonly number[],
  me: number,
): Promise<Map<number, number>> {
  const unread = new Map<number, number>();
  if (ids.length === 0) return unread;

  const placeholders = ids.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT conversation_id, COUNT(*) AS total FROM messages
         WHERE conversation_id IN (${placeholders}) AND sender_id <> ? AND read_at IS NULL
         GROUP BY conversation_id`,
    )
    .bind(...ids, me)
    .all<{ conversation_id: number; total: number }>();

  for (const row of result.results ?? [])
    unread.set(Number(row.conversation_id), Number(row.total));
  return unread;
}

/**
 * Розмови людини — ті, що ведуться (найсвіжіші згори), плюс ті, з ким можна
 * **почати** (зв'язані через контакти, але без жодного повідомлення).
 *
 * Два джерела в одному списку навмисно: екран відповідає на питання «з ким я
 * можу поговорити», а не «що вже лежить у базі». Початі розмови стоять згори й
 * у порядку останнього повідомлення; ті, де ще нічого не сказано — нижче, за
 * абеткою підписа (щоб список не переставлявся сам собою від кожного відкриття).
 *
 * Прибрані розмови не потрапляють ні з першого джерела, ні з другого: фільтр
 * стоїть на обох (див. `hiddenPeerIds`), бо друге джерело — той самий список, а
 * не окремий перелік, і без фільтра прибране верталось би ним же.
 */
export async function listConversations(env: Env, me: number): Promise<Conversation[]> {
  const result = await env.DB.prepare(
    `SELECT id, peer_a, peer_b, last_message_at, last_message_text, last_sender_id
       FROM conversations
      WHERE (peer_a = ? AND COALESCE(hidden_a, 0) = 0)
         OR (peer_b = ? AND COALESCE(hidden_b, 0) = 0)
      ORDER BY COALESCE(last_message_at, created_at) DESC, id DESC
      LIMIT ?`,
  )
    .bind(me, me, CONVERSATION_LIMIT)
    .all<ConversationRow>();

  const rows = result.results ?? [];
  const threadPeers = rows.map((row) => peerOf(Number(row.peer_a), Number(row.peer_b), me));
  const started = new Set(threadPeers);
  const linked = (await linkedPeerIds(env, me)).filter((id) => !started.has(id));

  const peers = await readPeers(env.DB, [...threadPeers, ...linked], me);
  const unread = await unreadByConversation(
    env.DB,
    rows.map((row) => Number(row.id)),
    me,
  );

  const threads: Conversation[] = rows.map((row) => {
    const peerId = peerOf(Number(row.peer_a), Number(row.peer_b), me);
    return {
      peer: peers.get(peerId) ?? unknownPeer(peerId),
      lastMessageAt: row.last_message_at ?? null,
      lastMessageText: row.last_message_text ?? null,
      lastSenderId: row.last_sender_id === null ? null : Number(row.last_sender_id),
      unread: unread.get(Number(row.id)) ?? 0,
    };
  });

  return [...threads, ...newThreads(linked, peers)];
}

/** Розмови, яких ще немає: рядки-запрошення до першого повідомлення. */
function newThreads(peerIds: readonly number[], peers: Map<number, MessagePeer>): Conversation[] {
  return peerIds
    .map((peerId) => ({
      peer: peers.get(peerId) ?? unknownPeer(peerId),
      lastMessageAt: null,
      lastMessageText: null,
      lastSenderId: null,
      unread: 0,
    }))
    .sort((a, b) => peerLabel(a.peer).localeCompare(peerLabel(b.peer), "uk"));
}

/**
 * Скільки всього чекає на прочитання — для бейджа у футері.
 *
 * Один `COUNT` замість списку розмов: бейдж опитується часто, і тягнути заради
 * числа весь список із іменами й аватарами було б витратою на порожньому місці.
 */
export async function unreadTotal(env: Env, me: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total FROM messages
       WHERE sender_id <> ? AND read_at IS NULL
         AND conversation_id IN (SELECT id FROM conversations WHERE peer_a = ? OR peer_b = ?)`,
  )
    .bind(me, me, me)
    .first<{ total: number }>();

  return Number(row?.total ?? 0);
}
