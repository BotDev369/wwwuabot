/**
 * Кошик покупця: D1 — джерело істини для веба й бота. У кошику лише номер
 * товару й кількість; ціну перевіряє замовлення, а зниклий товар прибирається
 * при читанні.
 *
 * @module api-dev/src/services/shop/cart.service
 */

import {
  addCartLine,
  clearCart,
  pruneCart,
  readCartLines,
  setCartLine,
  type CartLine,
} from "@wwwuabot/shared/shop";
import type { Env } from "../../shared/types";
import { ensureShopSchema, publicShopBySlug } from "./shops";

export interface CartChange {
  productId: number;
  /** Абсолютна кількість; нуль і менше — прибрати позицію. */
  qty?: number;
  /** Зміна кількості: повторний дотик додає, а не замінює. */
  delta?: number;
}

export type CartOutcome =
  { kind: "ok"; lines: CartLine[] } | { kind: "not_found" } | { kind: "rejected"; message: string };

/** Товар показується саме в цьому магазині; чернетка не проходить. */
async function shownInShop(env: Env, shopId: number, productId: number): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT id FROM shop_products WHERE id = ? AND shop_id = ? AND is_active = 1",
  )
    .bind(productId, shopId)
    .first<{ id: number }>();
  return Boolean(row);
}

export class ShopCartService {
  constructor(private env: Env) {}

  private async shop(slug: string): Promise<{ id: number } | null> {
    await ensureShopSchema(this.env.DB);
    const shop = await publicShopBySlug(this.env.DB, slug);
    return shop ? { id: shop.id } : null;
  }

  async read(shopSlug: string, userId: number): Promise<CartOutcome> {
    const shop = await this.shop(shopSlug);
    if (!shop) return { kind: "not_found" };

    await pruneCart(this.env.DB, userId, shop.id);
    return { kind: "ok", lines: await readCartLines(this.env.DB, userId, shop.id) };
  }

  async change(shopSlug: string, userId: number, change: CartChange): Promise<CartOutcome> {
    const shop = await this.shop(shopSlug);
    if (!shop) return { kind: "not_found" };

    const removing = change.qty !== undefined && change.qty < 1;
    if (!removing && !(await shownInShop(this.env, shop.id, change.productId))) {
      return { kind: "rejected", message: "Товару більше немає в магазині" };
    }

    const lines =
      change.qty !== undefined
        ? await setCartLine(this.env.DB, userId, shop.id, change.productId, change.qty)
        : await addCartLine(this.env.DB, userId, shop.id, change.productId, change.delta ?? 0);

    return { kind: "ok", lines };
  }

  async clear(shopSlug: string, userId: number): Promise<CartOutcome> {
    const shop = await this.shop(shopSlug);
    if (!shop) return { kind: "not_found" };

    await clearCart(this.env.DB, userId, shop.id);
    return { kind: "ok", lines: [] };
  }
}
