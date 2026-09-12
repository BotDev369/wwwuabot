/**
 * Вкладка «Сторінки»: список сторінок сайту, створення й видалення.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { Icon } from "@wwwuabot/shared";
import type { SiteEditorApi } from "./types";

export function PagesTab({ api }: { api: SiteEditorApi }) {
  const { pages, editingPageSlug, selectPage, addPage, deletePage, saving } = api;

  return (
    <div className="site-editor-tab">
      <div className="wb-flex-between site-editor-tab-head">
        <span className="wb-text-sm wb-text-secondary">Сторінки ({pages.length})</span>
        <button
          type="button"
          className="wb-btn wb-btn-sm wb-btn-primary"
          onClick={() => void addPage()}
          disabled={saving}
        >
          <Icon name="plus" size={14} />
          Додати
        </button>
      </div>

      <div className="site-editor-list">
        {pages.map((page) => (
          <div
            key={page.id}
            className={`wb-card site-editor-item${
              editingPageSlug === page.slug ? " site-editor-item--active" : ""
            }`}
          >
            {/* Кнопка, а не div: на телефоні тапати треба в цілу картку, і
                вона ж мусить працювати з клавіатури. */}
            <button
              type="button"
              className="site-editor-item-main"
              onClick={() => selectPage(page.slug)}
            >
              <span className="site-editor-item-title">{page.title}</span>
              <span className="wb-text-xs wb-text-muted">/{page.slug}</span>
            </button>

            {page.slug !== "home" && (
              <button
                type="button"
                className="wb-btn wb-btn-ghost wb-btn-sm site-editor-icon-btn"
                onClick={() => void deletePage(page)}
                aria-label={`Видалити сторінку ${page.title}`}
              >
                <Icon name="trash" size={14} />
              </button>
            )}
          </div>
        ))}

        {pages.length === 0 && <p className="wb-text-sm wb-text-muted">Ще немає жодної сторінки</p>}
      </div>
    </div>
  );
}
