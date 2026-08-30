/**
 * Page Builder — головний рендерер сторінки.
 *
 * Отримує PageConfig та BlockContext,
 * рендерить 4 зони (sidebar, header, main, footer).
 *
 * @module packages/ui/src/PageRenderer
 */

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
export function PageRenderer({
  config,
  context,
  className = 'page-layout',
  zoneClassName,
}: PageRendererProps) {
  const { zones } = config;

  const hasSidebar = zones.sidebar.length > 0;
  const hasHeader = zones.header.length > 0;
  const hasMain = zones.main.length > 0;
  const hasFooter = zones.footer.length > 0;

  return (
    <div className={className}>
      {hasSidebar && (
        <aside
          className={zoneClassName?.sidebar ?? 'page-zone page-zone--sidebar'}
          data-zone="sidebar"
        >
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
