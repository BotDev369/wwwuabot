/**
 * Page Builder — Progress Block.
 *
 * Displays a progress bar with configurable label, percentage, and color.
 *
 * @module packages/ui/src/blocks/ProgressBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const COLOR_MAP: Record<string, string> = {
  accent: 'var(--accent)',
  green: 'var(--green)',
  yellow: 'var(--yellow)',
  red: 'var(--red)',
};

export function ProgressBlock({ block }: BlockComponentProps) {
  const {
    value = 0,
    max = 100,
    label = '',
    showPercent = true,
    color = 'accent',
  } = block.props as {
    value?: number;
    max?: number;
    label?: string;
    showPercent?: boolean;
    color?: string;
  };

  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="wb-block-progress">
      {(label || showPercent) && (
        <div
          className="wb-block-progress__header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 'var(--sp-2)',
          }}
        >
          {label && <span className="wb-text-sm wb-text-primary">{label}</span>}
          {showPercent && (
            <span className="wb-text-sm wb-text-secondary">{Math.round(percent)}%</span>
          )}
        </div>
      )}

      <div
        className="wb-block-progress__track"
        style={{
          height: '8px',
          background: 'var(--bg-3)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}
      >
        <div
          className="wb-block-progress__fill"
          style={{
            height: '100%',
            width: `${percent}%`,
            background: COLOR_MAP[color] ?? COLOR_MAP.accent,
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--duration-normal) var(--ease)',
          }}
        />
      </div>
    </div>
  );
}
