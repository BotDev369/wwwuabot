/**
 * Картка магазину на перегляді **власної** сторінки — вхід у товари.
 *
 * **Чому вона взагалі потрібна.** Товари лежать не в `page_data`, а в окремій
 * таблиці (`shop_products`, `docs/SHOPS.md` §3), тож сторінка, яка їх не
 * згадує, виглядає як звичайний текст: власник бачив би вітрину й не мав
 * **нізвідки** дізнатись, що в магазину взагалі є товари. Дотик по сторінці
 * нічого не відкриває — це сторінка, а не кнопка, і саме тому вхід мусить
 * стояти окремо.
 *
 * **Дані сюди приходять, а не беруться тут.** Товари читає той самий
 * `useShopProducts`, що й сітка вітрини на цьому ж екрані, і він один на
 * сторінку: другий виклик хука зробив би другий запит по той самий список.
 *
 * **Головна дія — «Додати товар».** Другою стоїть «Усі товари», і вона завжди
 * є: список порожній не тільки до першого товару, а й коли запит не вдався —
 * тоді саме список і несе причину.
 *
 * **Замовлення — окремою кнопкою, а не в товарах.** Вони не про каталог, а про
 * роботу: замовлення приймають, підтверджують і відправляють, і шукати їх у
 * списку товарів означало б шукати лист у переліку конвертів
 * (`pages/shop/ShopOrdersPage`). Кількості тут немає навмисно: за нею стоїть
 * **другий запит** (до `shop_orders`), а картка стоїть на сторінці, яка вже
 * читає товари.
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { shopOrdersPath, shopProductNewPath, shopProductsPath } from "@/app/routes";
import { shopProductsHint } from "./shop-view";

export function ShopPanel({
  pageId,
  loading,
  count,
  error,
}: {
  pageId: number;
  loading: boolean;
  count: number;
  error: string | null;
}): ReactElement {
  const navigate = useNavigate();

  return (
    <div className="wb-card">
      <div className="wb-card-header">
        <span className="wb-card-title">
          <Icon name="shop" size={16} />
          Товари
        </span>
      </div>
      <div className="wb-card-body">
        <p className="wb-text-muted">{error ?? shopProductsHint(loading, count)}</p>

        <div className="wb-sheet-actions">
          <button
            type="button"
            className="wb-btn wb-btn-primary"
            onClick={() => void navigate(shopProductNewPath(pageId))}
          >
            <Icon name="plus" size={16} />
            Додати товар
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={() => void navigate(shopProductsPath(pageId))}
          >
            <Icon name="list" size={16} />
            Усі товари
          </button>
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            onClick={() => void navigate(shopOrdersPath(pageId))}
          >
            <Icon name="tag" size={16} />
            Замовлення
          </button>
        </div>
      </div>
    </div>
  );
}
