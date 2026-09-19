/**
 * Співрозмовник так, як його бачить платформа — читання рядка `users`.
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

function toPeer(row: PeerRow): MessagePeer {
  return {
    id: Number(row.user_id),
    firstName: row.first_name ?? null,
    lastName: row.last_name ?? null,
    username: row.username ?? null,
    platformUsername: row.platform_username ?? null,
    photoUrl: photoUrl(row.telegram_json),
  };
}

/**
 * Співрозмовники за їхніми id — **одним запитом**.
 *
 * По одному запиту на розмову тут була б видима пауза на кожному відкритті
 * списку, а список розмов — саме те місце, де людина чекає миттєвості.
 *
 * Людини, якої немає в `users`, у результаті не буде: рядок контакту міг
 * зникнути, а розмова лишилась. Це не помилка — список розмов малює таку
 * розмову без імені (див. `peerLabel`).
 */
export async function readPeers(
  db: D1Database,
  ids: readonly number[],
): Promise<Map<number, MessagePeer>> {
  const peers = new Map<number, MessagePeer>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return peers;

  const placeholders = unique.map(() => "?").join(", ");
  const result = await db
    .prepare(`SELECT ${PEER_COLUMNS} FROM users WHERE user_id IN (${placeholders})`)
    .bind(...unique)
    .all<PeerRow>();

  for (const row of result.results ?? []) peers.set(Number(row.user_id), toPeer(row));
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
    photoUrl: null,
  };
}

/** Один співрозмовник; `null` — людини немає серед тих, про кого бот знає. */
export async function readPeer(db: D1Database, id: number): Promise<MessagePeer | null> {
  return (await readPeers(db, [id])).get(id) ?? null;
}
