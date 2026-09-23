/**
 * «Сторінки» — вкладка Простору: сторінки, які автори відкрили для всіх.
 *
 * **Це друга половина перемикача «публічно / приватно».** Без неї прапорець
 * нічого не робив би назовні: сторінка ставала б видимою лише тому, хто знає
 * адресу, а «публічне» в продукті означає саме стрічку (`docs/SPACE.md`).
 *
 * **Рядок веде на адресу сторінки** (`/slug`), а не в чужий редактор: чужу
 * сторінку читають. Рендерить її той самий `ScenarioPage`, що й будь-яку іншу
 * — сторінка людини не окремий вид контенту.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import { pageAddressLabel, pageTemplateIcon, publicPageAuthor } from "./pages-view";
import { useSpacePages } from "./useSpacePages";

export function SpacePagesTab(): ReactElement {
  const navigate = useNavigate();
  const { pages, loading, error, reload } = useSpacePages();

  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
        <p className="wb-text-muted">Завантаження сторінок…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="warning" size={32} />
        </span>
        <p className="wb-text-red">{error}</p>
        <button type="button" className="wb-btn wb-btn-secondary" onClick={() => reload(true)}>
          <Icon name="refresh" size={16} />
          Спробувати ще раз
        </button>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="wb-empty">
        <span className="wb-empty-icon">
          <Icon name="layout" size={32} />
        </span>
        <p className="wb-empty-text">Поки ніхто не опублікував сторінку.</p>
        {/* Кажемо, як сюди потрапляють: без цього порожня вкладка — глухий кут. */}
        <p className="wb-empty-text">
          Сторінка з'являється тут, щойно її автор увімкне «Публічна сторінка».
        </p>
      </div>
    );
  }

  return (
    <div className="wb-menu-list">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          className="wb-menu-item"
          onClick={() => void navigate(toWebPath(page.slug))}
        >
          <span className="wb-menu-item-icon">
            <Icon name={pageTemplateIcon(page.template)} size={20} />
          </span>
          <span className="wb-menu-item-text">
            <span className="wb-menu-item-label">{page.title}</span>
            <span className="wb-menu-item-hint">
              {publicPageAuthor(page)} · {pageAddressLabel(page)}
            </span>
          </span>
          {/* Шеврон — тим самим кирпичиком, що в решти рядків Простору
              (`MenuItem.trailing`): сторінка веде далі, і ознака переходу
              мусить бути одна на всі списки розділу. */}
          <span className="wb-menu-item-more">
            <Icon name="chevron-right" size={18} />
          </span>
        </button>
      ))}
    </div>
  );
}
