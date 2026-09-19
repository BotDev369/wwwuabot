/**
 * Співрозмовник так, як його бачить платформа — читання `users` **і свого
 * довідника**.
 *
 * Імені тут два, і вони з різних місць: `users.platform_username` — те, яке
 * людина обрала собі сама, а `contacts.name` — те, яким її назвав **той, хто
 * дивиться**. Друге не можна взяти з `users`: у двох людей те саме обличчя
 * підписане по-різному, тож ім'я читається з боку того, хто запитує
 * (`contacts.owner_id = я`).
 *
 * **`SELECT *` тут заборонений, і це не формальність.** У `users` лежить
 * `my_dates` і `telegram_json` — важкі колонки, а список розмов читає **усіх**
 * співрозмовників одним запитом (AGENTS.md §7). Тому колонки перелічені, і
 * серед них `telegram_json` **потрібен**: аватар приходить із Telegram, а не
 * зберігається окремо.
 *
 * `users` належить `bot-dev` — тут лише читання. Створює таблицю той, хто пише
 * першим (`ensureTables` у боті), тож цей сервіс не «заводить» її собі.
 *
 * @module api-dev/src/services/messages/peers
 */

import type { MessagePeer } from "@wwwuabot/shared/messages";
import { parseTelegramData } from "../user-profile.service";

/** Колонки співрозмовника — перелічені, а не `SELECT *`. */
const PEER_COLUMNS = `user_id, first_name, last_name, username, platform_username, telegram_json`;

interface PeerRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
  telegram_json: string | null;
}

/** Аватар із даних Telegram: `photo_url` приходить разом із `ctx.from`. */
function photoUrl(raw: string | null): string | null {
  const data = parseTelegramData(raw);
  const url = data?.photo_url;
  return typeof url === "string" && url ? url : null;
}

function toPeer(row: PeerRow, contactName: string | null): MessagePeer {
  return {
    id: Number(row.user_id),
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    username: row.username ?? null,
    platformUsername: row.platform_username ?? null,
    contactName,
    photoUrl: photoUrl(row.telegram_json),
  };
}

/**
 * Імена, якими **я** називаю цих людей, — зі свого ж довідника.
 *
 * Читаємо лише свій бік (`owner_id = me`) і лише за тим, хто справді прийшов
 * (`joined_user_id IS NOT NULL`): рядок контакту без входу ні з ким не
 * зв'язаний, тож і підпису для співрозмовника не дає. Ім'я, яким людину назвав
 * **вона сама**, у довіднику не лежить узагалі — це вже інший бік.
 *
 * Помилки тут не глушимо: без `contacts` правила зв'язку все одно не працюють,
 * а контролер створює цю таблицю до першого запиту (`ensureSchema`).
 */
async function readContactNames(
  db: D1Database,
  ids: readonly number[],
  me: number,
): Promise<Map<number, string>> {
  const names = new Map<number, string>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return names;

  const placeholders = unique.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT joined_user_id AS peer_id, name FROM contacts
         WHERE owner_id = ? AND joined_user_id IS NOT NULL
           AND joined_user_id IN (${placeholders})`,
    )
    .bind(me, ...unique)
    .all<{ peer_id: number; name: string | null }>();

  for (const row of result.results ?? []) {
    const name = row.name?.trim();
    if (name) names.set(Number(row.peer_id), name);
  }
  return names;
}

/**
 * Співрозмовники за їхніми id — **двома запитами на всіх**.
 *
 * По запиту на розмову тут була б видима пауза на кожному відкритті списку, а
 * список розмов — саме те місце, де людина чекає миттєвості.
 *
 * Людини, якої немає в `users`, у результаті не буде: рядок контакту міг
 * зникнути, а розмова лишилась. Це не помилка — список розмов малює таку
 * розмову без імені (див. `peerLabel`).
 */
export async function readPeers(
  db: D1Database,
  ids: readonly number[],
  me: number,
): Promise<Map<number, MessagePeer>> {
  const peers = new Map<number, MessagePeer>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return peers;

  const placeholders = unique.map(() => "?").join(", ");
  const [result, names] = await Promise.all([
    db
      .prepare(`SELECT ${PEER_COLUMNS} FROM users WHERE user_id IN (${placeholders})`)
      .bind(...unique)
      .all<PeerRow>(),
    readContactNames(db, unique, me),
  ]);

  for (const row of result.results ?? []) {
    const id = Number(row.user_id);
    peers.set(id, toPeer(row, names.get(id) ?? null));
  }
  return peers;
}

/**
 * Порожній співрозмовник за його id.
 *
 * Знадобився списку розмов: рядок контакту міг зникнути, а розмова лишилась, і
 * без цього розмова зникла б зі списку — тобто переписка, яку людина вела,
 * виглядала б як видалена. Імені немає, а id є: цього досить, щоб відкрити
 * розмову й побачити повідомлення.
 */
export function unknownPeer(id: number): MessagePeer {
  return {
    id,
    firstName: null,
    lastName: null,
    username: null,
    platformUsername: null,
    contactName: null,
    photoUrl: null,
  };
}

/** Один співрозмовник; `null` — людини немає серед тих, про кого бот знає. */
export async function readPeer(
  db: D1Database,
  id: number,
  me: number,
): Promise<MessagePeer | null> {
  return (await readPeers(db, [id], me)).get(id) ?? null;
}
