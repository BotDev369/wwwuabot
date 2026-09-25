/**
 * Оформлення замовлення — останній крок кошика.
 *
 * **Поля залежать від кошика, а не від форми.** Фізичному товару потрібна
 * адреса, цифровому — канал (`orderContactFields`): адреса цифровому товару
 * була б полем, якого ніхто не читає. Змішане замовлення питає адресу, бо
 * фізичній частині її нікуди подіти (`docs/SHOPS.md` §6).
 *
 * **Ціни тут немає — і покупець її не називає.** Клієнт надсилає лише номери
 * товарів і кількості; назву, ціну й вид бере база на момент замовлення
 * (знімок позиції). Інакше ціну називав би той, хто купує.
 *
 * **Після надсилання форма каже, куди дивитись.** Замовлення відкриває розмову
 * з продавцем (§8), і саме там його читають обоє — тож замість порожнього
 * «Готово» покупець бачить номер замовлення й те, що́ буде далі.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  EMPTY_ORDER_CART,
  ORDER_NOTE_MAX,
  cartLines,
  cartNeedsShipping,
  orderContactFields,
  type CartLine,
  type OrderContact,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

export interface ShopCheckoutModalProps {
  shopSlug: string;
  lines: CartLine[];
  products: ShopProduct[];
  onClose: () => void;
  /** Замовлення прийнято — кошик більше не потрібен. */
  onPlaced: () => void;
}

export function ShopCheckoutModal({
  shopSlug,
  lines,
  products,
  onClose,
  onPlaced,
}: ShopCheckoutModalProps): ReactElement {
  const fields = orderContactFields(cartNeedsShipping(lines, products));

  const [contact, setContact] = useState<OrderContact>({});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [placedId, setPlacedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(): Promise<void> {
    if (sending) return;

    const items = cartLines(lines, products);
    if (items.length === 0) {
      setError(EMPTY_ORDER_CART);
      return;
    }

    setSending(true);
    setError(null);
    try {
      const order = await shopApi.placeOrder(shopSlug, { items, contact, note });
      setPlacedId(order.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Не вдалося надіслати замовлення");
    } finally {
      setSending(false);
    }
  }

  if (placedId !== null) {
    return (
      <MenuModal
        title="Замовлення надіслано"
        onClose={onPlaced}
        content={
          <div className="shop-order-sent">
            <span className="shop-order-sent-icon">
              <Icon name="check" size={28} />
            </span>
            <p>Замовлення №{placedId} прийнято — продавець його бачить.</p>
            <p className="wb-text-muted">
              Розмова з продавцем уже відкрита: там видно, як рухається замовлення, і туди продавець
              напише про оплату.
            </p>
            <button type="button" className="wb-btn wb-btn-secondary" onClick={onPlaced}>
              Готово
            </button>
          </div>
        }
      />
    );
  }

  return (
    <MenuModal
      title="Оформлення"
      onClose={onClose}
      content={
        <div className="shop-order-form">
          {fields.map((field) => (
            <div className="wb-field" key={field.key}>
              <label className="wb-label" htmlFor={`shop-checkout-${field.key}`}>
                {field.label}
              </label>
              <input
                id={`shop-checkout-${field.key}`}
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
            <label className="wb-label" htmlFor="shop-checkout-note">
              Примітка
            </label>
            <textarea
              id="shop-checkout-note"
              className="wb-textarea"
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

          <p className="wb-text-muted shop-note">
            Оплата — домовленість із продавцем: платформа замовлення зберігає, а гроші не бере.
          </p>
        </div>
      }
    />
  );
}
