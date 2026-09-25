/**
 * Товар цілком — поверхня, яку відкриває дотик по картці каталогу.
 *
 * **Чому поверхня, а не сторінка.** У товару немає власної адреси: він живе
 * хвостом адреси магазину (`docs/SHOPS.md` §2), і покупець не мусить виходити
 * з вітрини, щоб подивитись одну річ: каталог лишається за спиною, «закрити»
 * вертає туди ж, звідки прийшли.
 *
 * **Фото показуються всі, які є.** Головне стоїть великим, решта — смугою під
 * ним: у товару буває кілька знімків, і обирати з них «найкращий» — це рішення
 * продавця (`images[0]`), а не показу.
 *
 * **Кількість тут, а не в кошику.** Скільки взяти — питання про товар, і саме
 * тому лічильник стоїть поруч із ціною; у кошику кількість лише правлять.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  ORDER_QTY_MAX,
  mediaUrl,
  productKindLabel,
  productPhotos,
  productPriceLabel,
  type ShopMedia,
  type ShopProduct,
} from "@wwwuabot/shared/shop";

export interface ShopProductModalProps {
  product: ShopProduct;
  media: ShopMedia[];
  onClose: () => void;
  /** Додати в кошик; кількість уже вибрана тут. */
  onAdd: (qty: number) => void;
}

export function ShopProductModal({
  product,
  media,
  onClose,
  onAdd,
}: ShopProductModalProps): ReactElement {
  const photos = productPhotos(product, media);
  const [picked, setPicked] = useState(0);
  const [qty, setQty] = useState(1);

  // Фото могло не бути зовсім — тоді місце під нього тримає рамка, а не
  // порожній рядок: картка без знімка не мусить виглядати зламаною.
  const cover = photos[picked] ?? photos[0] ?? null;

  return (
    <MenuModal
      title={product.title}
      onClose={onClose}
      content={
        <div className="shop-order-form">
          <div className="shop-gallery">
            {cover ? (
              <img className="shop-gallery-img" src={mediaUrl(cover.key)} alt="" />
            ) : (
              <Icon name="image" size={32} />
            )}
          </div>

          {photos.length > 1 && (
            <div className="shop-gallery-thumbs">
              {photos.map((photo, index) => (
                <button
                  type="button"
                  key={photo.id}
                  className={`shop-gallery-thumb${
                    index === picked ? " shop-gallery-thumb--active" : ""
                  }`}
                  onClick={() => setPicked(index)}
                  aria-label={`Фото ${index + 1}`}
                >
                  <img className="shop-thumb-img" src={mediaUrl(photo.key)} alt="" />
                </button>
              ))}
            </div>
          )}

          <p className="shop-order-form-title">{productPriceLabel(product.price)}</p>
          <p className="wb-text-muted shop-note">{productKindLabel(product.kind)}</p>

          {product.summary && <p className="shop-note">{product.summary}</p>}

          {product.description && (
            <p className="shop-note shop-modal-desc">{product.description}</p>
          )}

          {product.attributes.length > 0 && (
            <div>
              {product.attributes.map((attribute) => (
                <div className="shop-attr" key={attribute.name}>
                  <span className="shop-attr-name wb-text-muted">{attribute.name}</span>
                  <span>{attribute.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="shop-qty">
            <button
              type="button"
              className="shop-qty-btn"
              onClick={() => setQty((value) => Math.max(1, value - 1))}
              aria-label="Менше"
            >
              <Icon name="minus" size={16} />
            </button>
            <span className="shop-qty-value">{qty}</span>
            <button
              type="button"
              className="shop-qty-btn"
              onClick={() => setQty((value) => Math.min(ORDER_QTY_MAX, value + 1))}
              aria-label="Більше"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>

          <button type="button" className="wb-btn wb-btn-primary" onClick={() => onAdd(qty)}>
            <Icon name="list" size={16} />
            Додати в кошик
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
