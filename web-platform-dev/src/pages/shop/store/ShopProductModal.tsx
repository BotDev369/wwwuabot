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
 * **Стан «у кошику» видно в самій картці.** Кількість береться **з кошика**, а не
 * з локального стану, коли товар уже додано: інакше кнопка пропонувала б додати
 * те, що вже додане, а число в ній розходилось би з плиткою вітрини. Мінус на
 * одиниці при цьому **прибирає позицію** — те саме правило, що в плитці, — а
 * кнопка стає наступним кроком: «Перейти до кошика».
 *
 * **Порядок картки — це порядок рішення.** Спершу те, за чим товар вибирають
 * (фото, ціна, характеристики), далі те, що читають за бажанням (опис
 * розділами), і в кінці дія. Тому характеристики стоять **під ціною**, а не в
 * кінці: у списку внизу вони відповідали на те саме питання, тільки після
 * п'яти екранів тексту. Смуга покупки при цьому липне до низу аркуша —
 * до кнопки доходять, не дочитуючи опис.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  ORDER_QTY_MAX,
  cartLineLabel,
  mediaUrl,
  productKindLabel,
  productPhotos,
  productPriceLabel,
  type ShopMedia,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { detailSections, detailValues } from "./store-view";

export interface ShopProductModalProps {
  product: ShopProduct;
  media: ShopMedia[];
  /**
   * Скільки одиниць товару вже в кошику; `0` — товару в кошику немає.
   *
   * Звідси береться стан смуги покупки: картка показує те саме, що й плитка
   * вітрини, — інакше вона пропонувала б додати те, що вже додане.
   */
  inCart?: number;
  onClose: () => void;
  /** Додати в кошик; кількість уже вибрана тут. */
  onAdd: (qty: number) => void;
  /** Поставити кількість у кошику; `0` прибирає позицію. */
  onSetQty?: (qty: number) => void;
  /** Показати кошик — наступний крок, коли товар уже в ньому. */
  onOpenCart?: () => void;
}

