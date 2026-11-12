/**
 * Службовий екран: фото, підпис і кнопки під повідомленням.
 *
 * Це не сценарій бота (той живе у `bot_scenarios` і показується віджетом або
 * rich-повідомленням). Тут — відповіді на події: запрошення, відмова, діалог з
 * адміном. Вони будуються в коді, бо містять імена й стани з бази.
 *
 * @module bot-dev/src/shared/utils/service-screen
 */

import type { InlineKeyboardButton } from "grammy/types";
import type { AppContext } from "../types/env";
import { log } from "./debug";

export interface ServiceButton {
  text: string;
  callback_data?: string;
  url?: string;
  web_app?: { url: string };
}

/** Абсолютна адреса Mini App для маршруту платформи. */
export function buildWebAppUrl(
  baseUrl: string | undefined,
  webPath: string | undefined,
): string | null {
  if (!baseUrl || !webPath) return null;
  try {
    return new URL(webPath, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
  } catch {
    return null;
  }
}

export async function sendServiceScreen(
  ctx: AppContext,
  screen: {
    photoUrl: string;
    caption: string;
    buttons: readonly (readonly ServiceButton[])[];
  },
): Promise<boolean> {
  if (!ctx.chat?.id) return false;

  try {
    const sent = await ctx.api.sendPhoto(ctx.chat.id, screen.photoUrl, {
      caption: screen.caption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: screen.buttons as unknown as InlineKeyboardButton[][],
      },
    });

    const old = ctx.user?.message_id;
    if (typeof old === "number" && old !== sent.message_id) {
      await ctx.api.deleteMessages(ctx.chat.id, [old]).catch(() => undefined);
    }
    if (ctx.user) {
      ctx.user.message_id = sent.message_id;
      ctx.userDirty = true;
    }
    return true;
  } catch (error: unknown) {
    log("SERVICE", "screen send failed", { error: String(error) });
    return false;
  }
}
