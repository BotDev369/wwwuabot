/**
 * Page Builder — Tabs Block.
 *
 * Tab switcher with configurable style. Each tab shows/hides its content on click.
 *
 * @module packages/ui/src/blocks/TabsBlock
 */

import { useState } from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface TabItem {
  label: string;
  icon?: string;
  content?: string;
}

export function TabsBlock({ block }: BlockComponentProps) {
  const {
    tabs = [],
    style = 'underline',
  } = block.props as {
    tabs?: TabItem[];
    style?: string;
  };

  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) return null;

  const getTabStyle = (isActive: boolean): React.CSSProperties => {
    let bgColor = 'transparent';
    if (style === 'pills' && isActive) bgColor = 'var(--accent-dim)';
    else if (style === 'enclosed' && isActive) bgColor = 'var(--bg-1)';

    return {
      padding: 'var(--sp-2) var(--sp-3)',
      cursor: 'pointer',
      border: 'none',
      background: bgColor,
      fontSize: 'var(--text-sm)',
      fontWeight: isActive ? 'var(--weight-semibold)' : 'var(--weight-normal)',
      color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
      transition: 'color var(--duration-fast) var(--ease)',
      borderBottom: style === 'underline'
        ? `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`
        : undefined,
      borderRadius: style === 'pills' ? 'var(--radius-full)' : undefined,
    };
  };

  const activeTab = tabs[activeIndex];

  return (
    <div className="wb-block-tabs">
      <div
        className="wb-block-tabs__header"
        style={{
          display: 'flex',
          gap: style === 'pills' ? 'var(--sp-1)' : undefined,
          borderBottom: style === 'underline' ? '1px solid var(--border-subtle)' : undefined,
          marginBottom: 'var(--sp-3)',
          overflowX: 'auto',
        }}
        role="tablist"
      >
        {tabs.map((tab, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            style={getTabStyle(i === activeIndex)}
            onClick={() => setActiveIndex(i)}
          >
            {tab.icon && <span style={{ marginRight: 'var(--sp-1)' }}>{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>

      <div
        className="wb-block-tabs__content wb-text-primary"
        role="tabpanel"
        style={{ fontSize: 'var(--text-sm)', lineHeight: 'var(--font-lineheight-3)' }}
      >
        {activeTab?.content || ''}
      </div>
    </div>
  );
}
