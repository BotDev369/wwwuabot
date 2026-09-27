/**
 * Одне замовлення — **робота з ним**, а не перегляд.
 *
 * **Екран, а не поверхня.** Замовлення правлять кроками: міняють кількості,
 * прибирають і додають позиції, виправляють контакт, пишуть коментар — і
 * повертаються сюди посиланням. У модалки немає ні історії, ні адреси
 * (`AGENTS.md` §7), а тут іще й поля, у яких працюють.
 *
 * **Позиція лишається знімком і після правки.** Кількість міняємо **в тому
 * рядку, який уже є**, а назву й ціну правка не переписує: вони ті, що були на
 * момент покупки (`docs/SHOPS.md` §6). Нові позиції приїжджають окремим полем
 * (`add`), і знімок для них бере **база** — клієнт не називає ні назви, ні ціни,
 * як і при покупці.
 *
 * **Стан живе тут, розмітка — у картках** (`ShopOrderItemsCard`,
 * `ShopOrderBuyerCard`): правка — це один стан на три картки, і кожна з них
 * питала б його в батька однаково.
 *
 * **«Написати» веде у звичайну розмову** (`/messages?peer=…`), а не в окремий
 * «пошту магазину»: розмову вже відкрило замовлення, і другий канал до того
 * самого покупця розійшовся б із першим (`docs/SHOPS.md` §8).
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { messagesPeerPath } from "@wwwuabot/shared/messages";
import {
  ORDER_NEEDS_ITEMS,
  ORDER_QTY_MAX,
  orderContactFields,
  orderItemsLabel,
  orderNeedsShipping,
  sanitizeOrderContact,
  sanitizeSellerNote,
  type OrderContact,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { useDialog } from "@wwwuabot/ui/dialog";
import { shopOrdersPath } from "@/app/routes";
import { PageState } from "@/pages/user-pages/PageState";
import { useUserPage } from "@/pages/user-pages/useUserPage";
import { addableProducts, orderStatusTone, type EditableOrderItem } from "./order-view";
import { ShopOrderBuyerCard } from "./ShopOrderBuyerCard";
import { ShopOrderItemsCard } from "./ShopOrderItemsCard";
import { useShopOrders } from "./useShopOrders";
import { useShopProducts } from "./useShopProducts";

/** Те, що правлять: позиції, контакт покупця й коментар продавця. */
interface OrderForm {
  items: EditableOrderItem[];
  contact: OrderContact;
  sellerNote: string;
}

