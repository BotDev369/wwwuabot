/**
 * «Замовлення» — черга того, що в магазині замовили.
 *
 * **Екран, а не поверхня, і це той самий вибір, що в товарах.** Замовлень буває
 * багато, список потрібно відкрити посиланням і повернутись до нього «назад»; у
 * модалки немає ні історії, ні адреси (`AGENTS.md` §7).
 *
 * **Статус міняється **тут** — і саме кнопками списку статусів магазину.**
 * Замовлення, яке не можна зрушити, — це запис у журналі, а не робота; тому
 * наступний крок робиться тим самим екраном, а не окремою формою. Статуси
 * приходять із сервера (типові з правками магазину), тож кнопки показують
 * **слова магазину**, а не перелік у клієнті (§7).
 *
 * **Позиції беруться зі знімка замовлення.** Назва й ціна в замовленні
 * скопійовані на момент покупки (§6): правка товару заднім числом не має
 * переписувати те, що людина замовила.
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import type { ShopOrder } from "@wwwuabot/shared/shop";
import { useDialog } from "@wwwuabot/ui/dialog";
import { userPagePath } from "@/app/routes";
import { PageState } from "@/pages/user-pages/PageState";
import { useUserPage } from "@/pages/user-pages/useUserPage";
import { orderContactLines, orderHint, orderItemsLine, shopOrdersHint } from "./order-view";
import { useShopOrders } from "./useShopOrders";

export function ShopOrdersPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { page, loading, error } = useUserPage(id);
  const shop = useShopOrders(page?.id ?? null);

  const isShop = page?.template === "shop";

  async function change(order: ShopOrder, status: string): Promise<void> {
    if (status === order.status) return;
    try {
      await shop.setStatus(order.id, status);
    } catch (e: unknown) {
      await dialog.alert(e instanceof Error ? e.message : "Не вдалося змінити статус", {
        title: "Помилка",
      });
    }
  }

  if (!page) {
    return (
      <div className="wb-page">
        <PageState loading={loading} message={error ?? "Такої сторінки немає."} />
      </div>
    );
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">
          <button
            type="button"
            className="wb-close-btn"
            onClick={() => void navigate(userPagePath(page.id))}
            aria-label="Назад"
          >
            <Icon name="arrow-left" size={18} />
          </button>
          Замовлення
        </h1>
      </div>

      {!isShop ? (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-empty-text">Замовлення бувають лише в магазину.</p>
          <p className="wb-empty-text">
            Ця сторінка зібрана з іншого шаблону. Щоб продавати, створіть сторінку з шаблону
            «Магазин».
          </p>
        </div>
      ) : (
        <>
          <p className="wb-text-muted shop-note">
            {shop.error ?? shopOrdersHint(shop.loading, shop.orders.length)}
          </p>

          {shop.orders.map((order) => (
            <article className="shop-order" key={order.id}>
              <div className="shop-order-head">
                <span className="shop-order-id">№{order.id}</span>
                <span className="shop-order-when">{order.createdAt}</span>
              </div>

              <p className="shop-order-items">{orderItemsLine(order)}</p>
              <p className="wb-text-muted shop-order-hint">{orderHint(order, shop.statuses)}</p>

              {orderContactLines(order).map((line) => (
                <p className="shop-order-contact" key={line.label}>
                  <span className="wb-text-muted">{line.label}:</span> {line.value}
                </p>
              ))}

              {order.note && <p className="shop-order-note">{order.note}</p>}

              {/* Кнопки — самі статуси магазину: увімкнені й у тому порядку, у
                  якому їх віддав сервер (стан — підсвічена поточна). */}
              <div className="shop-order-statuses">
                {shop.statuses
                  .filter((status) => status.isActive)
                  .map((status) => (
                    <button
                      key={status.key}
                      type="button"
                      className={
                        status.key === order.status
                          ? "shop-status shop-status--current"
                          : "shop-status"
                      }
                      aria-current={status.key === order.status}
                      onClick={() => void change(order, status.key)}
                    >
                      {status.label}
                    </button>
                  ))}
              </div>
            </article>
          ))}
        </>
      )}
    </div>
  );
}
