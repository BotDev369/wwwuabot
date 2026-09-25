/**
 * Замовити товар — форма покупця під вітриною.
 *
 * **Поля залежать від виду товару, а не від форми.** Фізичний питає адресу,
 * цифровий — куди надіслати (`orderContactFields`): адреса цифровому товару
 * була б полем, якого ніхто не читає (`docs/SHOPS.md` §6). Тому перелік полів
 * тут **не перелічений**, а питається в спільного правила.
 *
 * **Ціни тут немає — і покупець її не називає.** Клієнт надсилає лише номер
 * товару й кількість; назву, ціну й вид бере база на момент замовлення
 * (знімок позиції). Інакше ціну називав би той, хто купує.
 *
 * **Після надсилання форма каже, куди дивитись.** Замовлення відкриває розмову
 * з продавцем (§8), і саме там його читають обоє — тож замість порожнього
 * «Готово» покупець бачить, що́ станеться далі.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  ORDER_NOTE_MAX,
  ORDER_QTY_MAX,
  orderContactFields,
  productKindNeedsShipping,
  productPriceLabel,
  type OrderContact,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

interface ShopOrderFormProps {
  product: ShopProduct;
  shopSlug: string;
  onClose: () => void;
}

export function ShopOrderForm({ product, shopSlug, onClose }: ShopOrderFormProps): ReactElement {
  const fields = orderContactFields(productKindNeedsShipping(product.kind));

  const [contact, setContact] = useState<OrderContact>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(): Promise<void> {
    if (sending) return;
    setSending(true);
    setError(null);

    try {
      await shopApi.placeOrder(shopSlug, {
        items: [{ productId: product.id, qty }],
        contact,
        note,
      });
      setSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося надіслати замовлення");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <MenuModal
        title="Замовлення надіслано"
        onClose={onClose}
        content={
          <div className="shop-order-sent">
            <span className="shop-order-sent-icon">
              <Icon name="check" size={28} />
            </span>
            <p>Продавець бачить замовлення й відповість у повідомленнях.</p>
            <p className="wb-text-muted">
              Розмова з продавцем уже відкрита — там видно, як рухається замовлення.
            </p>
            <button type="button" className="wb-btn wb-btn-secondary" onClick={onClose}>
              Закрити
            </button>
          </div>
        }
      />
    );
  }

  return (
    <MenuModal
      title="Замовити"
      onClose={onClose}
      content={
        <div className="shop-order-form">
          <p className="shop-order-form-title">{product.title}</p>
          <p className="wb-text-muted">{productPriceLabel(product.price)}</p>

          <div className="wb-field">
            <label className="wb-label" htmlFor="shop-order-qty">
              Кількість
            </label>
            <input
              id="shop-order-qty"
              className="wb-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={ORDER_QTY_MAX}
              value={qty}
              onChange={(event) => setQty(clampQty(event.target.value))}
            />
          </div>

          {fields.map((field) => (
            <div className="wb-field" key={field.key}>
              <label className="wb-label" htmlFor={`shop-order-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`shop-order-${field.key}`}
                className="wb-input"
                maxLength={field.max}
                value={contact[field.key] ?? ""}
                onChange={(event) =>
                  setContact((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
            </div>
          ))}

          <div className="wb-field">
            <label className="wb-label" htmlFor="shop-order-note">
              Примітка
            </label>
            <textarea
              id="shop-order-note"
              className="wb-input"
              rows={3}
              maxLength={ORDER_NOTE_MAX}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {error && <p className="wb-text-red">{error}</p>}

          <button
            type="button"
            className="wb-btn wb-btn-primary"
            disabled={sending}
            onClick={() => void send()}
          >
            <Icon name="check" size={16} />
            {sending ? "Надсилаємо…" : "Надіслати замовлення"}
          </button>

          {/* Оплата — не тут, і це не недогляд: гроші лишаються поза
              платформою, тож обіцяти їх формою не можна (§9). */}
          <p className="wb-text-muted shop-note">
            Оплата — домовленість із продавцем: платформа замовлення зберігає, а гроші не бере.
          </p>
        </div>
      }
    />
  );
}

/** Кількість у межах, які витримує кошик: 1…`ORDER_QTY_MAX`. */
function clampQty(raw: string): number {
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, ORDER_QTY_MAX);
}