export function ShopOrderPage(): ReactElement {
  const { id, orderId } = useParams<{ id: string; orderId: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();

  const { page, loading, error } = useUserPage(id);
  const shop = useShopOrders(page?.id ?? null);
  const products = useShopProducts(page?.id ?? null);

  const numericId = Number(orderId);
  const order = shop.orders.find((item) => item.id === numericId) ?? null;

  const [form, setForm] = useState<OrderForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Форма заповнюється **один раз** — із замовлення: воно приходить не одразу
  // (в адресі є номер, а даних під ним ще немає), і почати заповнення з
  // порожнього стану означало б показати порожні позиції, а потім перебити їх
  // чужими на очах у людини. Правка статусу форму не перезаписує — саме тому
  // це окремий стан, а не похідна від замовлення.
  if (!form && order) {
    setForm({
      items: order.items.map((item) => ({ ...item, isNew: false })),
      contact: { ...order.contact },
      sellerNote: order.sellerNote,
    });
  }

  if (!page || !order || !form) {
    return (
      <div className="wb-page">
        <PageState
          loading={loading || shop.loading}
          message={error ?? "Такого замовлення немає."}
        />
      </div>
    );
  }

  // Номер магазину беремо **у змінну**: усередині обробників звуження типів не
  // діє, і там `page` знову «може бути null».
  const pageId = page.id;
  const tone = orderStatusTone(order.status, shop.statuses);
  // Поля контакту залежать від **позицій**, а не від форми: прибравши останній
  // фізичний товар, продавець перестає питати адресу — те саме правило, що в
  // оформленні покупця (`orderContactFields`).
  const fields = orderContactFields(orderNeedsShipping(form.items.map((item) => item.kind)));
  const available = addableProducts(products.products, form.items);

  /** Позиції, які лишаються: ті, що вже в замовленні, зі своїм знімком. */
  const kept = form.items.filter(
    (item): item is EditableOrderItem & { productId: number } =>
      !item.isNew && item.productId !== null,
  );
  /** Нові позиції: назви й ціни тут — лише для показу, знімок дасть база. */
  const added = form.items.filter(
    (item): item is EditableOrderItem & { productId: number } =>
      item.isNew && item.productId !== null,
  );

  function changeQty(productId: number, qty: number): void {
    if (!form) return;
    const next = Math.min(Math.max(qty, 1), ORDER_QTY_MAX);
    setForm({
      ...form,
      items: form.items.map((item) =>
        item.productId === productId ? { ...item, qty: next } : item,
      ),
    });
  }

  function dropItem(productId: number): void {
    if (!form) return;
    setForm({ ...form, items: form.items.filter((item) => item.productId !== productId) });
  }

  function addProduct(product: ShopProduct): void {
    if (!form) return;
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          kind: product.kind,
          qty: 1,
          isNew: true,
        },
      ],
    });
  }

  async function change(status: string): Promise<void> {
    if (!order || status === order.status) return;
    try {
      await shop.setStatus(order.id, status);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося змінити статус", {
        title: "Помилка",
      });
    }
  }

  async function submit(): Promise<void> {
    if (!order || !form) return;
    if (form.items.length === 0) {
      setFailure(ORDER_NEEDS_ITEMS);
      return;
    }

    // Перевіряємо тими самими правилами, що й сервер: коментар і контакт не
    // мають доїжджати до нього, щоб дізнатись про пропущене поле.
    const contact = sanitizeOrderContact(
      form.contact,
      orderNeedsShipping(form.items.map((item) => item.kind)),
    );
    if (!contact.ok) {
      setFailure(contact.message);
      return;
    }

    setSaving(true);
    setFailure(null);
    try {
      await shop.save(order.id, {
        contact: contact.value,
        sellerNote: sanitizeSellerNote(form.sellerNote),
        items: kept.map((item) => ({ productId: item.productId, qty: item.qty })),
        add: added.map((item) => ({ productId: item.productId, qty: item.qty })),
      });
      await navigate(shopOrdersPath(pageId), { replace: true });
    } catch (e: unknown) {
      setFailure(e instanceof Error ? e.message : "Не вдалося зберегти замовлення");
    } finally {
      setSaving(false);
    }
  }

  async function removeOrder(): Promise<void> {
    if (!order) return;

    const confirmed = await dialog.confirm(`Прибрати замовлення №${order.id}?`, {
      title: "Прибирання",
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!confirmed) return;

    try {
      await shop.remove(order.id);
      await navigate(shopOrdersPath(pageId), { replace: true });
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося прибрати замовлення", {
        title: "Помилка",
      });
    }
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => void navigate(shopOrdersPath(pageId))}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          Замовлення №{order.id}
        </h1>
      </div>

      {/* Картка стану — та сама, що в черзі, разом із кольором роботи
          (`orderStatusTone`): у списку й тут замовлення мусить читатись
          однаково, інакше колір у списку був би сам собою. */}
      <div className={`shop-order shop-order--${tone}`}>
        <div className="shop-order-head">
          <span className="shop-order-id">{orderItemsLabel(form.items)}</span>
          <span className="shop-order-when">{order.createdAt}</span>
        </div>

        <div className="shop-order-statuses">
          {shop.statuses
            .filter((status) => status.isActive || status.key === order.status)
            .map((status) => (
              <button
                key={status.key}
                type="button"
                className={
                  status.key === order.status ? "shop-status shop-status--current" : "shop-status"
                }
                aria-current={status.key === order.status}
                onClick={() => void change(status.key)}
              >
                {status.label}
              </button>
            ))}
        </div>
      </div>

      <ShopOrderItemsCard
        items={form.items}
        available={available}
        shopHasProducts={products.products.length > 0}
        onQty={changeQty}
        onDrop={dropItem}
        onAdd={addProduct}
      />

      <ShopOrderBuyerCard
        fields={fields}
        contact={form.contact}
        note={order.note}
        sellerNote={form.sellerNote}
        onContact={(key, value) =>
          setForm((prev) => (prev ? { ...prev, contact: { ...prev.contact, [key]: value } } : prev))
        }
        onSellerNote={(value) => setForm((prev) => (prev ? { ...prev, sellerNote: value } : prev))}
      />

      {failure && <p className="wb-text-red">{failure}</p>}

      <div className="shop-form-actions">
        <button
          type="button"
          className="wb-btn wb-btn-primary"
          disabled={saving}
          onClick={() => void submit()}
        >
          <Icon name="save" size={16} />
          {saving ? "Зберігаємо…" : "Зберегти"}
        </button>
        <button
          type="button"
          className="wb-btn wb-btn-secondary"
          onClick={() => void navigate(messagesPeerPath(order.buyerId))}
        >
          <Icon name="message-square" size={16} />
          Написати
        </button>
      </div>

      {/* Прибирання — **окремо від дій**, самим низом і без заливки: це не крок
          роботи, і поруч із «зберегти» його читали б як ще одну звичайну
          кнопку. */}
      <button
        type="button"
        className="wb-btn wb-btn-ghost shop-order-delete"
        onClick={() => void removeOrder()}
      >
        <Icon name="trash" size={16} />
        Прибрати замовлення
      </button>
    </div>
  );
}
