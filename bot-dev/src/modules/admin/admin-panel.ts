/**
 * Вхід в адмінку — лише власнику й лише кнопкою Mini App: панель
 * відкривається тільки всередині Telegram, тож без кнопки в боті до неї
 * не дістатися. Не власнику команда не відповідає нічим.
 *
 * @module bot-dev/src/modules/admin/admin-panel
 */

import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import labels from "./labels.json";

/** Чи це власник: панель не показуємо нікому іншому, навіть із допуском. */
export function isPanelOwner(ctx: AppContext): boolean {
  const owner = (ctx.env.ADMIN_TELEGRAM_ID ?? "").trim();
  return owner.length > 0 && String(ctx.from?.id ?? "") === owner;
}

/**
 * Панель — лише приватна лістка: у групі кнопка Mini App не працює, тож
 * команда там мовчить, як і для не власника.
 */
export async function handleAdminPanel(ctx: AppContext): Promise<boolean> {
  const url = ctx.env.WEB_ADMIN_URL?.trim();
  if (!url || !ctx.chat?.id || ctx.chat.type !== "private" || !isPanelOwner(ctx)) return false;

  try {
    await ctx.api.sendMessage(ctx.chat.id, labels.message, {
      reply_markup: {
        inline_keyboard: [[{ text: labels.button, web_app: { url } }]],
      },
    });
    return true;
  } catch (error: unknown) {
    log("ADMIN", "panel button failed", { error: String(error) });
    return false;
  }
}
