/**
 * Таблиці переписки — **один перелік на весь домен**.
 * Схема створюється не міграцією, а `ensureTables`: він ідемпотентний, а таблиці
 * мусять існувати **до** першого запиту. Перелік один, бо файлів у домені два
 * (переписка й фото в ній) — і два списки розійшлися б на першій же правці.
 *
 * @module api-dev/src/services/messages/schema
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { TableName } from "@wwwuabot/shared/database/tables";

/** Розмова, листи, чернетки, фото й контакти: правило зв'язку читається з останніх. */
const MESSAGES_TABLES: readonly TableName[] = [
  "conversations",
  "messages",
  "message_drafts",
  "message_media",
  "contacts",
];

/** Створити (або доповнити) схему переписки. */
export function ensureMessagesSchema(db: D1Database): Promise<void> {
  return ensureTables(db, MESSAGES_TABLES);
}
