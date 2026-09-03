/**
 * Page Builder — Feature Card Block.
 *
 * Displays a grid of feature highlight cards, each with an icon, title, and description.
 *
 * @module packages/ui/src/blocks/FeatureCardBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface FeatureItem {
  icon?: string;
  title: string;
  description?: string;
}

export function FeatureCardBlock({ block }: BlockComponentProps) {
  const { items = [], columns = '2' } = block.props as {
    items?: FeatureItem[];
    columns?: string;
  };

  if (items.length === 0) return null;

  return (
    <div
      className="wb-block-features"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 'var(--sp-4)',
      }}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="wb-block-features__card"
          style={{
            padding: 'var(--sp-4)',
            background: 'var(--bg-1)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-2)',
          }}
        >
          {item.icon && (
            <span
              className="wb-block-features__icon"
              style={{
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)',
                background: 'var(--accent-dim)',
                color: 'var(--accent)',
                fontSize: 'var(--text-lg)',
              }}
            >
              {item.icon}
            </span>
          )}
          <h4 className="wb-font-semibold" style={{ margin: 0 }}>
            {item.title}
          </h4>
          {item.description && (
            <p className="wb-text-sm wb-text-secondary" style={{ margin: 0, lineHeight: 'var(--font-lineheight-3)' }}>
              {item.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
