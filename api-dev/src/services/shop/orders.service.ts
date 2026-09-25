/**
 * Замовлення магазину: прийом від покупця, читання з обох боків і статус.
 *
 * **Ціну й назву бере база, а не покупець.** Клієнт надсилає лише **номери
 * товарів і кількості** (`cleanOrderItems`), а знімок позиції складається тут із
 * рядка `shop_products` (`docs/SHOPS.md` §6). Інакше ціну називав би клієнт, і
 * замовлення можна було б надіслати з чужою ціною.
 *
 * **Замовляють лише те, що показане.** Товар мусить бути в **цьому** магазині й
 * з `is_active = 1`: чернетка не продається, а чужий номер не робить із чужого
 * товару свого. Зникнення частини кошика не «виправляється» мовчки — покупець
 * дізнається про це відмовою, а не меншим замовленням, ніж він надіслав.
 *
 * **Замовлення не платить.** Оплата стоїть окремим кроком і окремим полем, а
 * тут її немає за визначенням (`docs/SHOPS.md` §9).
 *
 * @module api-dev/src/services/shop/orders.service
 */

import type { Env } from "../../shared/types";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { SYSTEM_SENDER_ID, messagePreview } from "@wwwuabot/shared/messages";
import {
  DEFAULT_ORDER_STATUSES,
  EMPTY_ORDER_CART,
  canSetOrderStatus,
  cleanOrderItems,
  orderNeedsShipping,
  orderNoticeText,
  resolveOrderStatuses,
  validateOrderDraft,
  type OrderContact,
  type OrderItem,
  type OrderStatus,
  type ShopOrder,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { apiLog } from "../../shared/logger";
import { ensureConversation } from "../messages/conversations";
import { readJsonColumn } from "./json";
import { PRODUCT_COLUMNS, toProduct, type ProductRow } from "./products.service";
import { ensureShopSchema, ownShopId, publicShopBySlug, type ShopScope } from "./shops";

/** Стеля списку замовлень у будь-який бік: це робоча черга, а не архів. */
const ORDERS_LIMIT = 200;

const ORDER_COLUMNS = "id, shop_id, buyer_id, status, contact, note, created_at, updated_at";
const ITEM_COLUMNS = "id, order_id, product_id, title, price, kind, qty";

interface OrderRow {
  id: number;
  shop_id: number;
  buyer_id: number;
  status: string | null;
  contact: string | null;
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ItemRow {
  id: number;
  order_id: number;
  product_id: number | null;
  title: string | null;
  price: string | null;
  kind: string | null;
  qty: number | null;
}

/** Контакт із JSON-колонки: рядки лишаються, будь-що інше відкидається. */
function contactOf(raw: unknown): OrderContact {
  const value = readJsonColumn(raw);
  if (typeof value !== "object" || value === null) return {};

  const contact: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") contact[key] = entry;
  }
  return contact;
}

function toItem(row: ItemRow): OrderItem {
  return {
    productId: row.product_id === null ? null : Number(row.product_id),
    title: row.title ?? "",
    price: row.price ?? "",
    // Вид — знімок: невідоме значення читається як є, а не як «фізичний».
    kind: row.kind ?? "",
    qty: Number(row.qty ?? 1),
  };
}

/** Що сталося з прийомом замовлення: контролер перекладає це в код відповіді. */
export type OrderPlaceOutcome =
  | { kind: "placed"; order: ShopOrder }
  | { kind: "not_found" }
  | { kind: "rejected"; message: string };

/** Що сталося зі зміною статусу. */
export type OrderStatusOutcome =
  | { kind: "saved"; order: ShopOrder }
  | { kind: "not_found" }
  | { kind: "rejected"; message: string };

export class ShopOrdersService {
  constructor(private env: Env) {}

  /**
   * Замовити у відкритому магазині за його адресою.
   *
   * Приватний магазин не дістається цим шляхом **взагалі**: адресу перекладає в
   * номер `publicShopBySlug`, і в ньому стоять `is_public`, `is_active` та
   * незаблокований власник. Тобто замовити можна рівно в тому магазині, який
   * перед цим відкрився покупцеві.
   */
  async place(shopSlug: string, buyerId: number, raw: unknown): Promise<OrderPlaceOutcome> {
    await ensureShopSchema(this.env.DB);

    const shop = await publicShopBySlug(this.env.DB, shopSlug);
    if (!shop) return { kind: "not_found" };

    const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
    const requested = cleanOrderItems(source.items);
    if (requested.length === 0) return { kind: "rejected", message: EMPTY_ORDER_CART };

    const products = await this.products(
      shop.id,
      requested.map((item) => item.productId),
    );
    if (products.length !== requested.length) {
      return { kind: "rejected", message: "Частини товарів більше немає в магазині" };
    }

    // Поля контакту залежать від **кошика**, тож виду товару тут мало: змішане
    // замовлення питає адресу, бо фізичній частині її нікуди подіти.
    const byId = new Map(products.map((product) => [product.id, product]));
    const needsShipping = orderNeedsShipping(products.map((product) => product.kind));

    const validated = validateOrderDraft(raw, needsShipping);
    if (!validated.ok) return { kind: "rejected", message: validated.message };

    const items: OrderItem[] = requested.map((item) => {
      const product = byId.get(item.productId);
      return {
        productId: item.productId,
        title: product?.title ?? "",
        price: product?.price ?? "",
        kind: product?.kind ?? "",
        qty: item.qty,
      };
    });

    // Типовий статус береться зі списку, а не пишеться рядком: те саме правило
    // читає екран продавця (`DEFAULT_ORDER_STATUSES`).
    const status = DEFAULT_ORDER_STATUSES[0].key;
    const now = formatSqliteDatetime();

    const inserted = await this.env.DB.prepare(
      `INSERT INTO shop_orders (shop_id, buyer_id, status, contact, note, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        shop.id,
        buyerId,
        status,
        JSON.stringify(validated.value.contact),
        validated.value.note,
        now,
        now,
      )
      .run();

    const orderId = Number(inserted.meta?.last_row_id ?? 0);
    if (!orderId) return { kind: "rejected", message: "Не вдалося зберегти замовлення" };

    // Позиції — одним `batch`: частково записане замовлення (шапка без позицій)
    // виглядало б у продавця як порожнє, і другим таким же воно вже не стало б.
    await this.env.DB.batch(
      items.map((item) =>
        this.env.DB.prepare(
          `INSERT INTO shop_order_items (order_id, product_id, title, price, kind, qty)
             VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(orderId, item.productId, item.title, item.price, item.kind, item.qty),
      ),
    );

    const order: ShopOrder = {
      id: orderId,
      shopId: shop.id,
      buyerId,
      status,
      contact: validated.value.contact,
      note: validated.value.note,
      items,
      createdAt: now,
      updatedAt: now,
    };

    await this.notify(shop, buyerId, order);

    return { kind: "placed", order };
  }

  /** Замовлення свого магазину — те, що бачить продавець; `null` — не свій. */
  async listOwn(shopId: number, ownerId: number): Promise<ShopOrder[] | null> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return null;

    return await this.read("shop_id = ?", [shopId]);
  }

  /** Статуси магазину: типові з його правками (§7) — те, з чого вибирає екран. */
  async statuses(shopId: number, ownerId: number): Promise<OrderStatus[] | null> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return null;

    const result = await this.env.DB.prepare(
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
   * Поставити статус замовленню свого магазину.
   *
   * Власника перевіряємо **до** будь-якого пошуку (`ownShopId`), а ключ — проти
   * **увімкнених** статусів цього магазину: інакше з екрана можна було б
   * поставити те, що магазин прибрав зі списку вибору (`canSetOrderStatus`).
   */
  async setStatus(
    shopId: number,
    ownerId: number,
    orderId: number,
    rawStatus: unknown,
  ): Promise<OrderStatusOutcome> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return { kind: "not_found" };

    const statuses = (await this.statuses(shopId, ownerId)) ?? [];
    if (!canSetOrderStatus(rawStatus, statuses)) {
      return { kind: "rejected", message: "Такого статусу в магазині немає" };
    }

    const result = await this.env.DB.prepare(
      "UPDATE shop_orders SET status = ?, updated_at = ? WHERE id = ? AND shop_id = ?",
    )
      .bind(rawStatus, formatSqliteDatetime(), orderId, shopId)
      .run();
    if ((result.meta?.changes ?? 0) === 0) return { kind: "not_found" };

    const order = await this.one(shopId, orderId);
    return order ? { kind: "saved", order } : { kind: "not_found" };
  }

  /**
   * Позначка платформи в розмові покупця з продавцем (`docs/SHOPS.md` §8).
   *
   * **Замовлення і є зв'язком**, тож окремої згоди на розмову не питаємо; читає
   * про це `links.ts`, а не розмітка. Помилка тут не має зривати замовлення:
   * воно вже збережене, а переписка — спосіб про нього дізнатись, не місце, де
   * воно живе.
   *
   * `read_at` лишається порожнім **навмисно**: саме за ним продавцю світиться
   * бейдж непрочитаного, і це єдине, що кличе його в продукт.
   */
  private async notify(shop: ShopScope, buyerId: number, order: ShopOrder): Promise<void> {
    // Продавець, який пробує власну вітрину, замовляє сам у себе — і розмову із
    // собою відкривати нікому: друга сторона тут та сама людина.
    if (buyerId === shop.ownerId) return;

    try {
      const conversationId = await ensureConversation(this.env.DB, buyerId, shop.ownerId);
      if (!conversationId) return;

      const now = formatSqliteDatetime();
      const body = orderNoticeText(order, shop.title);

      await this.env.DB.batch([
        this.env.DB.prepare(
          `INSERT INTO messages (conversation_id, sender_id, body, created_at, read_at, is_system)
             VALUES (?, ?, ?, ?, NULL, 1)`,
        ).bind(conversationId, SYSTEM_SENDER_ID, body, now),
        // Список розмов читає `last_message_*`, а не `messages` — те саме
        // оновлення, що й у `sendMessage`.
        this.env.DB.prepare(
          `UPDATE conversations SET last_message_at = ?, last_message_text = ?, last_sender_id = ?,
                  hidden_a = 0, hidden_b = 0
             WHERE id = ?`,
        ).bind(now, messagePreview(body), SYSTEM_SENDER_ID, conversationId),
      ]);
    } catch (e: unknown) {
      apiLog.error("Shop order notice error", e);
    }
  }

  /** Показані товари цього магазину за номерами — те, з чого складається знімок. */
  private async products(shopId: number, ids: readonly number[]): Promise<ShopProduct[]> {
    const placeholders = ids.map(() => "?").join(", ");
    const result = await this.env.DB.prepare(
      `SELECT ${PRODUCT_COLUMNS} FROM shop_products
        WHERE shop_id = ? AND is_active = 1 AND id IN (${placeholders})`,
    )
      .bind(shopId, ...ids)
      .all<ProductRow>();

    return (result.results ?? []).map(toProduct);
  }

  private async read(where: string, params: readonly unknown[]): Promise<ShopOrder[]> {
    const result = await this.env.DB.prepare(
      `SELECT ${ORDER_COLUMNS} FROM shop_orders WHERE ${where} ORDER BY id DESC LIMIT ?`,
    )
      .bind(...params, ORDERS_LIMIT)
      .all<OrderRow>();

    const rows = result.results ?? [];
    const items = await this.items(rows.map((row) => Number(row.id)));
    return rows.map((row) => this.toOrder(row, items.get(Number(row.id)) ?? []));
  }

  private async one(shopId: number, orderId: number): Promise<ShopOrder | null> {
    const row = await this.env.DB.prepare(
      `SELECT ${ORDER_COLUMNS} FROM shop_orders WHERE id = ? AND shop_id = ?`,
    )
      .bind(orderId, shopId)
      .first<OrderRow>();
    if (!row) return null;

    const items = await this.items([Number(row.id)]);
    return this.toOrder(row, items.get(Number(row.id)) ?? []);
  }

  /** Позиції замовлень одним запитом: список із сотні замовлень не робить сотні. */
  private async items(orderIds: readonly number[]): Promise<Map<number, OrderItem[]>> {
    const byOrder = new Map<number, OrderItem[]>();
    if (orderIds.length === 0) return byOrder;

    const placeholders = orderIds.map(() => "?").join(", ");
    const result = await this.env.DB.prepare(
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

  private toOrder(row: OrderRow, items: OrderItem[]): ShopOrder {
    return {
      id: Number(row.id),
      shopId: Number(row.shop_id),
      buyerId: Number(row.buyer_id),
      status: row.status ?? DEFAULT_ORDER_STATUSES[0].key,
      contact: contactOf(row.contact),
      note: row.note ?? "",
      items,
      createdAt: row.created_at ?? "",
      updatedAt: row.updated_at ?? "",
    };
  }
}
