/**
 * Site Renderer — рендерить багатосторінковий сайт з навігацією.
 *
 * Використовує PageRenderer для кожної сторінки,
 * додає навігаційне меню між сторінками.
 *
 * @module packages/ui/src/SiteRenderer
 */

import { useState, useCallback, useMemo } from "react";
import type { Site, SitePage } from "@wwwuabot/shared/types/site";
import type { BlockContext } from "@wwwuabot/shared/types/page-config";
import { icons } from "@wwwuabot/shared";
import { PageRenderer } from "./PageRenderer";

// ── Types ────────────────────────────────────────────────────

interface SiteRendererProps {
  /** Конфігурація сайту. */
  site: Site;

  /** Сторінки сайту. */
  pages: SitePage[];

  /** Slug поточної сторінки. */
  currentSlug?: string;

  /** Контекст для блоків. */
  context?: Partial<BlockContext>;

  /** Режим рендеру. */
  mode?: "preview" | "public";

  /** CSS-клас для кореневого контейнера. */
  className?: string;

  /** Коли змінюється сторінка (для навігації). */
  onNavigate?: (slug: string) => void;
}

// ── Component ────────────────────────────────────────────────

export function SiteRenderer({
  site,
  pages,
  currentSlug,
  context,
  mode = "public",
  className = "site-layout",
  onNavigate,
}: SiteRendererProps) {
  const settings = site.settings ?? {};
  const navigation = settings.navigation ?? [];
  const theme = settings.theme ?? "auto";

  // Знаходимо поточну сторінку
  const currentPage = useMemo(() => {
    if (currentSlug) {
      return pages.find((p) => p.slug === currentSlug) ?? pages[0];
    }
    return pages[0]; // home за замовчуванням
  }, [currentSlug, pages]);

  // Локальний стан для навігації
  const [activeSlug, setActiveSlug] = useState<string>(currentPage?.slug ?? "home");

  const effectiveSlug = currentSlug ?? activeSlug;
  const activePage = pages.find((p) => p.slug === effectiveSlug) ?? pages[0];

  // Обробник навігації
  const handleNavigate = useCallback(
    (slug: string) => {
      if (onNavigate) {
        onNavigate(slug);
      } else {
        setActiveSlug(slug);
      }
    },
    [onNavigate],
  );

  // Контекст для блоків
  const blockContext: BlockContext = useMemo(
    () => ({
      codeword: site.slug,
      title: activePage?.title ?? site.title,
      photoUrl: site.thumbnail ?? null,
      ...context,
    }),
    [site, activePage, context],
  );

  // Рендер навігації
  const renderNavigation = () => {
    if (navigation.length === 0) return null;

    const sortedNav = [...navigation].sort((a, b) => a.order - b.order);

    return (
      <nav className="site-nav" data-theme={theme}>
        <div className="site-nav-inner">
          {sortedNav.map((item) => (
            <button
              key={item.pageSlug}
              className={`site-nav-item ${
                item.pageSlug === effectiveSlug ? "site-nav-item--active" : ""
              }`}
              onClick={() => handleNavigate(item.pageSlug)}
              type="button"
            >
              {item.icon && item.icon in icons && (
                <span className="site-nav-icon">{icons[item.icon as keyof typeof icons]}</span>
              )}
              <span className="site-nav-label">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    );
  };

  // Рендер заголовка сайту
  const renderSiteHeader = () => {
    if (!settings.logo && !site.title) return null;

    return (
      <div className="site-header">
        {settings.logo && <img src={settings.logo} alt={site.title} className="site-logo" />}
        <h1 className="site-title">{site.title}</h1>
      </div>
    );
  };

  // Рендер кастомного CSS
  const renderCustomCss = () => {
    if (!settings.customCss) return null;
    return <style dangerouslySetInnerHTML={{ __html: settings.customCss }} />;
  };

  return (
    <div
      className={`${className} site-theme--${theme}`}
      data-site={site.slug}
      data-page={effectiveSlug}
    >
      {renderCustomCss()}
      {renderSiteHeader()}
      {renderNavigation()}

      <div className="site-content">
        {activePage ? (
          <PageRenderer config={activePage.pageData} context={blockContext} className="site-page" />
        ) : (
          <div className="site-empty">
            <p>Сторінка не знайдена</p>
          </div>
        )}
      </div>

      {/* Попередній перегляд: індикатор */}
      {mode === "preview" && <div className="site-preview-badge">Попередній перегляд</div>}
    </div>
  );
}

// ── Export types ─────────────────────────────────────────────

export type { SiteRendererProps };
