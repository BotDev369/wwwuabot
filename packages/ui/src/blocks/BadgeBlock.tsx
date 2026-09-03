/**
 * Page Builder — Badge Block.
 *
 * Displays a row/wrap of colored status/label badges (tags).
 *
 * @module packages/ui/src/blocks/BadgeBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface BadgeItem {
  text: string;
  variant?: string;
}

const VARIANT_CLASS: Record<string, string> = {
  accent: 'wb-badge wb-badge-accent',
  green: 'wb-badge wb-badge-green',
  red: 'wb-badge wb-badge-red',
  yellow: 'wb-badge wb-badge-yellow',
  neutral: 'wb-badge wb-badge-neutral',
};

export function BadgeBlock({ block }: BlockComponentProps) {
  const { items = [], layout = 'wrap' } = block.props as {
    items?: BadgeItem[];
    layout?: string;
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      className="wb-block-badges"
      style={{
        display: 'flex',
        flexWrap: layout === 'wrap' ? 'wrap' : 'nowrap',
        gap: 'var(--sp-2)',
      }}
    >
      {items.map((item, i) => (
        <span key={i} className={VARIANT_CLASS[item.variant ?? 'accent'] ?? VARIANT_CLASS.accent}>
          {item.text}
        </span>
      ))}
    </div>
  );
}
