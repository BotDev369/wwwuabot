import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/**
 * Безпечна відправка повідомлення в Telegram.
 * Повертає true якщо успішно, false якщо помилка.
 */
export async function sendNotification(
  ctx: AppContext,
  chatId: string,
  text: string,
  topicId?: number
): Promise<boolean> {
  try {
    const options: any = { parse_mode: "HTML" };
    if (topicId) {
      options.message_thread_id = topicId;
    }
    
    await ctx.api.sendMessage(chatId, text, options);
    log("SENDER", "notification sent", { chatId, topicId });
    return true;
  } catch (err) {
    log("SENDER", "failed to send notification", { 
      chatId, 
      topicId, 
      error: String(err) 
    });
    return false;
  }
}