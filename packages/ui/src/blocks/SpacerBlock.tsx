/**
 * Page Builder — Spacer Block.
 *
 * Provides configurable vertical spacing between blocks.
 *
 * @module packages/ui/src/blocks/SpacerBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

const HEIGHT_MAP: Record<string, string> = {
  xs: 'var(--sp-2)',
  sm: 'var(--sp-4)',
  md: 'var(--sp-8)',
  lg: 'var(--sp-12)',
  xl: 'var(--sp-16)',
  '2xl': 'var(--sp-24)',
};

export function SpacerBlock({ block }: BlockComponentProps) {
  const { height = 'md' } = block.props as { height?: string };

  return (
    <div
      className="wb-block-spacer"
      style={{ height: HEIGHT_MAP[height] ?? HEIGHT_MAP.md }}
    />
  );
}
