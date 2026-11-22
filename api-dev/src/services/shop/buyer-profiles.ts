/**
 * Знімок покупця й позицій — окремо від читання замовлення.
 *
 * `shop_orders.buyer_profile` читається одним запитом на список: картка
 * продавця показує фото й @нік навіть тоді, коли `users` уже змінився.
 *
 * @module api-dev/src/services/shop/buyer-profiles
 */

import type { BuyerProfile, OrderItem, ShopOrder } from "@wwwuabot/shared/shop";
import { readJsonColumn } from "./json";

/** Знімок профілю з JSON-колонки; невідоме значення — «знімка немає». */
export function buyerProfileOf(raw: unknown): BuyerProfile | null {
  const value = readJsonColumn(raw);
  if (typeof value !== "object" || value === null) return null;

  const source = value as Record<string, unknown>;
  const text = (key: string): string =>
    typeof source[key] === "string" ? (source[key] as string) : "";
  const name = text("name");
  if (!name) return null;

  return {
    name,
    username: text("username"),
    language: text("language"),
    photo: text("photo"),
    quick: source.quick === true,
  };
}

/**
 * Профілі для списку замовлень — одним запитом, а не по одному на рядок.
 *
 * Замовлення без знімка лишаються як є: картка покаже лише контакт.
 */
export async function attachBuyerProfiles(
  db: D1Database,
  orders: readonly ShopOrder[],
): Promise<ShopOrder[]> {
  const ids = orders.map((order) => order.id);
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(", ");
  try {
    const result = await db
      .prepare(`SELECT id, buyer_profile FROM shop_orders WHERE id IN (${placeholders})`)
      .bind(...ids)
      .all<{ id: number; buyer_profile: string | null }>();

    const byId = new Map(
      (result.results ?? []).map((row) => [Number(row.id), buyerProfileOf(row.buyer_profile)]),
    );
    return orders.map((order) => ({ ...order, buyerProfile: byId.get(order.id) ?? null }));
  } catch {
    // Профіль — показ, а не замовлення: без нього картка лишається з контактом.
    return [...orders];
  }
}

/**
 * Номери й кількості → знімки позицій.
 *
 * Ціну, назву й вид бере база, а не клієнт: інакше ціну називав би покупець.
 */
export function orderSnapshots(
  requested: readonly { productId: number; qty: number }[],
  products: readonly { id: number; title: string; price: string; kind: string }[],
): OrderItem[] {
  const byId = new Map(products.map((product) => [product.id, product]));

  return requested.map((item) => {
    const product = byId.get(item.productId);
    return {
      productId: item.productId,
      title: product?.title ?? "",
      price: product?.price ?? "",
      kind: product?.kind ?? "",
      qty: item.qty,
    };
  });
}
