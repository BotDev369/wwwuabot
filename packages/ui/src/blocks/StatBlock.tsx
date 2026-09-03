/**
 * Page Builder — Stat Block.
 *
 * Displays a metric/counter card with value, label, optional icon, and trend indicator.
 *
 * @module packages/ui/src/blocks/StatBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const TREND_COLORS: Record<string, string> = {
  up: 'var(--green)',
  down: 'var(--red)',
  neutral: 'var(--text-secondary)',
};

const TREND_ARROWS: Record<string, string> = {
  up: '↑',
  down: '↓',
  neutral: '—',
};

export function StatBlock({ block }: BlockComponentProps) {
  const {
    value = '0',
    label = '',
    description = '',
    icon = '',
    trend = 'neutral',
    trendValue = '',
  } = block.props as {
    value?: string;
    label?: string;
    description?: string;
    icon?: string;
    trend?: string;
    trendValue?: string;
  };

  return (
    <div
      className="wb-block-stat"
      style={{
        padding: 'var(--sp-4)',
        background: 'var(--bg-1)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          className="wb-block-stat__label wb-text-xs wb-text-secondary"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
        >
          {label}
        </span>
        {icon && <span className="wb-block-stat__icon">{icon}</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
        <span
          className="wb-block-stat__value"
          style={{
            fontSize: 'var(--text-3)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
          }}
        >
          {value}
        </span>

        {trendValue && (
          <span
            className="wb-block-stat__trend wb-text-xs"
            style={{ color: TREND_COLORS[trend] ?? TREND_COLORS.neutral }}
          >
            {TREND_ARROWS[trend] ?? ''} {trendValue}
          </span>
        )}
      </div>

      {description && (
        <span className="wb-block-stat__desc wb-text-xs wb-text-muted">
          {description}
        </span>
      )}
    </div>
  );
}
