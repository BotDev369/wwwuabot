/**
 * Page Builder — Rating Block.
 *
 * Displays a star-based rating with configurable value, max, and size.
 *
 * @module packages/ui/src/blocks/RatingBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const SIZE_MAP: Record<string, string> = {
  sm: '16px',
  md: '24px',
  lg: '32px',
};

export function RatingBlock({ block }: BlockComponentProps) {
  const {
    value = 0,
    max = 5,
    label = '',
    size = 'md',
  } = block.props as {
    value?: number;
    max?: number;
    label?: string;
    size?: string;
  };

  const starSize = SIZE_MAP[size] ?? SIZE_MAP.md;

  return (
    <div className="wb-block-rating" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
      {label && (
        <span className="wb-text-sm wb-text-secondary">{label}</span>
      )}
      <div className="wb-block-rating__stars" style={{ display: 'flex', gap: '2px' }}>
        {Array.from({ length: max }, (_, i) => {
          const filled = i < Math.round(value);
          return (
            <span
              key={i}
              style={{
                fontSize: starSize,
                lineHeight: 1,
                color: filled ? 'var(--yellow)' : 'var(--border-subtle)',
              }}
            >
              ★
            </span>
          );
        })}
      </div>
      <span className="wb-text-xs wb-text-muted">
        {value}/{max}
      </span>
    </div>
  );
}
