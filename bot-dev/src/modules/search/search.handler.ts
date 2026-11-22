/**
 * Пошук у приватній лістці: будь-який текст — запит, відповідь — одне rich.
 * `screenHandled` лишає вхідне повідомлення: пошук відповідає, а не замінює питання.
 *
 * @module bot-dev/src/modules/search/search.handler
 */

import { matchSearch } from "@wwwuabot/shared/search";
import type { AppContext } from "../../shared/types/env";
import { sendRichMessage } from "../../shared/telegram/widgets";
import { log } from "../../shared/utils/debug";
import { loadSearchIndex } from "./search.repository";
import { searchScreenHtml } from "./search-screen";

/**
 * Відповісти на текст пошуком; `false` — це не наш випадок (група, порожній
 * текст або індекс ще не зібраний), і роутер іде далі своїм шляхом.
 */
export async function handleSearch(ctx: AppContext, text: string): Promise<boolean> {
  if (ctx.chat?.type !== "private") return false;

  const query = text.trim();
  if (!query) return false;

  const index = await loadSearchIndex(ctx.env);
  if (!index) {
    log("SEARCH", "index missing", { query });
    return false;
  }

  const matches = matchSearch(index, query);
  const webApp = Boolean(ctx.env.WEB_PLATFORM_URL);
  const html = searchScreenHtml(query, matches, ctx.env.WEB_PLATFORM_URL, webApp);
  const chatId = ctx.chat.id;

  try {
    const sent = await sendRichMessage(ctx.env.BOT_TOKEN, chatId, html);
    ctx.screenHandled = true;
    log("SEARCH", "sent", {
      query,
      matches: matches.length,
      message_id: sent.message_id,
      results: matches.map((match) => match.entry.href),
    });
    return true;
  } catch (error: unknown) {
    log("SEARCH", "send failed", { query, error: String(error) });
    return false;
  }
}
