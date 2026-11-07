/**
 * «Сторінки» — **два погляди на ту саму сутність**: «Мої» (якими володіє
 * людина) і «Публічні» (чужі, які автори відкрили).
 *
 * **Обидва — рядки `scenarios`, тож екран один.** Розвести їх у дві адреси
 * означало б завести другу навігацію по тому самому контенту; тому вибір —
 * вкладки на всю ширину (спільний `Tabs`), а не два пункти списку сервісів.
 *
 * **Рядок відкриває перегляд** (`/pages/:id`) — там і перемикач, і видалення: у
 * списку з одним дотиком на рядок друга дія змушувала б угадувати, котра з
 * двох спрацювала.
 *
 * **Створення тут немає.** Нові сторінки заводить платформа: людина веде те,
 * що їй дали, і не може додати собі рядок. Тому ні «+», ні `/pages/new` тут не
 * лишилось — лише список і перегляд.
 * @module web-platform-dev/src/pages/user-pages
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { userPagePath } from "@/app/routes";
import { Tabs, tabId, tabPanelId } from "@wwwuabot/ui/tabs";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { PublicPagesTab } from "./PublicPagesTab";
import { DEFAULT_PAGES_VIEW, PAGES_VIEWS, type PagesView } from "./pages-tabs";
import { pageHint, pageTemplateIcon } from "./pages-view";
import { useUserPages } from "./useUserPages";

export function UserPagesPage(): ReactElement {
  useScreenChrome({ title: "Сторінки" });
  const navigate = useNavigate();
  const [view, setView] = useState<PagesView>(DEFAULT_PAGES_VIEW);
  const { pages, loading, error } = useUserPages();

  return (
    <div className="wb-page">
      {/* Два погляди — двома рівними половинами рядка: обидва видно одразу, і
          планка пальця в кожного своя. Смугу складає спільний кирпичик. */}
      <Tabs options={PAGES_VIEWS} value={view} onChange={setView} label="Погляд на сторінки" />

      <div id={tabPanelId(view)} role="tabpanel" aria-labelledby={tabId(view)}>
        {view === "public" ? (
          <PublicPagesTab />
        ) : (
          <>
            {loading && (
              <div className="wb-empty">
                <div className="wb-skeleton" style={{ width: 160, height: 20 }} />
                <p className="wb-text-muted">Завантаження сторінок…</p>
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

            {!loading && !error && pages.length === 0 && (
              <div className="wb-empty">
                <span className="wb-empty-icon">
                  <Icon name="page" size={32} />
                </span>
                <p className="wb-empty-text">Ще немає жодної сторінки.</p>
                {/* Порожній екран без пояснення читався б як поломка, тож
                    кажемо, звідки сторінка береться тепер. */}
                <p className="wb-empty-text">
                  Сторінки заводить платформа. Коли ваша сторінка з'явиться, вона буде тут.
                </p>
              </div>
            )}

            {!loading && !error && pages.length > 0 && (
              <div className="wb-menu-list">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    className="wb-menu-item"
                    onClick={() => void navigate(userPagePath(page.id))}
                  >
                    <span className="wb-menu-item-icon">
                      <Icon name={pageTemplateIcon(page.template)} size={20} />
                    </span>
                    <span className="wb-menu-item-text">
                      <span className="wb-menu-item-label">{page.title}</span>
                      <span className="wb-menu-item-hint">{pageHint(page)}</span>
                    </span>
                    <span className="wb-menu-item-icon">
                      <Icon name="chevron-right" size={18} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
