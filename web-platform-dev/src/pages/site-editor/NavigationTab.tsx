/**
 * Вкладка «Меню»: пункти навігації сайту.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { useMemo } from "react";
import { Icon } from "@wwwuabot/shared";
import type { SiteEditorApi } from "./types";

export function NavigationTab({ api }: { api: SiteEditorApi }) {
  const { navItems, addNavItem, removeNavItem } = api;

  const ordered = useMemo(() => [...navItems].sort((a, b) => a.order - b.order), [navItems]);

  return (
    <div className="site-editor-tab">
      <div className="wb-flex-between site-editor-tab-head">
        <span className="wb-text-sm wb-text-secondary">Пункти меню ({navItems.length})</span>
        <button
          type="button"
          className="wb-btn wb-btn-sm wb-btn-primary"
          onClick={() => void addNavItem()}
        >
          <Icon name="plus" size={14} />
          Додати
        </button>
      </div>

      <div className="site-editor-list">
        {ordered.map((item) => (
          <div key={item.pageSlug} className="wb-card site-editor-item">
            <div className="site-editor-item-main site-editor-item-main--static">
              <span className="site-editor-item-title">{item.label}</span>
              <span className="wb-text-xs wb-text-muted">→ /{item.pageSlug}</span>
            </div>
            <button
              type="button"
              className="wb-btn wb-btn-ghost wb-btn-sm site-editor-icon-btn"
              onClick={() => removeNavItem(item.pageSlug)}
              aria-label={`Прибрати пункт ${item.label}`}
            >
              <Icon name="trash" size={14} />
            </button>
          </div>
        ))}

        {ordered.length === 0 && (
          <p className="wb-text-sm wb-text-muted">
            Додайте пункти меню, щоб відвідувачі могли переходити між сторінками
          </p>
        )}
      </div>
    </div>
  );
}
