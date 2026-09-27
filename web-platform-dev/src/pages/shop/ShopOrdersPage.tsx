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
 * **Чергу ведуть, а не читають.** Зверху стоять два вибори — **статус** і
 * **порядок** — і обидва відкриваються **поверхнею** зі списком (правило 4
 * дизайн-системи: вибір не випадає списком під кнопкою). Число в пункті — це
 * скільки замовлень у цьому статусі: саме за ним видно, куди йти першим.
 *
 * **Колір картки — стан роботи** (`orderStatusTone`), і він той самий, що на
 * екрані одного замовлення: колір належить ключу статусу, а не слову, тож
 * перейменування «Нове» → «Прийнято» фарбу не міняє (§7).
 *
 * **Позиції беруться зі знімка замовлення.** Назва й ціна в замовленні
 * скопійовані на момент покупки (§6): правка товару заднім числом не має
 * переписувати те, що людина замовила.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useMemo, useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { messagesPeerPath } from "@wwwuabot/shared/messages";
import type { ShopOrder } from "@wwwuabot/shared/shop";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";
import { useDialog } from "@wwwuabot/ui/dialog";
import { shopOrderPath, userPagePath } from "@/app/routes";
import { PageState } from "@/pages/user-pages/PageState";
import { useUserPage } from "@/pages/user-pages/useUserPage";
import {
  ORDER_FILTER_ALL,
  ORDER_SORTS,
  filterOrders,
  orderContactLines,
  orderFilterLabel,
  orderFilterOptions,
  orderHint,
  orderItemsLine,
  orderSortLabel,
  orderStatusTone,
  shopOrdersHint,
  sortOrders,
  type OrderSort,
} from "./order-view";
import { useShopOrders } from "./useShopOrders";

export function ShopOrdersPage(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dialog = useDialog();
  const { page, loading, error } = useUserPage(id);
  const shop = useShopOrders(page?.id ?? null);

  // Відбір і порядок живуть **у стані екрана**, а не в адресі: адреса тут — це
  // «які замовлення відкрити», а не «як їх показати» (AGENTS.md §7).
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<OrderSort>("new");
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const isShop = page?.template === "shop";

  const options = useMemo(
    () => orderFilterOptions(shop.orders, shop.statuses),
    [shop.orders, shop.statuses],
  );
  const shown = useMemo(
    () => sortOrders(filterOrders(shop.orders, status), sort, shop.statuses),
    [shop.orders, status, sort, shop.statuses],
  );

  // Пункт вибору — **підпис разом із числом**: «Нове · 3». Число стоїть у
  // підписі, а не стовпцем, бо правий край пункту займає галочка вибраного.
  const filterItems: MenuItem[] = options.map((option) => ({
    key: option.key ?? ORDER_FILTER_ALL,
    label: `${option.label} · ${option.count}`,
    selected: option.key === status,
    onSelect: () => {
      setStatus(option.key);
      setFilterOpen(false);
    },
  }));

  const sortItems: MenuItem[] = ORDER_SORTS.map((key) => ({
    key,
    label: orderSortLabel(key),
    selected: key === sort,
    onSelect: () => {
      setSort(key);
      setSortOpen(false);
    },
  }));

  async function change(order: ShopOrder, next: string): Promise<void> {
    if (next === order.status) return;
    try {
      await shop.setStatus(order.id, next);
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
            {shop.error ?? shopOrdersHint(shop.loading, shown.length, shop.orders.length)}
          </p>

          {/* Керування чергою — **лише коли є що показувати**: два вибори над
              порожнім списком були б керуванням нічим. */}
          {shop.orders.length > 0 && (
            <div className="shop-orders-bar">
              <button
                type="button"
                className="shop-pick"
                aria-haspopup="dialog"
                aria-label={`Статус: ${orderFilterLabel(status, options)}`}
                onClick={() => setFilterOpen(true)}
              >
                <Icon name="filter" size={16} className="shop-pick-icon" />
                <span className="shop-pick-label">{orderFilterLabel(status, options)}</span>
                <Icon name="chevron-down" size={16} className="shop-pick-icon" />
              </button>

              <button
                type="button"
                className="shop-pick"
                aria-haspopup="dialog"
                aria-label={`Порядок: ${orderSortLabel(sort)}`}
                onClick={() => setSortOpen(true)}
              >
                <Icon name="sort" size={16} className="shop-pick-icon" />
                <span className="shop-pick-label">{orderSortLabel(sort)}</span>
                <Icon name="chevron-down" size={16} className="shop-pick-icon" />
              </button>
            </div>
          )}

          {shown.map((order) => (
            <article
              className={`shop-order shop-order--${orderStatusTone(order.status, shop.statuses)}`}
              key={order.id}
            >
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

              {/* Власний коментар видно в самій картці: саме ним продавець
                  згадує, про що домовився, і шукати його в глибині екрана
                  означало б не мати його в черзі взагалі. */}
              {order.sellerNote && (
                <p className="shop-order-mine">
                  <Icon name="edit" size={14} />
                  {order.sellerNote}
                </p>
              )}

              {/* Кнопки — самі статуси магазину: увімкнені й у тому порядку, у
                  якому їх віддав сервер (стан — підсвічена поточна). */}
              <div className="shop-order-statuses">
                {shop.statuses
                  .filter((item) => item.isActive || item.key === order.status)
                  .map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={
                        item.key === order.status
                          ? "shop-status shop-status--current"
                          : "shop-status"
                      }
                      aria-current={item.key === order.status}
                      onClick={() => void change(order, item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
              </div>

              <div className="shop-order-actions">
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary"
                  onClick={() => void navigate(shopOrderPath(page.id, order.id))}
                >
                  <Icon name="edit" size={16} />
                  Відкрити
                </button>
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary"
                  onClick={() => void navigate(messagesPeerPath(order.buyerId))}
                >
                  <Icon name="message-square" size={16} />
                  Написати
                </button>
              </div>
            </article>
          ))}

          {/* Порожній список під відбором — це **не** «немає замовлень»: сказати
              це тим самим словом означало б збрехати про магазин. */}
          {!shop.loading && shop.orders.length > 0 && shown.length === 0 && (
            <p className="wb-text-muted shop-note">
              У статусі «{orderFilterLabel(status, options)}» замовлень немає. Оберіть інший — їхня
              черга вище.
            </p>
          )}
        </>
      )}

      {filterOpen && (
        <MenuModal
          title="Статус"
          header={<p className="wb-menu-hint">Показати замовлення одного статусу</p>}
          items={filterItems}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {sortOpen && (
        <MenuModal
          title="Порядок"
          header={<p className="wb-menu-hint">Як розкласти чергу</p>}
          items={sortItems}
          onClose={() => setSortOpen(false)}
        />
      )}
    </div>
  );
}
