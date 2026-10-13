/**
 * «Публічні» — друга половина екрана «Сторінки»: сторінки, які автори
 * відкрили для всіх.
 *
 * **Це друга половина перемикача «публічно / приватно».** Без неї прапорець
 * нічого не робив би назовні: сторінка ставала б видимою лише тому, хто знає
 * адресу, а «публічне» в продукті означає саме спільний список
 * (`docs/PAGES.md`).
 *
 * **Смуга керування стоїть другим рядком** — як у кожному списку продукту:
 * перший рядок — вибір «Мої / Публічні», другий — пошук, далі — список.
 *
 * **Рядок веде на адресу сторінки** (`/slug`), а не в чужий редактор: чужу
 * сторінку читають. Рендерить її той самий `ScenarioPage`, що й будь-яку іншу
 * — сторінка людини не окремий вид контенту.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { toWebPath } from "@wwwuabot/shared/content";
import { ListEmpty } from "../ListEmpty";
import { ListToolbar } from "../ListToolbar";
import { DEFAULT_LIST_VIEW, LIST_CLASS, filterByQuery, type ListView } from "../list-view";
import { pageAddressLabel, publicPageAuthor } from "./pages-view";
import { usePublicPages } from "./usePublicPages";

export function PublicPagesTab(): ReactElement {
  const navigate = useNavigate();
  const { pages, loading, error, reload } = usePublicPages();
  const [view, setView] = useState<ListView>(DEFAULT_LIST_VIEW);

  // Шукаємо за тим, що видно в рядку: назва, автор і адреса — усе це написано
  // під назвою сторінки.
  const visible = filterByQuery(pages, view.query, (page) => [
    page.title,
    publicPageAuthor(page),
    pageAddressLabel(page),
  ]);
  const change = (patch: Partial<ListView>): void => setView((prev) => ({ ...prev, ...patch }));
  const hasItems = !loading && !error && pages.length > 0;

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
          <Icon name="page" size={32} />
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
    <>
      <ListToolbar
        view={view}
        onChange={change}
        searchLabel="Пошук за назвою, автором або адресою"
        shown={visible.length}
        total={pages.length}
      />

      {hasItems && visible.length === 0 ? (
        <ListEmpty onReset={() => change(DEFAULT_LIST_VIEW)} />
      ) : (
        <div className={LIST_CLASS}>
          {visible.map((page) => (
            <button
              key={page.id}
              type="button"
              className="wb-menu-item"
              onClick={() => void navigate(toWebPath(page.slug))}
            >
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
      )}
    </>
  );
}
