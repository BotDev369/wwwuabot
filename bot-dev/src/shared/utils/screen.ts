import type { AppContext } from "../types/env";
import { getPhoto } from "./photo";
import { log } from "./debug";
import type { InputRichMessage } from "grammy/types";

export interface CaptionBlocks {
  top?: string;
  mid?: string;
  bot?: string;
}

export function buildCaption(blocks: CaptionBlocks): string {
  const parts = [blocks.top, blocks.mid, blocks.bot].filter((b) => b && b.trim() !== "");
  return parts.join("\n───────\n");
}

/**
 * Відправляє нове повідомлення та видаляє старі (вхідне + попереднє від бота).
 * НІКОЛИ не редагує — тільки send + delete.
 */
export async function sendOrEditLiveMessage(ctx: AppContext): Promise<boolean> {
  if (!ctx.screen) return false;
  const { codeword, photo_url, caption, buttons } = ctx.screen;
  const chatId = ctx.chat!.id;

  log("SCREEN", "rendering", { codeword, chat_id: chatId });

  const photoUrl = await getPhoto(codeword, photo_url, ctx.env);
  const captionText = buildCaption(caption);

  // ── RICH MESSAGE ──────────────────────────────────────────────
  if (
    ctx.screen.rich_message === true &&
    ctx.screen.rich_data &&
    Array.isArray(ctx.screen.rich_data)
  ) {
    log("SCREEN:rich", "rendering rich message", { codeword, chat_id: chatId });
    const richMessage: InputRichMessage = {
      blocks: ctx.screen.rich_data as InputRichMessage['blocks'],
    };

    try {
      const sent = await ctx.api.sendRichMessage(chatId, richMessage, {
        reply_markup: { inline_keyboard: buttons },
      });
      log("SCREEN:rich", "send success", { new_message_id: sent.message_id });

      // Видаляємо старі повідомлення
      await deleteOldMessages(ctx, chatId, sent.message_id);

      ctx.user!.message_id = sent.message_id;
      ctx.userDirty = true;
      ctx.liveMessageSent = true;
      return true;
    } catch (err) {
      log("SCREEN:rich", "send failed", { error: String(err) });
      return false;
    }
  }

  // Якщо rich_message === true, але rich_data невалідний
  if (ctx.screen.rich_message === true) {
    log("SCREEN:rich", "rich_message is true but rich_data is invalid or empty, skipping");
    return false;
  }

  // ── ЗВИЧАЙНЕ ПОВІДОМЛЕННЯ (photo) ──────────────────────────────
  try {
    const sent = await ctx.api.sendPhoto(chatId, photoUrl, {
      caption: captionText,
      reply_markup: { inline_keyboard: buttons },
      parse_mode: "HTML",
    });
    log("SCREEN", "send success", { new_message_id: sent.message_id });

    // Видаляємо старі повідомлення
    await deleteOldMessages(ctx, chatId, sent.message_id);

    ctx.user!.message_id = sent.message_id;
    ctx.userDirty = true;
    ctx.liveMessageSent = true;
    return true;
  } catch (err) {
    log("SCREEN", "send failed", { error: String(err) });
    return false;
  }
}

/**
 * Видаляє старі повідомлення: вхідне від юзера + попереднє від бота.
 */
async function deleteOldMessages(
  ctx: AppContext,
  chatId: number,
  newMessageId: number,
): Promise<void> {
  const idsToDelete: number[] = [];

  // Попереднє повідомлення бота
  const oldBotMessageId = ctx.user?.message_id;
  if (typeof oldBotMessageId === "number" && oldBotMessageId !== newMessageId) {
    idsToDelete.push(oldBotMessageId);
  }

  // Вхідне повідомлення юзера
  if (ctx.message?.message_id) {
    idsToDelete.push(ctx.message.message_id);
  }

  if (idsToDelete.length === 0) return;

  try {
    await (ctx.api as unknown as { raw: { deleteMessages: (params: { chat_id: number; message_ids: number[] }) => Promise<unknown> } }).raw.deleteMessages({
      chat_id: chatId,
      message_ids: idsToDelete,
    });
    log("SCREEN", "deleted old messages", { ids: idsToDelete });
  } catch (err) {
    log("SCREEN", "failed to delete old messages (non-critical)", {
      error: String(err),
      ids: idsToDelete,
    });
  }
}
