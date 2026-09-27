/**
 * Позиції замовлення — картка, у якій їх міняють.
 *
 * **Кількість міняють там само, де її бачать.** Окрема форма позиції зробила б із
 * правки подорож у два екрани, а між ними — замовлення, яке вже поїхало б у
 * чергу з половиною змін.
 *
 * **Додають лише те, чого ще немає.** Товар, який уже стоїть позицією, у списку
 * додавання не повторюється (`addableProducts`): другу таку саму продавець
 * ставить кроком кількості в тій самій позиції — те саме правило, що в кошику
 * покупця.
 *
 * **Рядок без номера товару лишається читаним, але нередагованим.** Такий
 * спадок давнішого запису адресувати нічим: ані кількості, ані прибирання, — і
 * мовчазно прибрати його не можна.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { ORDER_QTY_MAX, productPriceLabel, type ShopProduct } from "@wwwuabot/shared/shop";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";
import { productStateLabel } from "./shop-view";
import { type EditableOrderItem } from "./order-view";

export interface ShopOrderItemsCardProps {
  items: readonly EditableOrderItem[];
  /** Товари магазину, яких у замовленні ще немає. */
  available: readonly ShopProduct[];
  /** Чи є в магазині товари взагалі — від цього залежить пояснення порожнечі. */
  shopHasProducts: boolean;
  onQty: (productId: number, qty: number) => void;
  onDrop: (productId: number) => void;
  onAdd: (product: ShopProduct) => void;
}

export function ShopOrderItemsCard({
  items,
  available,
  shopHasProducts,
  onQty,
  onDrop,
  onAdd,
}: ShopOrderItemsCardProps): ReactElement {
  const [picking, setPicking] = useState(false);

  const pickItems: MenuItem[] = available.map((product) => ({
    key: String(product.id),
    label: `${product.title} · ${productPriceLabel(product.price)}`,
    // Підписуємо лише чернетку: «у каталозі» — стан за замовчуванням, і писати
    // його в кожному рядку означало б підписувати більшість ні про що.
    ...(product.isActive ? {} : { hint: productStateLabel(product) }),
    onSelect: () => {
      setPicking(false);
      onAdd(product);
    },
  }));

  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="wb-card-title">
          <Icon name="cart" size={16} />
          Позиції
        </span>
      </div>
      <div className="wb-card-body">
        <div className="shop-items">
          {items.map((item, index) => (
            <div className="shop-item" key={item.productId ?? `legacy-${index}`}>
              <span className="shop-item-text">
                <span className="shop-item-title">{item.title}</span>
                <span className="wb-text-muted shop-item-hint">
                  {productPriceLabel(item.price)}
                  {item.isNew && " · Нова позиція"}
                </span>
              </span>

              {item.productId !== null && (
                <span className="shop-item-side">
                  <span className="shop-item-qty">
                    <button
                      type="button"
                      className="shop-item-qty-btn"
                      aria-label={`Менше: ${item.title}`}
                      disabled={item.qty <= 1}
                      onClick={() => onQty(item.productId as number, item.qty - 1)}
                    >
                      <Icon name="minus" size={16} />
                    </button>
                    <span className="shop-item-qty-value">{item.qty}</span>
                    <button
                      type="button"
                      className="shop-item-qty-btn"
                      aria-label={`Більше: ${item.title}`}
                      disabled={item.qty >= ORDER_QTY_MAX}
                      onClick={() => onQty(item.productId as number, item.qty + 1)}
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </span>
                  <button
                    type="button"
                    className="shop-item-remove"
                    aria-label={`Прибрати: ${item.title}`}
                    onClick={() => onDrop(item.productId as number)}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>

        {available.length > 0 ? (
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={() => setPicking(true)}
          >
            <Icon name="plus" size={16} />
            Додати позицію
          </button>
        ) : (
          <p className="wb-text-muted shop-note">
            {shopHasProducts
              ? "Усі товари магазину вже в замовленні."
              : "У магазині ще немає товарів — позицію нема з чого додати."}
          </p>
        )}
      </div>

      {picking && (
        <MenuModal title="Додати позицію" items={pickItems} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}
