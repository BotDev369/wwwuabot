/**
 * Page Builder — Navigation / Menu Block.
 *
 * A customizable navigation menu with links, pills, buttons, or underline styles.
 * Supports horizontal and vertical orientations and alignment options.
 * Available in all zones (header, sidebar, main, footer).
 *
 * @module packages/ui/src/blocks/NavBlock
 */
import React from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';
import { icons, type IconName } from '@wwwuabot/shared';

interface NavItem {
  text: string;
  url?: string;
  icon?: string;
}

export function NavBlock({ block, zone }: BlockComponentProps) {
  const {
    items = [],
    direction = zone === 'sidebar' ? 'vertical' : 'horizontal',
    align = 'left',
    style = 'links',
  } = block.props as {
    items?: NavItem[];
    direction?: 'horizontal' | 'vertical';
    align?: 'left' | 'center' | 'right' | 'space-between';
    style?: 'links' | 'pills' | 'buttons' | 'underline';
  };

  if (!items || items.length === 0) {
    return (
      <nav
        className="wb-block-nav wb-block-nav--empty"
        style={{
          padding: '8px 12px',
          border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-sm, 4px)',
          color: 'var(--text-muted, #888)',
          fontSize: 13,
          textAlign: 'center',
          background: 'var(--bg-2, rgba(128,128,128,0.04))',
        }}
      >
        Меню (порожнє — додайте посилання у налаштуваннях блоку)
      </nav>
    );
  }

  const isHorizontal = direction === 'horizontal';
  const justify =
    align === 'center'
      ? 'center'
      : align === 'right'
        ? 'flex-end'
        : align === 'space-between'
          ? 'space-between'
          : 'flex-start';

  const getItemStyle = (navStyle: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      textDecoration: 'none',
      fontSize: 13,
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    };

    switch (navStyle) {
      case 'pills':
        return {
          ...base,
          padding: '6px 14px',
          borderRadius: 'var(--radius-full, 9999px)',
          background: 'var(--bg-2, #f3f4f6)',
          color: 'var(--text-primary)',
          border: '1px solid transparent',
        };
      case 'buttons':
        return {
          ...base,
          padding: '6px 14px',
          borderRadius: 'var(--radius-md, 6px)',
          background: 'var(--accent, #6366f1)',
          color: '#fff',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        };
      case 'underline':
        return {
          ...base,
          padding: '6px 4px',
          color: 'var(--text-primary)',
          borderBottom: '2px solid var(--accent, #6366f1)',
          borderRadius: 0,
        };
      case 'links':
      default:
        return {
          ...base,
          padding: '6px 8px',
          color: 'var(--text-secondary, #4b5563)',
          borderRadius: 'var(--radius-sm, 4px)',
        };
    }
  };

  const itemStyle = getItemStyle(style);

  return (
    <nav
      className={`wb-block-nav wb-block-nav--${style} wb-block-nav--${direction}`}
      style={{
        display: 'flex',
        flexDirection: isHorizontal ? 'row' : 'column',
        flexWrap: isHorizontal ? 'wrap' : undefined,
        gap: isHorizontal ? 8 : 4,
        alignItems: isHorizontal ? 'center' : 'stretch',
        justifyContent: isHorizontal ? justify : undefined,
        width: '100%',
      }}
    >
      {items.map((item, i) => {
        const iconKey = item.icon as IconName | undefined;
        const hasSvgIcon = iconKey && iconKey in icons;

        const content = (
          <>
            {hasSvgIcon ? (
              <span style={{ display: 'inline-flex', width: 15, height: 15, flexShrink: 0 }}>
                {icons[iconKey]}
              </span>
            ) : item.icon ? (
              <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
            ) : null}
            <span>{item.text}</span>
          </>
        );

        if (item.url) {
          return (
            <a
              key={i}
              href={item.url}
              className="wb-block-nav__link"
              style={itemStyle}
            >
              {content}
            </a>
          );
        }

        return (
          <span key={i} className="wb-block-nav__item" style={itemStyle}>
            {content}
          </span>
        );
      })}
    </nav>
  );
}
