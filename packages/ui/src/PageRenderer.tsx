/**
 * Page Builder — головний рендерер сторінки.
 *
 * Отримує PageConfig та BlockContext,
 * рендерить 4 зони (sidebar, header, main, footer).
 *
 * @module packages/ui/src/PageRenderer
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type {
  PageConfig,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { icons } from "@wwwuabot/shared";
import { ZoneRenderer } from "./ZoneRenderer";

interface PageRendererProps {
  /** Конфігурація сторінки. */
  config: PageConfig;
  /** Контекст сторінки. */
  context: BlockContext;
  /**
   * CSS-клас для кореневого контейнера.
   * Default: "page-layout".
   */
  className?: string;
  /**
   * Слоти для кастомізації зовнішнього вигляду зон.
   * Дозволяє обернути зони в додаткову структуру.
   */
  zoneClassName?: Partial<Record<keyof PageConfig["zones"], string>>;
  /** Показувати мітки зон (sidebar, header, main, footer). */
  showZoneLabels?: boolean;
}

const ZONE_LABELS: Record<string, string> = {
  sidebar: "📎 Sidebar",
  header: "📌 Header",
  main: "📄 Main",
  footer: "📎 Footer",
};

export function PageRenderer({
  config,
  context,
  className = "page-layout",
  zoneClassName,
  showZoneLabels = false,
}: PageRendererProps) {
  const zones = config?.zones ?? { sidebar: [], header: [], main: [], footer: [] };
  const sidebarSettings = config?.sidebarSettings;
  const closeButtonPosition = sidebarSettings?.closeButtonPosition ?? "left";

  const enrichedContext: BlockContext = useMemo(
    () => ({
      ...context,
      sidebarSettings,
    }),
    [context, sidebarSettings],
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const hasSidebar = Boolean(zones.sidebar && zones.sidebar.length > 0);
  const hasHeader = Boolean(zones.header && zones.header.length > 0);
  const hasMain = Boolean(zones.main && zones.main.length > 0);
  const hasFooter = Boolean(zones.footer && zones.footer.length > 0);

  const toggleSidebar = useCallback(() => setSidebarOpen((p) => !p), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Закриття сайдбару при натисканні Escape
  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sidebarOpen]);

  // Закриття сайдбару на мобільних при кліку на посилання всередині нього
  const handleSidebarClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("a") || target.closest("button.wb-block-nav__item")) {
      setSidebarOpen(false);
    }
  }, []);

  const renderZoneLabel = (zone: string) =>
    showZoneLabels ? <div className="page-zone-label">{ZONE_LABELS[zone]}</div> : null;

  return (
    <div className={className}>
      {/* Floating hamburger when hasSidebar && !hasHeader (accessible on mobile) */}
      {hasSidebar && !hasHeader && (
        <button
          className="hamburger page-hamburger page-hamburger--floating"
          onClick={toggleSidebar}
          aria-label="Меню сторінки"
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      )}

      {/* Sidebar overlay (mobile) */}
      {hasSidebar && sidebarOpen && (
        <div className="page-sidebar-overlay" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      {hasSidebar && (
        <aside
          className={`${zoneClassName?.sidebar ?? "page-zone page-zone--sidebar"}${sidebarOpen ? " page-zone--sidebar--open" : ""}`}
          data-zone="sidebar"
          onClick={handleSidebarClick}
        >
          <div className={`page-sidebar-header page-sidebar-header--${closeButtonPosition}`}>
            <button
              className="wb-close-btn page-sidebar-close"
              onClick={closeSidebar}
              aria-label="Закрити меню"
              type="button"
            >
              {icons["close"]}
            </button>
          </div>
          {renderZoneLabel("sidebar")}
          <ZoneRenderer
            blocks={zones.sidebar}
            zone="sidebar"
            context={enrichedContext}
          />
        </aside>
      )}

      <div className="page-zone-group">
        {hasHeader && (
          <header
            className={zoneClassName?.header ?? "page-zone page-zone--header"}
            data-zone="header"
          >
            {/* Hamburger inside header — visible on mobile when sidebar has content */}
            {hasSidebar && (
              <button
                className="hamburger page-hamburger"
                onClick={toggleSidebar}
                aria-label="Меню сторінки"
                type="button"
              >
                <span />
                <span />
                <span />
              </button>
            )}
            {renderZoneLabel("header")}
            <ZoneRenderer
              blocks={zones.header}
              zone="header"
              context={enrichedContext}
            />
          </header>
        )}

        {hasMain && (
          <main
            className={zoneClassName?.main ?? "page-zone page-zone--main"}
            data-zone="main"
          >
            {renderZoneLabel("main")}
            <ZoneRenderer
              blocks={zones.main}
              zone="main"
              context={enrichedContext}
            />
          </main>
        )}

        {hasFooter && (
          <footer
            className={zoneClassName?.footer ?? "page-zone page-zone--footer"}
            data-zone="footer"
          >
            {renderZoneLabel("footer")}
            <ZoneRenderer
              blocks={zones.footer}
              zone="footer"
              context={enrichedContext}
            />
          </footer>
        )}
      </div>
    </div>
  );
}
