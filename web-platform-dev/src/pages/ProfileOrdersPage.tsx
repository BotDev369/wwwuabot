/**
 * «Замовлення» — вхід у роботу магазинів, які веде людина.
 *
 * **Екран відповідає на питання «де я працюю», а не показує замовлення вдруге.**
 * Замовлення живуть під своїм магазином (`/pages/:id/orders`): там статуси,
 * позиції й контакт покупця — один перелік роботи, а не два. Другого списку з
 * тим самим вмістом не заводимо; тут лишається те, чого ніде не було видно:
 * **у яких магазинах людина має доступ** — власник вона чи адмін.
 *
 * **Чому це потрібно саме адміну.** Його сторінка чужа: у списку «Сторінки»
 * вона з'являється тому, що він її **веде** (`scenarios.admin_ids`), але шукати
 * там магазин, щоб побачити замовлення, — це шлях навмання. Профіль знає про
 * людину, тож питання «де моя робота» стоїть тут (`AGENTS.md` §8).
 *
 * **Магазини — з того самого списку сторінок** (`useUserPages`), і це не
 * економія: другого джерела «мої магазини» не існує, а фільтр за шаблоном
 * (`template === "shop"`) уже несе та сама відповідь.
 *
 * @module web-platform-dev/src/pages/ProfileOrdersPage
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { shopOrdersPath } from "@/app/routes";
import { useUserPages } from "@/pages/user-pages/useUserPages";

export function ProfileOrdersPage(): ReactElement {
  useScreenChrome({ title: "Замовлення" });
  const navigate = useNavigate();
  const { pages, loading, error } = useUserPages();
  const shops = pages.filter((page) => page.template === "shop");

  return (
    <div className="wb-page">
      {loading && (
        <div className="wb-empty">
          <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
          <p className="wb-text-muted">Завантаження…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && shops.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="shop" size={32} />
          </span>
          <p className="wb-empty-text">Магазинів у вас немає.</p>
          {/* Порожній екран каже, як його закрити: без цього «немає замовлень»
              читалось би як поламане завантаження. */}
          <p className="wb-empty-text">
            Магазин створюють зі шаблону «Магазин», а замовлення з'являються тут, коли його товар
            купують. Якщо магазин веде хтось інший — хай додасть вас адміном у налаштуваннях своєї
            сторінки.
          </p>
        </div>
      )}

      {!loading && !error && shops.length > 0 && (
        <div className="wb-menu-list">
          {shops.map((shop) => (
            <button
              key={shop.id}
              type="button"
              className="wb-menu-item"
              onClick={() => void navigate(shopOrdersPath(shop.id))}
            >
              <span className="wb-menu-item-icon">
                <Icon name="tag" size={20} />
              </span>
              <span className="wb-menu-item-text">
                <span className="wb-menu-item-label">{shop.title}</span>
                <span className="wb-menu-item-hint">
                  {shop.role === "owner" ? "Ви власник" : "Ви адміністратор"}
                </span>
              </span>
              <span className="wb-menu-item-icon">
                <Icon name="chevron-right" size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
