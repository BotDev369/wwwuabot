/**
 * Замовлення магазину: прийом від покупця, читання з обох боків, правка й статус.
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
 * тут її немає за визначенням (`docs/SHOPS.md` §10).
 *
 * **Замовлення бачить кожен, хто веде магазин** (§8): продавець і адміни.
 * Черга одна на всіх, і оповіщення йде **кожному з них** — інакше покупець
 * написав би в порожнечу, а адмін не дізнався б про замовлення, яке сам же
 * обіцяв відправити.
 *
 * **Продавець править замовлення, але не знімок** (§6). Кількість, склад
 * позицій, контакт і власний коментар міняє `update`; назва й ціна позиції,
 * яка вже в замовленні, лишаються **ті, що були на момент покупки** — інакше
 * правка ціни заднім числом переписала б історію. Знімок нової позиції, як і в
 * покупця, бере **база**.
 *
 * **Рядки бази, позначка в розмові й товари за номерами живуть не тут**
 * (`orders-rows.ts`, `orders-notice.ts`, `products.service.ts`): цей файл — самі
 * правила, і жодного `snake_case` він не бачить (`AGENTS.md` §3).
 *
 * @module api-dev/src/services/shop/orders.service
 */

import type { Env } from "../../shared/types";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  DEFAULT_ORDER_STATUSES,
  EMPTY_ORDER_CART,
  ORDER_NEEDS_ITEMS,
  canSetOrderStatus,
  cleanOrderItems,
  mergeOrderItems,
  orderNeedsShipping,
  sanitizeOrderContact,
  sanitizeSellerNote,
  validateOrderDraft,
  type OrderItem,
  type OrderStatus,
  type ShopOrder,
} from "@wwwuabot/shared/shop";
import { activeProductsByIds, ownProductsByIds } from "./product-rows";
import { notifyOrder } from "./orders-notice";
import { itemStatements, readOrder, readOrderStatuses, readOrders } from "./orders-rows";
import { ensureShopSchema, managedShopId, publicShopBySlug } from "./shops";

/** Що сталося з прийомом замовлення: контролер перекладає це в код відповіді. */
export type OrderPlaceOutcome =
  | { kind: "placed"; order: ShopOrder }
  | { kind: "not_found" }
  | { kind: "rejected"; message: string };

/** Що сталося зі зміною замовлення: статус, контакт, позиції чи коментар. */
export type OrderUpdateOutcome =
  | { kind: "saved"; order: ShopOrder }
  | { kind: "not_found" }
  | { kind: "rejected"; message: string };

