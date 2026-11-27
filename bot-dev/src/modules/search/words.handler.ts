/**
 * `/words` — довідник усіх пошукових слів одним rich-повідомленням.
 *
 * Це не пошук і не сценарій: команда показує індекс, за яким працює пошук.
 *
 * @module bot-dev/src/modules/search/words.handler
 */

import type { AppContext } from "../../shared/types/env";
import { sendRichMessage } from "../../shared/telegram/widgets";
import { log } from "../../shared/utils/debug";
import { recordOutgoingMessage } from "../history/record";
import { loadSearchIndex } from "./search.repository";
import { tenantForUser } from "../../shared/tenant-context";
import { wordsScreenHtml } from "./words-screen";

/** `false` — це не наш випадок (група, немає індексу або відмова Telegram). */
export async function handleWords(ctx: AppContext): Promise<boolean> {
  if (ctx.chat?.type !== "private" || !ctx.chat.id) return false;

  const userId = ctx.user?.user_id ?? ctx.from?.id;
  if (typeof userId !== "number") return false;
  const tenant = await tenantForUser(ctx.env, userId);
  const index = await loadSearchIndex(ctx.env, tenant.id);
  if (!index) {
    log("WORDS", "index missing");
    return false;
  }

  const html = wordsScreenHtml(index);
  try {
    const sent = await sendRichMessage(ctx.env.BOT_TOKEN, ctx.chat.id, html);
    ctx.screenHandled = true;
    await recordOutgoingMessage(ctx, sent.message_id, "rich", html, { screen: "words" });
    log("WORDS", "sent", { entries: index.entries.length, message_id: sent.message_id });
    return true;
  } catch (error: unknown) {
    log("WORDS", "send failed", { error: String(error) });
    return false;
  }
}