export function ShopProductModal({
  product,
  media,
  inCart = 0,
  onClose,
  onAdd,
  onSetQty,
  onOpenCart,
}: ShopProductModalProps): ReactElement {
  const photos = productPhotos(product, media);
  const detail = detailSections(product.description);
  // Перший розділ **із назвою** їде розкритим: вступ читають завжди, а далі
  // покупець розкриває те, за чим прийшов.
  const firstTitled = detail.findIndex((section) => section.title !== "");
  const [picked, setPicked] = useState(0);
  const [qty, setQty] = useState(1);

  // Товар уже в кошику — тоді лічильник править **кошик**, а не локальну
  // кількість, і мінус на одиниці прибирає позицію (як у плитці вітрини).
  const cartQty = inCart > 0 && onSetQty ? inCart : 0;
  const units = cartQty > 0 ? cartQty : qty;
  const setUnits = cartQty > 0 && onSetQty ? onSetQty : setQty;
  // Сума позиції — тим самим підписом, що в плитці (`cartLineLabel`):
  // копійки в ціні мусять бути видні в обох місцях однаково.
  const line = cartQty > 0 ? cartLineLabel(product.price, cartQty) : null;

  // Фото могло не бути зовсім — тоді місце під нього тримає рамка, а не
  // порожній рядок: картка без знімка не мусить виглядати зламаною.
  const cover = photos[picked] ?? photos[0] ?? null;

  return (
    <MenuModal
      title={product.title}
      onClose={onClose}
      content={
        <div className="shop-order-form shop-detail">
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

          {/* Ціна, вид і короткий опис — один вступ, а не три різні абзаци:
              покупець читає їх разом, перш ніж гортати опис. */}
          <div className="shop-detail-lead">
            <span className="shop-detail-price">{productPriceLabel(product.price)}</span>
            <span className="shop-detail-kind wb-text-muted">{productKindLabel(product.kind)}</span>
            {product.summary && <span className="shop-detail-summary">{product.summary}</span>}
          </div>

          {/* Характеристики — одразу за ціною, а не в кінці картки: за ними
              покупець і вирішує, а опис тоді не мусить казати те саме
              другими словами (він і не каже — §3 `docs/SHOPS.md`). */}
          {product.attributes.length > 0 && (
            <dl className="shop-detail-attrs">
              {product.attributes.map((attribute) => {
                const values = detailValues(attribute.value);
                return (
                  <div className="shop-detail-attr" key={attribute.name}>
                    <dt className="shop-detail-attr-name wb-text-muted">{attribute.name}</dt>
                    <dd className="shop-detail-attr-value">
                      {values.length > 0 ? (
                        <span className="shop-detail-chips">
                          {values.map((value) => (
                            <span className="shop-detail-chip" key={value}>
                              {value}
                            </span>
                          ))}
                        </span>
                      ) : (
                        attribute.value
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          {/* Опис описаний як текст із заголовками й пунктами — розділи тут
              малює розмітка (див. `detailSections`). Розділ із назвою
              згортається: опис на п'ять екранів читають не цілком, а вступ і
              перший розділ лишаються перед очима. */}
          {detail.length > 0 && (
            <div className="shop-modal-desc shop-detail-sections">
              {detail.map((section, index) => {
                const body = (
                  <>
                    {section.paragraphs.map((paragraph) => (
                      <p className="shop-detail-text" key={paragraph}>
                        {paragraph}
                      </p>
                    ))}
                    {section.items.length > 0 && (
                      <ul className="shop-detail-list">
                        {section.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </>
                );

                // Розділ без назви — вступ: у ньому згортати нічого.
                return section.title ? (
                  <details
                    className="shop-detail-section"
                    key={`${index}-${section.title}`}
                    open={index === firstTitled}
                  >
                    <summary className="shop-detail-heading">
                      {section.title}
                      <span className="shop-detail-chevron">
                        <Icon name="chevron-down" size={16} />
                      </span>
                    </summary>
                    {body}
                  </details>
                ) : (
                  <div className="shop-detail-section" key={`${index}-${section.title}`}>
                    {body}
                  </div>
                );
              })}
            </div>
          )}

          {/* Оплата — не тут, і це не недогляд: гроші лишаються поза
              платформою, тож обіцяти їх формою не можна (§9). Примітка стоїть
              **над** липкою смугою, у потоці: прочитати її треба до дотику, а
              в самій смузі вона забрала б третину екрана. */}
          <p className="wb-text-muted shop-note shop-detail-note">
            Оплата — домовленість із продавцем: платформа замовлення зберігає, а гроші не бере.
          </p>

          {/* Смуга покупки липне до низу аркуша: до кнопки доходять, не
              дочитуючи опис (див. `.shop-detail-buy`). */}
          <div className="shop-detail-buy">
            <div className="shop-detail-buy-row">
              <span className="shop-detail-buy-price">{productPriceLabel(product.price)}</span>

              <div className="shop-qty">
                <button
                  type="button"
                  className="shop-qty-btn"
                  onClick={() => setUnits(Math.max(cartQty > 0 ? 0 : 1, units - 1))}
                  aria-label="Менше"
                >
                  <Icon name="minus" size={16} />
                </button>
                <span className="shop-qty-value">{cartQty > 0 ? `${units} шт` : units}</span>
                <button
                  type="button"
                  className="shop-qty-btn"
                  onClick={() => setUnits(Math.min(ORDER_QTY_MAX, units + 1))}
                  aria-label="Більше"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
            </div>

            {line !== null && (
              <p className="shop-detail-incart">
                <Icon name="check" size={13} />У кошику · {line}
              </p>
            )}

            {cartQty > 0 && onOpenCart ? (
              <button type="button" className="wb-btn wb-btn-primary" onClick={onOpenCart}>
                <Icon name="cart" size={16} />
                Перейти до кошика
              </button>
            ) : (
              <button type="button" className="wb-btn wb-btn-primary" onClick={() => onAdd(qty)}>
                <Icon name="cart" size={16} />
                Додати в кошик
              </button>
            )}
          </div>
        </div>
      }
    />
  );
}