/** Що сталося з прибиранням замовлення. */
export type OrderRemoveOutcome = { kind: "removed" } | { kind: "not_found" };

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

    const products = await activeProductsByIds(
      this.env.DB,
      shop.id,
      requested.map((item) => item.productId),
    );
    if (products.length !== requested.length) {
      return { kind: "rejected", message: "Частини товарів більше немає в магазині" };
    }

    // Поля контакту залежать від **кошика**, тож виду товару тут мало: змішане
    // замовлення питає адресу, бо фізичній частині її нікуди подіти.
    const needsShipping = orderNeedsShipping(products.map((product) => product.kind));

    const validated = validateOrderDraft(raw, needsShipping);
    if (!validated.ok) return { kind: "rejected", message: validated.message };

    const items = this.snapshots(requested, products);

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

    // Позиції — одним `batch`: частково записане замовлення виглядало б у
    // продавця як інше, і другим таким же воно вже не стало б (`orders-rows`).
    await this.env.DB.batch(itemStatements(this.env.DB, orderId, items));

    const order: ShopOrder = {
      id: orderId,
      shopId: shop.id,
      buyerId,
      status,
      contact: validated.value.contact,
      note: validated.value.note,
      // У нового замовлення коментар продавця порожній — його пише лише
      // продавець, і лише після того, як замовлення прийняли.
      sellerNote: "",
      items,
      createdAt: now,
      updatedAt: now,
    };

    await notifyOrder(this.env.DB, shop, buyerId, order);

    return { kind: "placed", order };
  }

  /** Замовлення магазину, який веде людина; `null` — не її магазин. */
  async listOwn(shopId: number, userId: number): Promise<ShopOrder[] | null> {
    await ensureShopSchema(this.env.DB);
    if ((await managedShopId(this.env.DB, shopId, userId)) === null) return null;

    return await readOrders(this.env.DB, "shop_id = ?", [shopId]);
  }

  /** Статуси магазину: типові з його правками (§7) — те, з чого вибирає екран. */
  async statuses(shopId: number, userId: number): Promise<OrderStatus[] | null> {
    await ensureShopSchema(this.env.DB);
    if ((await managedShopId(this.env.DB, shopId, userId)) === null) return null;

    return await readOrderStatuses(this.env.DB, shopId);
  }

  /**
   * Змінити замовлення свого магазину.
   *
   * **Одне тіло — на все, що міняють, і кожне поле необов'язкове.** Порожнє поле
   * означає «не чіпати»: форма, яка про щось не питала б, не має права це
   * стерти, а `contact` — ще й дані, за якими знайдуть покупця. Тому
   * відсутність **усіх** полів — це відмова, а не порожній запис.
   *
   * Право на магазин перевіряємо **до** будь-якого пошуку (`managedShopId`), а
   * ключ статусу — проти **увімкнених** статусів цього магазину: інакше з екрана
   * можна було б поставити те, що магазин прибрав зі списку вибору
   * (`canSetOrderStatus`).
   */
  async update(
    shopId: number,
    userId: number,
    orderId: number,
    raw: unknown,
  ): Promise<OrderUpdateOutcome> {
    await ensureShopSchema(this.env.DB);
    if ((await managedShopId(this.env.DB, shopId, userId)) === null) return { kind: "not_found" };

    const current = await readOrder(this.env.DB, shopId, orderId);
    if (!current) return { kind: "not_found" };

    const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const fields = ["status", "contact", "sellerNote", "items", "add"] as const;
    if (fields.every((field) => source[field] === undefined)) {
      return { kind: "rejected", message: "Немає що змінювати" };
    }

    let items = current.items;
    let itemsTouched = false;
    if (source.items !== undefined || source.add !== undefined) {
      const added = await this.addedItems(shopId, source.add);
      if (added === null)
        return { kind: "rejected", message: "Такого товару в магазині вже немає" };

      // Контакт перевіряємо **після** позицій і за ними: склад полів залежить
      // від виду товару, а вид міняється саме цією правкою.
      const merged = mergeOrderItems(current.items, cleanOrderItems(source.items), added);
      if (merged.length === 0) return { kind: "rejected", message: ORDER_NEEDS_ITEMS };
      items = merged;
      itemsTouched = true;
    }

    let contact = current.contact;
    if (source.contact !== undefined) {
      const checked = sanitizeOrderContact(
        source.contact,
        orderNeedsShipping(items.map((item) => item.kind)),
      );
      if (!checked.ok) return { kind: "rejected", message: checked.message };
      contact = checked.value;
    }

    let status = current.status;
    if (source.status !== undefined) {
      const statuses = await readOrderStatuses(this.env.DB, shopId);
      if (!canSetOrderStatus(source.status, statuses)) {
        return { kind: "rejected", message: "Такого статусу в магазині немає" };
      }
      status = source.status;
    }

    const sellerNote =
      source.sellerNote === undefined ? current.sellerNote : sanitizeSellerNote(source.sellerNote);

    await this.env.DB.prepare(
      `UPDATE shop_orders
          SET status = ?, contact = ?, seller_note = ?, updated_at = ?
        WHERE id = ? AND shop_id = ?`,
    )
      .bind(status, JSON.stringify(contact), sellerNote, formatSqliteDatetime(), orderId, shopId)
      .run();

    // Позиції переписуємо **лише коли їх справді чіпали**: зайвий `DELETE`+`INSERT`
    // міняв би номери рядків там, де нічого не змінилось.
    if (itemsTouched) {
      await this.env.DB.batch([
        this.env.DB.prepare("DELETE FROM shop_order_items WHERE order_id = ?").bind(orderId),
        ...itemStatements(this.env.DB, orderId, items),
      ]);
    }

    const saved = await readOrder(this.env.DB, shopId, orderId);
    return saved ? { kind: "saved", order: saved } : { kind: "not_found" };
  }

  /**
   * Прибрати замовлення зі своєї черги.
   *
   * **Обидва запити звужені магазином — і це не формальність.** Голий
   * `DELETE FROM shop_order_items WHERE order_id = ?` прибрав би позиції
   * **чужого** замовлення (номер приходить від клієнта): шапка лишилась би на
   * місці, а робота зникла б. Тому позиції видаляються підзапитом, який спершу
   * питає, чиє це замовлення, а сам рядок — тим самим `shop_id`.
   */
  async remove(shopId: number, userId: number, orderId: number): Promise<OrderRemoveOutcome> {
    await ensureShopSchema(this.env.DB);
    if ((await managedShopId(this.env.DB, shopId, userId)) === null) return { kind: "not_found" };

    const [, order] = await this.env.DB.batch([
      this.env.DB.prepare(
        `DELETE FROM shop_order_items
          WHERE order_id IN (SELECT id FROM shop_orders WHERE id = ? AND shop_id = ?)`,
      ).bind(orderId, shopId),
      this.env.DB.prepare("DELETE FROM shop_orders WHERE id = ? AND shop_id = ?").bind(
        orderId,
        shopId,
      ),
    ]);

    return (order.meta?.changes ?? 0) === 0 ? { kind: "not_found" } : { kind: "removed" };
  }

  /**
   * Нові позиції замовлення зі знімком із бази; `null` — товару немає.
   *
   * Знімок бере **база**, як і при покупці (§6): клієнт не називає ні назви, ні
   * ціни. Наявність перевіряємо **за всіма** одразу: замовлення, половину
   * позицій якого записано, виглядало б у черзі як інше замовлення.
   *
   * Чернетки тут проходять (`ownProductsByIds`) — на відміну від покупця:
   * продавець править замовлення, яке вже прийняв.
   */
  private async addedItems(shopId: number, raw: unknown): Promise<OrderItem[] | null> {
    const requested = cleanOrderItems(raw);
    if (requested.length === 0) return [];

    const products = await ownProductsByIds(
      this.env.DB,
      shopId,
      requested.map((item) => item.productId),
    );
    if (products.length !== requested.length) return null;

    return this.snapshots(requested, products);
  }

  /**
   * Номери й кількості → знімки позицій.
   *
   * Один переклад на **обидва** боки (покупець і продавець): два схожі місця
   * розійшлися б у тому, які поля позиції беруться з товару, і одна з двох доріг
   * загубила б вид товару — а від виду залежать поля контакту (§6).
   */
  private snapshots(
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
}
