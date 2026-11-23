/**
 * Кошик у D1: один набір SQL для веба й бота. Правила кількості не мають двох
 * копій, інакше чат показував би інше, ніж сторінка.
 *
 * @module @wwwuabot/shared/shop
 */

import { formatSqliteDatetime } from "../utils/datetime";
import type { CartLine } from "./cart";
import { ORDER_QTY_MAX } from "./orders";

/** Мінімум D1, потрібний кошику: веб-білд не тягне типи Workers заради одного сховища. */
type CartDb = {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T = unknown>(): Promise<T | null>;
      all<T = unknown>(): Promise<{ results?: T[] }>;
      run(): Promise<unknown>;
    };
  };
};

function clampQty(value: number): number {
  return Math.min(Math.max(Math.floor(Number(value) || 1), 1), ORDER_QTY_MAX);
}

/** Позиції кошика магазину; товар, якого більше немає, не повертається. */
export async function readCartLines(
  db: CartDb,
  userId: number,
  shopId: number,
): Promise<CartLine[]> {
  const result = await db
    .prepare(
      `SELECT c.product_id, c.qty
         FROM shop_carts c
         JOIN shop_products p
           ON p.id = c.product_id AND p.shop_id = c.shop_id AND p.is_active = 1
        WHERE c.user_id = ? AND c.shop_id = ?
        ORDER BY c.rowid`,
    )
    .bind(userId, shopId)
    .all<{ product_id: number; qty: number }>();

  return (result.results ?? []).map((row) => ({
    productId: Number(row.product_id),
    qty: clampQty(row.qty),
  }));
}

/** Прибрати позиції, чий товар зник або вимкнений: кошик не обіцяє неіснуюче. */
export async function pruneCart(db: CartDb, userId: number, shopId: number): Promise<void> {
  await db
    .prepare(
      `DELETE FROM shop_carts
        WHERE user_id = ? AND shop_id = ?
          AND product_id NOT IN (
            SELECT id FROM shop_products WHERE shop_id = ? AND is_active = 1
          )`,
    )
    .bind(userId, shopId, shopId)
    .run();
}

/** Кількості товарів за адресами магазинів — те, що показує rich-екран. */
export async function readCartQuantities(
  db: CartDb,
  userId: number,
  shopSlugs: readonly string[],
): Promise<Map<number, number>> {
  const slugs = [...new Set(shopSlugs.filter(Boolean))];
  if (slugs.length === 0) return new Map();

  const result = await db
    .prepare(
      `SELECT c.product_id, c.qty
         FROM shop_carts c
         JOIN platform_pages s ON s.id = c.shop_id
         JOIN shop_products p
           ON p.id = c.product_id AND p.shop_id = c.shop_id AND p.is_active = 1
        WHERE c.user_id = ? AND s.slug IN (${slugs.map(() => "?").join(", ")})`,
    )
    .bind(userId, ...slugs)
    .all<{ product_id: number; qty: number }>();

  const quantities = new Map<number, number>();
  for (const row of result.results ?? []) {
    quantities.set(Number(row.product_id), clampQty(row.qty));
  }
  return quantities;
}

/** Додати до позиції: повторний дотик збільшує, а не замінює кількість. */
export async function addCartLine(
  db: CartDb,
  userId: number,
  shopId: number,
  productId: number,
  delta: number,
): Promise<CartLine[]> {
  const amount = Math.floor(Number(delta));
  if (!Number.isInteger(amount) || amount === 0) {
    return readCartLines(db, userId, shopId);
  }

  const bounded = Math.max(-ORDER_QTY_MAX, Math.min(ORDER_QTY_MAX, amount));
  await db
    .prepare(
      `INSERT INTO shop_carts (user_id, shop_id, product_id, qty, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, shop_id, product_id)
       DO UPDATE SET qty = MIN(${ORDER_QTY_MAX}, MAX(0, shop_carts.qty + excluded.qty)),
                     updated_at = excluded.updated_at`,
    )
    .bind(userId, shopId, productId, bounded, formatSqliteDatetime())
    .run();

  // «Мінус» на одиниці прибирає позицію, а не лишає рядок із нулем.
  await db
    .prepare(
      "DELETE FROM shop_carts WHERE user_id = ? AND shop_id = ? AND product_id = ? AND qty < 1",
    )
    .bind(userId, shopId, productId)
    .run();

  return readCartLines(db, userId, shopId);
}

/** Поставити кількість; нуль і менше — прибрати позицію. */
export async function setCartLine(
  db: CartDb,
  userId: number,
  shopId: number,
  productId: number,
  qty: number,
): Promise<CartLine[]> {
  if (Math.floor(Number(qty)) < 1) {
    return removeCartLine(db, userId, shopId, productId);
  }

  await db
    .prepare(
      `INSERT INTO shop_carts (user_id, shop_id, product_id, qty, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, shop_id, product_id)
       DO UPDATE SET qty = excluded.qty, updated_at = excluded.updated_at`,
    )
    .bind(userId, shopId, productId, clampQty(qty), formatSqliteDatetime())
    .run();

  return readCartLines(db, userId, shopId);
}

export async function removeCartLine(
  db: CartDb,
  userId: number,
  shopId: number,
  productId: number,
): Promise<CartLine[]> {
  await db
    .prepare("DELETE FROM shop_carts WHERE user_id = ? AND shop_id = ? AND product_id = ?")
    .bind(userId, shopId, productId)
    .run();
  return readCartLines(db, userId, shopId);
}

export async function clearCart(db: CartDb, userId: number, shopId: number): Promise<void> {
  await db
    .prepare("DELETE FROM shop_carts WHERE user_id = ? AND shop_id = ?")
    .bind(userId, shopId)
    .run();
}
