/**
 * Кошик — те, що покупець набрав, із можливістю це змінити.
 *
 * **Рядок кошика — товар, а не позиція замовлення.** У замовленні лежить знімок
 * (назва й ціна на момент покупки), і показувати знімок тут означало б
 * заморозити ціну ще до замовлення: продавець її змінить, а покупець
 * побачить стару. Тому рядок складається з **живого** товару, а сума — з
 * поточних цін (`cartTotal`).
 *
 * **Товар, якого більше немає, зникає з кошика тут же** (`cartProducts`): тримати
 * в кошику те, чого в магазині вже нема, — це обіцяти продаж, якого не буде, а
 * сервер таке замовлення відхилить цілком.
 *
 * **Порожній кошик — це стан, а не помилка.** Він каже, що́ робити далі, і не
 * дає кнопки, яка однаково нічого не надішле.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  ORDER_QTY_MAX,
  cartProducts,
  cartTotal,
  mediaUrl,
  productCover,
  productPriceLabel,
  type CartLine,
  type ShopMedia,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { cartTotalLabel, foundLabel } from "./store-view";

export interface ShopCartModalProps {
  lines: CartLine[];
  products: ShopProduct[];
  media: ShopMedia[];
  onClose: () => void;
  onSetQty: (productId: number, qty: number) => void;
  onRemove: (productId: number) => void;
  onCheckout: () => void;
}

export function ShopCartModal({
  lines,
  products,
  media,
  onClose,
  onSetQty,
  onRemove,
  onCheckout,
}: ShopCartModalProps): ReactElement {
  const filled = cartProducts(lines, products);
  const total = cartTotal(lines, products);

  return (
    <MenuModal
      title="Кошик"
      onClose={onClose}
      content={
        <div className="shop-order-form">
          {filled.length === 0 ? (
            <p className="wb-text-muted shop-note">
              Кошик порожній. Оберіть товар у каталозі — він зʼявиться тут.
            </p>
          ) : (
            <>
              <p className="wb-text-muted shop-note">{foundLabel(filled.length)}</p>

              {filled.map((product) => {
                const line = lines.find((entry) => entry.productId === product.id);
                const qty = line?.qty ?? 1;
                const cover = productCover(product, media);

                return (
                  <div className="shop-product-row" key={product.id}>
                    <span className="shop-thumb">
                      {cover ? (
                        <img className="shop-thumb-img" src={mediaUrl(cover.key)} alt="" />
                      ) : (
                        <Icon name="image" size={18} />
                      )}
                    </span>

                    <div className="shop-cart-line-body">
                      <span className="shop-cart-line-title">{product.title}</span>
                      <span className="wb-text-muted shop-cart-line-price">
                        {productPriceLabel(product.price)}
                      </span>
                    </div>

                    <div className="shop-qty">
                      <button
                        type="button"
                        className="shop-qty-btn"
                        onClick={() => onSetQty(product.id, qty - 1)}
                        aria-label="Менше"
                      >
                        <Icon name="minus" size={14} />
                      </button>
                      <span className="shop-qty-value">{qty}</span>
                      <button
                        type="button"
                        className="shop-qty-btn"
                        onClick={() => onSetQty(product.id, Math.min(ORDER_QTY_MAX, qty + 1))}
                        aria-label="Більше"
                      >
                        <Icon name="plus" size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="wb-close-btn"
                      onClick={() => onRemove(product.id)}
                      aria-label="Прибрати з кошика"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                );
              })}

              <div className="shop-attr">
                <span className="shop-attr-name wb-text-muted">Разом</span>
                <span>{cartTotalLabel(total)}</span>
              </div>

              <button type="button" className="wb-btn wb-btn-primary" onClick={onCheckout}>
                <Icon name="check" size={16} />
                Оформити замовлення
              </button>
            </>
          )}
        </div>
      }
    />
  );
}
