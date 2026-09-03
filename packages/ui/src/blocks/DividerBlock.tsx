/**
 * Page Builder — Divider Block.
 *
 * Displays a horizontal divider line with configurable style and spacing.
 *
 * @module packages/ui/src/blocks/DividerBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const SPACING_MAP: Record<string, string> = {
  none: '0',
  sm: 'var(--sp-2)',
  md: 'var(--sp-4)',
  lg: 'var(--sp-8)',
};

const STYLE_MAP: Record<string, string> = {
  solid: '1px solid var(--border-subtle)',
  dashed: '1px dashed var(--border-subtle)',
  dotted: '1px dotted var(--border-subtle)',
  gradient: '1px solid transparent',
};

export function DividerBlock({ block }: BlockComponentProps) {
  const { style = 'solid', spacing = 'md' } = block.props as {
    style?: string;
    spacing?: string;
  };

  return (
    <div style={{ padding: `${SPACING_MAP[spacing] ?? SPACING_MAP.md} 0` }}>
      <hr
        className="wb-block-divider"
        style={{
          border: 'none',
          height: style === 'gradient' ? '1px' : undefined,
          background: style === 'gradient'
            ? 'linear-gradient(90deg, transparent, var(--border-subtle), transparent)'
            : undefined,
          borderTop: style !== 'gradient' ? STYLE_MAP[style] : undefined,
          margin: 0,
        }}
      />
    </div>
  );
}
