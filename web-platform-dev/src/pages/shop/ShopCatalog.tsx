/**
 * Каталог магазину — те, що стоїть під вітриною.
 *
 * **Це частина сторінки, а не друга сторінка.** Вітрину дає `page_data` рядка
 * `scenarios`, а товари — окрема таблиця, тож каталог приходить запитом і
 * вкладається в ту саму `main`, що й блоки (`PageRenderer` дістає слот для
 * динамічного вмісту). Інакше під вітриною стояв би другий заголовок `main`, а
 * сторінка мала б два головні розділи.
 *
 * **Порожній каталог нічого не малює.** Сторінка, яка не є магазином, не
 * дістає товарів ніколи — і показувати їй слово «Товари» з порожнім місцем
 * означало б обіцяти те, чого немає. Тому немає ні заголовка, ні підпису: нема
 * товарів — немає й каталогу.
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { mediaUrl } from "@wwwuabot/shared/shop";
import { productCover, productPriceLabel } from "./shop-view";
import { useShopCatalog } from "./useShopCatalog";

export function ShopCatalog({ shopSlug }: { shopSlug: string }): ReactElement | null {
  const { products, media, loading } = useShopCatalog(shopSlug);

  if (loading || products.length === 0) return null;

  return (
    <section className="shop-catalog">
      <h2 className="shop-catalog-title">Товари</h2>
      <div className="shop-catalog-grid">
        {products.map((product) => {
          const cover = productCover(product, media);
          return (
            <article className="shop-card" key={product.id}>
              {cover && (
                <img className="shop-card-img" src={mediaUrl(cover.key)} alt="" loading="lazy" />
              )}
              <h3 className="shop-card-title">{product.title}</h3>
              <p className="shop-card-price">{productPriceLabel(product.price)}</p>
              {product.summary && <p className="shop-card-summary">{product.summary}</p>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
