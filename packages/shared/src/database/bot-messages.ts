/**
 * Запис у переписку людини з ботом (`bot_messages`): один SQL на обидва
 * воркери — `bot-dev` пише розмову з чату, `api-dev` — лист адміна з панелі.
 *
 * @module @wwwuabot/shared/database/bot-messages
 */

import { ensureTables } from "./ensure-tables";

/** Хто сказав: `in` — людина, `out` — бот (зокрема адмін із панелі). */
export type BotMessageDirection = "in" | "out";

/**
 * Вид повідомлення. `rich` — екран бота (HTML), решта — те, що Telegram
 * поклав у повідомлення окремим ключем.
 */
export type BotMessageKind = "text" | "command" | "photo" | "rich" | "sticker" | "other";

export interface BotMessageInput {
  /** Telegram-id людини — власник переписки. */
  userId: number;
  /** Чат, у якому це сказано. */
  chatId: number;
  direction: BotMessageDirection;
  /** Номер у Telegram; `null`, якщо його немає. */
  messageId: number | null;
  kind: BotMessageKind;
  text: string;
  meta?: Record<string, unknown> | null;
}

/**
 * Межа тексту — та сама, що в повідомлення Telegram: більше в одне
 * повідомлення не влізе, тож решта — це вже не переказ розмови, а дамп.
 */
export const BOT_MESSAGE_TEXT_MAX = 4096;

/** Дописати рядок у переписку. `created_at` ставить сама база. */
export async function recordBotMessage(db: D1Database, input: BotMessageInput): Promise<void> {
  await ensureTables(db, ["bot_messages"]);
  await db
    .prepare(
      `INSERT INTO bot_messages (user_id, chat_id, direction, message_id, kind, text, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.userId,
      input.chatId,
      input.direction,
      input.messageId,
      input.kind,
      input.text.slice(0, BOT_MESSAGE_TEXT_MAX),
      input.meta ? JSON.stringify(input.meta) : null,
    )
    .run();
}
