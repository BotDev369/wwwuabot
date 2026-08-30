import { MiddlewareFn } from "grammy";
import { log } from "../../../shared/utils/debug";

/**
 * Фільтрує апдейти:
 * - Тільки приватні чати (private)
 * - Ігнорує edited_message, channel_post, group/supergroup
 */
export const filterUpdates: MiddlewareFn = async (ctx, next) => {
  // 1. Ігноруємо відредаговані повідомлення
  if ("edited_message" in ctx.update || "edited_channel_post" in ctx.update) {
    log("PRE:filter", "skipped | reason: edited_message");
    return;
  }

  // 2. Ігноруємо channel_post
  if ("channel_post" in ctx.update) {
    log("PRE:filter", "skipped | reason: channel_post");
    return;
  }

  // 3. Тільки приватні чати (немає chat → пропускаємо)
  const chat = ctx.chat;
  if (!chat) {
    log("PRE:filter", "skipped | reason: no chat");
    return;
  }

  if (chat.type !== "private") {
    log("PRE:filter", "skipped | reason: not private chat", {
      chat_type: chat.type,
      chat_id: chat.id,
    });
    return;
  }

  log("PRE:filter", "passed");
  await next();
};
