/**
 * Полотно праворуч: редактор обраної сторінки або підказка, що її треба обрати.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { Icon } from "@wwwuabot/shared";
import type { Site } from "@wwwuabot/shared/types/site";
import { PageBuilderPlaceholder } from "./PageBuilderPlaceholder";
import type { SiteEditorApi } from "./types";

export function CanvasPane({ api, site }: { api: SiteEditorApi; site: Site }) {
  const { pages, editingPageSlug, selectPage, reloadPages } = api;

  if (!editingPageSlug) {
    return (
      <div className="site-editor-canvas">
        <div className="wb-empty">
          <Icon name="edit" size={48} />
          <p className="wb-text-muted">Оберіть сторінку для редагування</p>
          <p className="wb-text-xs wb-text-muted">
            Або перейдіть на вкладку «Меню», щоб налаштувати навігацію
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="site-editor-canvas">
      <div className="site-editor-canvas-head">
        <span className="wb-text-sm">
          Редагування: <strong>/{editingPageSlug}</strong>
        </span>
        <button
          type="button"
          className="wb-btn wb-btn-sm wb-btn-ghost site-editor-icon-btn"
          onClick={() => selectPage(null)}
          aria-label="Закрити редактор сторінки"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div className="site-editor-canvas-body">
        <PageBuilderPlaceholder
          pageSlug={editingPageSlug}
          pages={pages}
          siteSlug={site.slug}
          onSaved={() => void reloadPages()}
        />
      </div>
    </div>
  );
}
