/**
 * Page Builder — Navigation Block.
 *
 * A menu of links displayed horizontally or vertically, with optional icons.
 *
 * @module packages/ui/src/blocks/NavBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface NavItem {
  text: string;
  url?: string;
  icon?: string;
}

export function NavBlock({ block }: BlockComponentProps) {
  const { items = [], direction = 'vertical' } = block.props as {
    items?: NavItem[];
    direction?: string;
  };

  if (items.length === 0) return null;

  const isHorizontal = direction === 'horizontal';

  return (
    <nav
      className="wb-block-nav"
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        flexWrap: isHorizontal ? 'wrap' : undefined,
        gap: isHorizontal ? 'var(--sp-4)' : 'var(--sp-1)',
      }}
    >
      {items.map((item, i) => {
        const style: React.CSSProperties = {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
          padding: 'var(--sp-2) var(--sp-2)',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: 'var(--text-sm)',
          borderRadius: 'var(--radius-sm)',
          transition: 'color var(--duration-fast) var(--ease), background var(--duration-fast) var(--ease)',
        };

        if (item.url) {
          return (
            <a key={i} href={item.url} className="wb-block-nav__link" style={style}>
              {item.icon && <span className="wb-block-nav__icon">{item.icon}</span>}
              <span>{item.text}</span>
            </a>
          );
        }

        return (
          <span key={i} className="wb-block-nav__item" style={style}>
            {item.icon && <span className="wb-block-nav__icon">{item.icon}</span>}
            <span>{item.text}</span>
          </span>
        );
      })}
    </nav>
  );
}
