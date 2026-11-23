/**
 * Тап по кількості в rich-екрані: зміна кошика й перемальовування того самого
 * повідомлення. Це не текстовий сценарій — діалогу в чаті немає.
 *
 * @module bot-dev/src/modules/search/cart.handler
 */

import { SEARCH_RESULT_LIMIT, matchSearch } from "@wwwuabot/shared/search";
import type { AppContext } from "../../shared/types/env";
import { editRichMessage } from "../../shared/telegram/widgets";
import { log } from "../../shared/utils/debug";
import {
  changeCart,
  loadCartQuantities,
  screenQuery,
  touchScreen,
  type CartAction,
} from "./cart.repository";
import { loadSearchIndex } from "./search.repository";
import { searchScreenHtml } from "./search-screen";

export interface CartTap {
  action: CartAction;
  productId: number;
}

/** `cart:add:12` — дія й номер товару; усе інше не наше. */
export function parseCartData(data: string): CartTap | null {
  const [prefix, action, id] = data.split(":");
  if (prefix !== "cart" || !["add", "inc", "dec"].includes(action)) return null;

  const productId = Number(id);
  return Number.isInteger(productId) && productId > 0
    ? { action: action as CartAction, productId }
    : null;
}

async function toast(ctx: AppContext, text: string): Promise<void> {
  try {
    await ctx.answerCallbackQuery({ text });
  } catch {
    // Тост — не обовʼязок: кошик уже змінено.
  }
}

export async function handleCartCallback(ctx: AppContext): Promise<boolean> {
  const data = ctx.callbackQuery?.data ?? "";
  const tap = parseCartData(data);
  if (!tap) return false;

  const userId = ctx.from?.id;
  const messageId = ctx.callbackQuery?.message?.message_id;
  const chatId = ctx.chat?.id;
  if (!userId || !messageId || !chatId || ctx.chat?.type !== "private") {
    await toast(ctx, "Кошик доступний лише в приватному чаті");
    return true;
  }

  const index = await loadSearchIndex(ctx.env);
  const entry = index?.entries.find((item) => item.kind === "product" && item.id === tap.productId);
  if (!index || !entry || !entry.shopSlug) {
    await toast(ctx, "Товар не знайдено");
    return true;
  }

  const outcome = await changeCart(
    ctx.env,
    userId,
    entry.shopSlug,
    tap.productId,
    tap.action,
  ).catch((error: unknown) => {
    log("CART", "change failed", { error: String(error) });
    return { kind: "shop_missing" as const };
  });
  if (outcome.kind !== "ok") {
    await toast(
      ctx,
      outcome.kind === "product_missing"
        ? "Товару більше немає в магазині"
        : "Не вдалося оновити кошик",
    );
    return true;
  }

  const query = (await screenQuery(ctx.env, userId, messageId).catch(() => "")) || entry.title;
  let matches = matchSearch(index, query);
  if (!matches.some((match) => match.entry.kind === "product" && match.entry.id === entry.id)) {
    matches = [{ entry, score: 100 }, ...matches].slice(0, SEARCH_RESULT_LIMIT);
  }

  const cart = await loadCartQuantities(
    ctx.env,
    userId,
    matches.flatMap((match) =>
      match.entry.kind === "product" && match.entry.shopSlug ? [match.entry.shopSlug] : [],
    ),
  ).catch(() => new Map<number, number>());

  const html = searchScreenHtml(query, matches, ctx.env.WEB_PLATFORM_URL, true, {
    cart,
    openProductId: entry.id,
  });

  try {
    await editRichMessage(ctx.env.BOT_TOKEN, chatId, messageId, html);
    await touchScreen(ctx.env, userId, messageId, html).catch(() => undefined);
  } catch (error: unknown) {
    log("CART", "edit failed", { error: String(error) });
    await toast(ctx, "Не вдалося оновити повідомлення");
    return true;
  }

  const qty = outcome.lines.find((line) => line.productId === tap.productId)?.qty ?? 0;
  await toast(
    ctx,
    tap.action !== "dec" ? `У кошику: ${qty}` : qty > 0 ? `У кошику: ${qty}` : "Прибрано з кошика",
  );
  return true;
}
