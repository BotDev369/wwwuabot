/**
 * Видалення повідомлення людини з чату.
 *
 * **Правило одне: у чаті лишається тільки те, що сказав бот.** Нерозібраний
 * текст, фото чи натиснута кнопка реплай-клавіатури — усе це шум, який
 * накопичується при кожному кроці. Тому видаленням займається один хелпер, а
 * не кожен модуль власним: два виклики `deleteMessage` у роутері та діалозі —
 * це один і той самий код, а не два різні рішення.
 *
 * **Коли саме.** Вхідне зникає тільки після успішної відповіді: спершу
 * `renderScenario`, потім видалення. Не зрозуміли вхідне — прибираємо його
 * одразу, але подія вже записана в журнал (`buildUserEvent`). Збій відправки
 * лишає повідомлення людини на місці: краще два екрани, ніж жодного.
 *
 * Помилка не критична: Telegram не дозволяє видаляти повідомлення старші за 48
 * годин, тож гірше за відсутність видалення нічого немає.
 *
 * @module bot-dev/src/shared/utils/message
 */

import type { AppContext } from "../types/env";
import { log } from "./debug";

/** Знести повідомлення, яким людина відкрила цей крок. */
export async function deleteIncomingMessage(ctx: AppContext): Promise<void> {
  if (!ctx.message?.message_id || !ctx.chat?.id) return;

  try {
    await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);
    log("UTIL", "deleted incoming message", { message_id: ctx.message.message_id });
  } catch {
    log("UTIL", "failed to delete incoming message (non-critical)");
  }
}
