/**
 * Замовлення як **рядки бази**: читання, складання й перезапис позицій.
 *
 * **Навіщо окремо.** `orders.service.ts` — це правила (що можна замовити, хто
 * веде магазин, коли відмовити), і коли поруч із ними живуть `SELECT`-и з
 * перекладом колонок, файл переростає межу, за якою його ніхто не читає цілком
 * (`AGENTS.md` §3). Поділ навмисно проходить по межі «рядок ↔ факт»: тут усе, що
 * знає про назви колонок, а сервіс працює з `ShopOrder` і не бачить жодного
 * `snake_case`.
 *
 * **Читання — з позиціями й одним запитом на список.** Позицій у замовленні
 * багато, а замовлень у черзі буває сотня: `readItems` бере їх одним `IN (…)`, і
 * черга не робить по запиту на рядок.
 *
 * **Запис позицій — тим самим текстом `INSERT`, що й прийом замовлення**
 * (`itemStatements`): два схожі `INSERT` розійшлися б колонками, і знімок однієї
 * з двох доріг загубив би вид товару.
 *
 * @module api-dev/src/services/shop/orders-rows
 */

import {
  DEFAULT_ORDER_STATUSES,
  resolveOrderStatuses,
  type OrderContact,
  type OrderItem,
  type OrderStatus,
  type ShopOrder,
} from "@wwwuabot/shared/shop";
import { readJsonColumn } from "./json";

/** Стеля списку замовлень у будь-який бік: це робоча черга, а не архів. */
export const ORDERS_LIMIT = 200;

export const ORDER_COLUMNS =
  "id, shop_id, buyer_id, status, contact, note, seller_note, created_at, updated_at";
export const ITEM_COLUMNS = "id, order_id, product_id, title, price, kind, qty";

export interface OrderRow {
  id: number;
  shop_id: number;
  buyer_id: number;
  status: string | null;
  contact: string | null;
  note: string | null;
  seller_note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ItemRow {
  id: number;
  order_id: number;
  product_id: number | null;
  title: string | null;
  price: string | null;
  kind: string | null;
  qty: number | null;
}

/**
 * Контакт із JSON-колонки: рядки лишаються, будь-що інше відкидається.
 *
 * JSON приходить із бази, а не від клієнта, але колонку писав і давніший код:
 * значення-не-рядок у ній показало б у картці `[object Object]`.
 */
export function contactOf(raw: unknown): OrderContact {
  const value = readJsonColumn(raw);
  if (typeof value !== "object" || value === null) return {};

  const contact: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") contact[key] = entry;
  }
  return contact;
}

export function toItem(row: ItemRow): OrderItem {
  return {
    productId: row.product_id === null ? null : Number(row.product_id),
    title: row.title ?? "",
    price: row.price ?? "",
    // Вид — знімок: невідоме значення читається як є, а не як «фізичний».
    kind: row.kind ?? "",
    qty: Number(row.qty ?? 1),
  };
}

export function toOrder(row: OrderRow, items: OrderItem[]): ShopOrder {
  return {
    id: Number(row.id),
    shopId: Number(row.shop_id),
    buyerId: Number(row.buyer_id),
    status: row.status ?? DEFAULT_ORDER_STATUSES[0].key,
    contact: contactOf(row.contact),
    note: row.note ?? "",
    // Колонка, додана наявній таблиці, приходить як `NULL` — читаємо її як
    // порожній коментар, а не як помилку (див. `ensure-tables`).
    sellerNote: row.seller_note ?? "",
    items,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/** Позиції замовлень одним запитом: список із сотні замовлень не робить сотні. */
async function readItems(
  db: D1Database,
  orderIds: readonly number[],
): Promise<Map<number, OrderItem[]>> {
  const byOrder = new Map<number, OrderItem[]>();
  if (orderIds.length === 0) return byOrder;

  const placeholders = orderIds.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT ${ITEM_COLUMNS} FROM shop_order_items
        WHERE order_id IN (${placeholders}) ORDER BY id`,
    )
    .bind(...orderIds)
    .all<ItemRow>();

  for (const row of result.results ?? []) {
    const orderId = Number(row.order_id);
    byOrder.set(orderId, [...(byOrder.get(orderId) ?? []), toItem(row)]);
  }
  return byOrder;
}

/** Замовлення магазину за умовою — від найновіших до найстаріших. */
export async function readOrders(
  db: D1Database,
  where: string,
  params: readonly unknown[],
): Promise<ShopOrder[]> {
  const result = await db
    .prepare(`SELECT ${ORDER_COLUMNS} FROM shop_orders WHERE ${where} ORDER BY id DESC LIMIT ?`)
    .bind(...params, ORDERS_LIMIT)
    .all<OrderRow>();

  const rows = result.results ?? [];
  const items = await readItems(
    db,
    rows.map((row) => Number(row.id)),
  );
  return rows.map((row) => toOrder(row, items.get(Number(row.id)) ?? []));
}

/** Одне замовлення магазину; `null` — немає або воно чуже. */
export async function readOrder(
  db: D1Database,
  shopId: number,
  orderId: number,
): Promise<ShopOrder | null> {
  const row = await db
    .prepare(`SELECT ${ORDER_COLUMNS} FROM shop_orders WHERE id = ? AND shop_id = ?`)
    .bind(orderId, shopId)
    .first<OrderRow>();
  if (!row) return null;

  const items = await readItems(db, [Number(row.id)]);
  return toOrder(row, items.get(Number(row.id)) ?? []);
}

/** Статуси магазину: типові з його правками (§7) — те, з чого вибирає екран. */
export async function readOrderStatuses(db: D1Database, shopId: number): Promise<OrderStatus[]> {
  const result = await db
    .prepare(
      "SELECT key, label, stage, is_active FROM shop_order_statuses WHERE shop_id = ? ORDER BY id",
    )
    .bind(shopId)
    .all<{ key: string; label: string | null; stage: string | null; is_active: number | null }>();

  return resolveOrderStatuses(
    (result.results ?? []).map((row) => ({
      key: String(row.key),
      label: row.label,
      stage: row.stage === "open" || row.stage === "closed" ? row.stage : null,
      isActive: Number(row.is_active ?? 1) === 1,
    })),
  );
}

/**
 * Позиції замовлення одним `batch`: частково записане замовлення (шапка без
 * позицій або половина позицій) виглядало б у продавця як інше замовлення — і
 * другим таким же воно вже не стало б.
 */
export function itemStatements(
  db: D1Database,
  orderId: number,
  items: readonly OrderItem[],
): D1PreparedStatement[] {
  return items.map((item) =>
    db
      .prepare(
        `INSERT INTO shop_order_items (order_id, product_id, title, price, kind, qty)
           VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(orderId, item.productId, item.title, item.price, item.kind, item.qty),
  );
}

/**
 * Переписати позиції замовлення: прибрати старі, вкласти нові — одним `batch`.
 *
 * Перезапис, а не різниця (`UPDATE` кількості, `DELETE` зниклих), бо знімок
 * однієї позиції складається з чотирьох полів, і «оновити те, що змінилось»
 * неминуче додало б пʼяте правило порівняння. Номери рядків від цього
 * змінюються, і ніщо на них не посилається.
 */
export async function writeOrderItems(
  db: D1Database,
  orderId: number,
  items: readonly OrderItem[],
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM shop_order_items WHERE order_id = ?").bind(orderId),
    ...itemStatements(db, orderId, items),
  ]);
}
