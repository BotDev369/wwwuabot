/**
 * Кошик бота — прямо в D1: бот не має `initData`, але має `ctx.from.id`, тож
 * пише тими самими запитами, що й веб. Один кошик на двох — тому таблиця спільна.
 *
 * @module bot-dev/src/modules/search/cart.repository
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { BOT_MESSAGE_TEXT_MAX } from "@wwwuabot/shared/database/bot-messages";
import { addCartLine, readCartQuantities, type CartLine } from "@wwwuabot/shared/shop";
import type { Env } from "../../shared/types/env";

export type CartAction = "add" | "inc" | "dec";

export type CartChange =
  { kind: "ok"; lines: CartLine[] } | { kind: "shop_missing" } | { kind: "product_missing" };

async function ensureCartSchema(env: Env): Promise<void> {
  await ensureTables(env.DB, ["platform_pages", "shop_products", "shop_carts", "bot_messages"]);
}

/** Відкритий магазин за адресою — та сама межа, що у вітрини. */
async function shopIdBySlug(env: Env, slug: string): Promise<number | null> {
  const row = await env.DB.prepare(
    `SELECT s.id
       FROM platform_pages s
       JOIN users u ON u.user_id = s.owner_id
      WHERE s.slug = ?
        AND s.owner_id IS NOT NULL
        AND COALESCE(s.is_public, 0) = 1
        AND s.is_active = 1
        AND COALESCE(u.is_blocked, 0) = 0`,
  )
    .bind(slug)
    .first<{ id: number }>();

  return row ? Number(row.id) : null;
}

async function shownInShop(env: Env, shopId: number, productId: number): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM shop_products WHERE id = ? AND shop_id = ? AND is_active = 1",
  )
    .bind(productId, shopId)
    .first<{ id: number }>();
  return Boolean(row);
}

/** Змінити позицію на одиницю; «мінус» на одиниці прибирає її. */
export async function changeCart(
  env: Env,
  userId: number,
  shopSlug: string,
  productId: number,
  action: CartAction,
): Promise<CartChange> {
  await ensureCartSchema(env);

  const shopId = await shopIdBySlug(env, shopSlug);
  if (shopId === null) return { kind: "shop_missing" };
  if (action !== "dec" && !(await shownInShop(env, shopId, productId))) {
    return { kind: "product_missing" };
  }

  const lines = await addCartLine(env.DB, userId, shopId, productId, action === "dec" ? -1 : 1);

  return { kind: "ok", lines };
}

/** Кількості для всіх товарів на екрані — одним запитом. */
export async function loadCartQuantities(
  env: Env,
  userId: number,
  shopSlugs: readonly string[],
): Promise<Map<number, number>> {
  if (shopSlugs.length === 0) return new Map();
  await ensureCartSchema(env);
  return readCartQuantities(env.DB, userId, shopSlugs);
}

/** Запит, за яким зібрано rich-екран: ним же перемальовуємо його після тапу. */
export async function screenQuery(env: Env, userId: number, messageId: number): Promise<string> {
  await ensureTables(env.DB, ["bot_messages"]);
  const row = await env.DB.prepare(
    `SELECT meta FROM bot_messages
      WHERE user_id = ? AND message_id = ? AND direction = 'out'
      ORDER BY id DESC LIMIT 1`,
  )
    .bind(userId, messageId)
    .first<{ meta: string | null }>();

  try {
    const parsed = JSON.parse(row?.meta ?? "{}") as { query?: unknown };
    return typeof parsed.query === "string" ? parsed.query : "";
  } catch {
    return "";
  }
}

/** Оновлене rich-повідомлення — і в історії теж, інакше адмін бачив би стару кількість. */
export async function touchScreen(
  env: Env,
  userId: number,
  messageId: number,
  html: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE bot_messages SET text = ?, edited_at = datetime('now')
      WHERE user_id = ? AND message_id = ? AND direction = 'out' AND deleted_at IS NULL`,
  )
    .bind(html.slice(0, BOT_MESSAGE_TEXT_MAX), userId, messageId)
    .run();
}
