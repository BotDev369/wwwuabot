/**
 * Швидке замовлення: один тап, дані покупця — з Telegram.
 *
 * `contact` порожній, `buyer_profile` — знімок профілю; телефон та адресу
 * узгоджують у розмові. Ліміти (5 за добу, одне активне) — на сервері.
 * @module api-dev/src/services/shop/quick-order.service
 */

import type { Env } from "../../shared/types";
import { apiLog } from "../../shared/logger";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  DEFAULT_ORDER_STATUSES,
  EMPTY_ORDER_CART,
  cleanOrderItems,
  type OrderItemInput,
  type ShopOrder,
} from "@wwwuabot/shared/shop";
import { activeProductsByIds } from "./product-rows";
import { notifyOrder } from "./orders-notice";
import { itemStatements, readOrder, readOrderStatuses } from "./orders-rows";
import { orderSnapshots } from "./buyer-profiles";
import { ensureShopSchema, publicShopBySlug } from "./shops";
import { buyerAvatar } from "./buyer-avatar";

/** Скільки швидких замовлень магазин приймає від людини за добу. */
export const QUICK_ORDER_DAILY_LIMIT = 5;

export type QuickOrderOutcome =
  | { kind: "placed"; order: ShopOrder }
  | { kind: "not_found" }
  | { kind: "rejected"; message: string };

/** Межа доби — тим самим форматом, що й `created_at` у D1. */
function dayAgo(): string {
  return formatSqliteDatetime(new Date(Date.now() - 24 * 60 * 60 * 1000));
}

interface UserRow {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  language: string | null;
}

/** Ім'я з Telegram: обидві частини, інакше чесне «Покупець». */
function displayName(row: UserRow | null): string {
  const name = [row?.first_name, row?.last_name]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(" ");
  return name || "Покупець";
}

export class QuickOrderService {
  constructor(private env: Env) {}

  async place(shopSlug: string, buyerId: number, raw: unknown): Promise<QuickOrderOutcome> {
    await ensureShopSchema(this.env.DB);

    const shop = await publicShopBySlug(this.env.DB, shopSlug);
    if (!shop) return { kind: "not_found" };

    const source = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
    const requested: OrderItemInput[] = cleanOrderItems(source.items);
    if (requested.length === 0) return { kind: "rejected", message: EMPTY_ORDER_CART };

    const products = await activeProductsByIds(
      this.env.DB,
      shop.id,
      requested.map((item) => item.productId),
    );
    if (products.length !== requested.length) {
      return { kind: "rejected", message: "Частини товарів більше немає в магазині" };
    }

    const refusal = await this.limitRefusal(shop.id, buyerId);
    if (refusal) return { kind: "rejected", message: refusal };

    const profile = await this.buyerProfile(buyerId);
    const status = DEFAULT_ORDER_STATUSES[0].key;
    const now = formatSqliteDatetime();

    const inserted = await this.env.DB.prepare(
      `INSERT INTO shop_orders
         (shop_id, buyer_id, status, contact, buyer_profile, note, created_at, updated_at)
       VALUES (?, ?, ?, '{}', ?, '', ?, ?)`,
    )
      .bind(shop.id, buyerId, status, JSON.stringify(profile), now, now)
      .run();

    const orderId = Number(inserted.meta?.last_row_id ?? 0);
    if (!orderId) return { kind: "rejected", message: "Не вдалося зберегти замовлення" };

    await this.env.DB.batch(
      itemStatements(this.env.DB, orderId, orderSnapshots(requested, products)),
    );

    const order = await readOrder(this.env.DB, shop.id, orderId);
    if (!order) return { kind: "rejected", message: "Не вдалося зберегти замовлення" };

    // Знімок уже в рядку, але `readOrder` його не читає: картка продавця
    // отримає профіль тим самим запитом, а позначка в розмові — тут.
    order.buyerProfile = profile;
    await notifyOrder(this.env.DB, shop, buyerId, order);
    return { kind: "placed", order };
  }

  /**
   * Чому замовляти ще не можна; `null` — можна.
   *
   * Активне замовлення визначається **стадією статусу**, а не рядком: магазин
   * може перейменувати `new`, і текст ключа тоді нічого не значить.
   */
  private async limitRefusal(shopId: number, buyerId: number): Promise<string | null> {
    const total = await this.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM shop_orders
        WHERE shop_id = ? AND buyer_id = ? AND created_at >= ?`,
    )
      .bind(shopId, buyerId, dayAgo())
      .first<{ total: number }>();

    if (Number(total?.total ?? 0) >= QUICK_ORDER_DAILY_LIMIT) {
      return `Не більше ${QUICK_ORDER_DAILY_LIMIT} замовлень на добу — спробуйте пізніше`;
    }

    const statuses = await readOrderStatuses(this.env.DB, shopId);
    const open = new Set(
      statuses.filter((status) => status.stage === "open").map((status) => status.key),
    );
    const active = await this.env.DB.prepare(
      "SELECT status FROM shop_orders WHERE shop_id = ? AND buyer_id = ?",
    )
      .bind(shopId, buyerId)
      .all<{ status: string | null }>();

    const hasActive = (active.results ?? []).some((row) => open.has(row.status ?? ""));
    return hasActive ? "У вас уже є активне замовлення в цьому магазині" : null;
  }

  /** Знімок профілю: рядок `users` плюс фото, збережене в R2. */
  private async buyerProfile(
    buyerId: number,
  ): Promise<{ name: string; username: string; language: string; photo: string; quick: true }> {
    const row = await this.env.DB.prepare(
      "SELECT first_name, last_name, username, language FROM users WHERE user_id = ?",
    )
      .bind(buyerId)
      .first<UserRow>();

    let photo = "";
    try {
      photo = await buyerAvatar(this.env, buyerId);
    } catch (error: unknown) {
      // Замовлення важливіше за фото: картка покаже заглушку.
      apiLog.error("Quick order avatar skipped", error);
    }

    return {
      name: displayName(row),
      username: (row?.username ?? "").replace(/^@/, ""),
      language: row?.language ?? "",
      photo,
      quick: true,
    };
  }
}
