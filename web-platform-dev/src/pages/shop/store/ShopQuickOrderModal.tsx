/**
 * Швидке замовлення — підтвердження без жодного поля.
 *
 * Дані покупця бере сервер із Telegram, телефон та адресу узгоджують у
 * розмові. Підтвердження окремим кроком: людина бачить склад і ціну.
 * @module web-platform-dev/src/pages/shop/store
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  cartLineLabel,
  cartProducts,
  type CartLine,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

export interface ShopQuickOrderModalProps {
  shopSlug: string;
  lines: CartLine[];
  products: ShopProduct[];
  onClose: () => void;
  /** Замовлення прийнято — кошик більше не потрібен. */
  onPlaced: () => void;
}

export function ShopQuickOrderModal({
  shopSlug,
  lines,
  products,
  onClose,
  onPlaced,
}: ShopQuickOrderModalProps): ReactElement {
  const filled = cartProducts(lines, products);
  const [sending, setSending] = useState(false);
  const [placedId, setPlacedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const order = await shopApi.quickOrder(
        shopSlug,
        lines.map((line) => ({ productId: line.productId, qty: line.qty })),
      );
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
              Розмова з продавцем уже відкрита: там узгодите телефон, адресу й оплату.
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
      title="Швидке замовлення"
      onClose={onClose}
      content={
        <div className="shop-order-form">
          {filled.map((product) => {
            const qty = lines.find((line) => line.productId === product.id)?.qty ?? 1;
            return (
              <div className="shop-quick-line" key={product.id}>
                <span>{product.title}</span>
                <span className="wb-text-muted">{cartLineLabel(product.price, qty)}</span>
              </div>
            );
          })}

          <p className="wb-text-muted shop-note">
            Ім'я, @нік і фото візьмемо з Telegram. Телефон та адресу узгодите в чаті з продавцем.
          </p>

          {error && <p className="wb-text-red">{error}</p>}

          <button
            type="button"
            className="wb-btn wb-btn-primary"
            disabled={sending || filled.length === 0}
            onClick={() => void submit()}
          >
            <Icon name="check" size={16} />
            {sending ? "Надсилаємо…" : "Підтвердити замовлення"}
          </button>
        </div>
      }
    />
  );
}
