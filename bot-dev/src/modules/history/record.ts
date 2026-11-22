/**
 * Переписка з ботом: обидва боки в `bot_messages`. Це не `user_events` — там
 * «що людина зробила», тут «що саме сказано». Помилка запису не ламає
 * відповідь: людина все одно мусить отримати екран.
 *
 * @module bot-dev/src/modules/history/record
 */

import { recordBotMessage, type BotMessageKind } from "@wwwuabot/shared/database/bot-messages";
import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/** Вхідне повідомлення людини — лише приватна лістка: там і живе переписка. */
export async function recordIncomingMessage(ctx: AppContext): Promise<void> {
  const message = ctx.message;
  if (!message || !ctx.from || ctx.chat?.type !== "private") return;

  try {
    await recordBotMessage(ctx.env.DB, {
      userId: ctx.from.id,
      chatId: ctx.chat.id,
      direction: "in",
      messageId: message.message_id,
      kind: incomingKind(message),
      text: incomingText(message),
    });
  } catch (error: unknown) {
    log("HISTORY", "incoming not recorded", { error: String(error) });
  }
}

/** Відповідь бота — те, що вже пішло в чат і має номер повідомлення. */
export async function recordOutgoingMessage(
  ctx: AppContext,
  messageId: number,
  kind: BotMessageKind,
  text: string,
  meta?: Record<string, unknown>,
): Promise<void> {
  if (!ctx.from || ctx.chat?.type !== "private") return;

  try {
    await recordBotMessage(ctx.env.DB, {
      userId: ctx.from.id,
      chatId: ctx.chat.id,
      direction: "out",
      messageId,
      kind,
      text,
      meta: meta ?? null,
    });
  } catch (error: unknown) {
    log("HISTORY", "outgoing not recorded", { error: String(error) });
  }
}

function incomingKind(message: {
  text?: string;
  caption?: string;
  photo?: unknown;
  sticker?: unknown;
}): BotMessageKind {
  if (message.text?.startsWith("/")) return "command";
  if (message.photo) return "photo";
  if (message.sticker) return "sticker";
  if (message.text || message.caption) return "text";
  return "other";
}

function incomingText(message: { text?: string; caption?: string }): string {
  return message.text ?? message.caption ?? "";
}
