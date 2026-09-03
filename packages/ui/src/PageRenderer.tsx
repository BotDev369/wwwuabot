/**
 * Page Builder — головний рендерер сторінки.
 *
 * Отримує PageConfig та BlockContext,
 * рендерить 4 зони (sidebar, header, main, footer).
 *
 * @module packages/ui/src/PageRenderer
 */

import { useState, useCallback } from 'react';
import type {
  PageConfig,
  BlockContext,
} from '@wwwuabot/shared/types/page-config';
import { ZoneRenderer } from './ZoneRenderer';

interface PageRendererProps {
  /** Конфігурація сторінки. */
  config: PageConfig;

  /** Контекст сторінки. */
  context: BlockContext;

  /**
   * CSS-клас для кореневого контейнера.
   * Default: 'page-layout'.
   */
  className?: string;

  /**
   * Слоти для кастомізації зовнішнього вигляду зон.
   * Дозволяє обернути зони в додаткову структуру.
   */
  zoneClassName?: Partial<Record<keyof PageConfig['zones'], string>>;

  /** Показувати мітки зон (sidebar, header, main, footer). */
  showZoneLabels?: boolean;
}

/**
 * Головний рендерер сторінки.
 *
 * Будує layout з 4 зон:
 * ```
 * ┌──────────┬──────────────────┐
 * │ SIDEBAR  │     HEADER       │
 * │          ├──────────────────┤
 * │          │      MAIN        │
 * │          ├──────────────────┤
 * │          │     FOOTER       │
 * └──────────┴──────────────────┘
 * ```
 *
 * Якщо зона порожня — вона не рендериться (немає пустих контейнерів).
 */
const ZONE_LABELS: Record<string, string> = {
  sidebar: '📎 Sidebar',
  header: '📌 Header',
  main: '📄 Main',
  footer: '📎 Footer',
};

export function PageRenderer({
  config,
  context,
  className = 'page-layout',
  zoneClassName,
  showZoneLabels = false,
}: PageRendererProps) {
  const { zones } = config;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasSidebar = zones.sidebar.length > 0;
  const hasHeader = zones.header.length > 0;
  const hasMain = zones.main.length > 0;
  const hasFooter = zones.footer.length > 0;

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const renderZoneLabel = (zone: string) =>
    showZoneLabels ? <div className="page-zone-label">{ZONE_LABELS[zone]}</div> : null;

  return (
    <div className={className}>
      {/* Sidebar overlay (mobile) */}
      {hasSidebar && sidebarOpen && (
        <div className="page-sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      {hasSidebar && (
        <aside
          className={`${zoneClassName?.sidebar ?? 'page-zone page-zone--sidebar'}${sidebarOpen ? ' page-zone--sidebar--open' : ''}`}
          data-zone="sidebar"
        >
          <button
            className="page-sidebar-close"
            onClick={closeSidebar}
            aria-label="Закрити меню"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {renderZoneLabel('sidebar')}
          <ZoneRenderer
            blocks={zones.sidebar}
            zone="sidebar"
            context={context}
          />
        </aside>
      )}

      <div className="page-zone-group">
        {hasHeader && (
          <header
            className={zoneClassName?.header ?? 'page-zone page-zone--header'}
            data-zone="header"
          >
            {/* Hamburger inside header — visible on mobile when sidebar has content */}
            {hasSidebar && (
              <button
                className="page-hamburger"
                onClick={toggleSidebar}
                aria-label="Меню сторінки"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            {renderZoneLabel('header')}
            <ZoneRenderer
              blocks={zones.header}
              zone="header"
              context={context}
            />
          </header>
        )}

        {hasMain && (
          <main
            className={zoneClassName?.main ?? 'page-zone page-zone--main'}
            data-zone="main"
          >
            {renderZoneLabel('main')}
            <ZoneRenderer
              blocks={zones.main}
              zone="main"
              context={context}
            />
          </main>
        )}

        {hasFooter && (
          <footer
            className={zoneClassName?.footer ?? 'page-zone page-zone--footer'}
            data-zone="footer"
          >
            {renderZoneLabel('footer')}
            <ZoneRenderer
              blocks={zones.footer}
              zone="footer"
              context={context}
            />
          </footer>
        )}
      </div>
    </div>
  );
}
