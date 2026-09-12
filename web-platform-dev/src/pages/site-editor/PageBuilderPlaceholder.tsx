/**
 * Заглушка редактора блоків сторінки.
 *
 * Показує, що вже лежить у `pageData` сторінки, доки повноцінний PageBuilder
 * не підключено. `siteSlug` та `onSaved` лишаються в контракті: їх передає
 * виклик, і вони знадобляться повноцінному редакторові.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { useMemo } from "react";
import { Icon } from "@wwwuabot/shared";
import type { SitePage } from "@wwwuabot/shared/types/site";

interface PageBuilderPlaceholderProps {
  pageSlug: string;
  pages: SitePage[];
  siteSlug: string;
  onSaved: () => void;
}

/** «1 блок», «3 блоки», «7 блоків» — щоб не було «1 блоків». */
function blockCountLabel(count: number): string {
  if (count === 1) return "1 блок";
  if (count > 1 && count < 5) return `${count} блоки`;
  return `${count} блоків`;
}

export function PageBuilderPlaceholder({ pageSlug, pages }: PageBuilderPlaceholderProps) {
  const page = pages.find((p) => p.slug === pageSlug);

  const blockCount = useMemo(() => {
    const zones = page?.pageData?.zones;
    if (!zones) return 0;
    return Object.values(zones).reduce(
      (sum, zone) => sum + (Array.isArray(zone) ? zone.length : 0),
      0,
    );
  }, [page]);

  if (!page) {
    return (
      <div className="wb-empty">
        <Icon name="x" size={32} />
        <p className="wb-text-muted">Сторінку не знайдено</p>
      </div>
    );
  }

  const mainBlocks = page.pageData?.zones?.main ?? [];

  return (
    <div className="site-editor-placeholder">
      <div className="wb-card">
        <div className="wb-card-body">
          <div className="wb-flex-between site-editor-tab-head">
            <h3 className="site-editor-placeholder-title">{page.title}</h3>
            <span className="wb-badge wb-badge-neutral">{blockCountLabel(blockCount)}</span>
          </div>
          <p className="wb-text-xs wb-text-muted">
            Адреса: /{pageSlug} · Створено: {new Date(page.createdAt).toLocaleDateString("uk-UA")}
          </p>
        </div>
      </div>

      <div className="wb-card">
        <div className="wb-card-header">
          <h4 className="site-editor-placeholder-subtitle">Блоки сторінки</h4>
        </div>
        <div className="wb-card-body">
          {mainBlocks.length > 0 ? (
            <div className="site-editor-blocks">
              {mainBlocks.map((block) => (
                <div key={block.id} className="site-editor-block">
                  <span className="wb-text-sm">{block.type}</span>
                  {typeof block.props?.title === "string" && (
                    <span className="wb-text-xs wb-text-muted">
                      {String(block.props.title).slice(0, 40)}
                    </span>
                  )}
                  <span className="wb-text-xs wb-text-muted">#{block.id.slice(0, 8)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="wb-text-sm wb-text-muted">
              Сторінка порожня. Додайте блоки через конструктор.
            </p>
          )}
        </div>
      </div>

      <div className="site-editor-placeholder-actions">
        <button type="button" className="wb-btn wb-btn-primary">
          <Icon name="edit" size={14} />
          Редагувати блоки
        </button>
        <button type="button" className="wb-btn wb-btn-secondary">
          <Icon name="eye" size={14} />
          Попередній перегляд
        </button>
      </div>

      <p className="wb-text-xs wb-text-muted site-editor-placeholder-note">
        Повноцінний конструктор блоків з&apos;явиться наступним кроком
      </p>
    </div>
  );
}
