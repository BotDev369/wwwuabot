/**
 * `/start` — rich-екран у приватному чаті, новим повідомленням.
 *
 * Старий екран лишається: історію прибирає людина або адмін. Діплінк
 * (`/start <payload>`) іде старим шляхом — там конкретна сторінка чи контакт.
 *
 * @module bot-dev/src/modules/start
 */

import type { AppContext } from "../../shared/types/env";
import { sendRichMessage } from "../../shared/telegram/widgets";
import { log } from "../../shared/utils/debug";
import { recordOutgoingMessage } from "../history/record";
import { startScreenHtml } from "./screen";

/** `false` — це не наш випадок (група або відмова Telegram). */
export async function handleStart(ctx: AppContext): Promise<boolean> {
  if (ctx.chat?.type !== "private" || !ctx.chat.id) return false;

  const html = startScreenHtml(ctx.user?.first_name ?? "");
  try {
    const sent = await sendRichMessage(ctx.env.BOT_TOKEN, ctx.chat.id, html);
    ctx.screenHandled = true;
    await recordOutgoingMessage(ctx, sent.message_id, "rich", html, { screen: "start" });
    return true;
  } catch (error: unknown) {
    log("START", "send failed", { error: String(error) });
    return false;
  }
}
