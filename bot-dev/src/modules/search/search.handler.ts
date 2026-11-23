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
import { loadCartQuantities } from "./cart.repository";
import { loadSearchIndex } from "./search.repository";
import { searchScreenHtml } from "./search-screen";
import { recordOutgoingMessage } from "../history/record";

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

  // Кількість у картці — зі спільного кошика; збій D1 не робить пошук помилкою.
  const userId = ctx.from?.id;
  const cart = userId
    ? await loadCartQuantities(
        ctx.env,
        userId,
        matches.flatMap((match) =>
          match.entry.kind === "product" && match.entry.shopSlug ? [match.entry.shopSlug] : [],
        ),
      ).catch(() => new Map<number, number>())
    : new Map<number, number>();

  const html = searchScreenHtml(query, matches, ctx.env.WEB_PLATFORM_URL, webApp, { cart });
  const chatId = ctx.chat.id;

  try {
    const sent = await sendRichMessage(ctx.env.BOT_TOKEN, chatId, html);
    ctx.screenHandled = true;
    await recordOutgoingMessage(ctx, sent.message_id, "rich", html, {
      query,
      matches: matches.length,
    });
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
