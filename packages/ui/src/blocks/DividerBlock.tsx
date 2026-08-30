/**
 * Block: Розділювач
 *
 * Горизонтальна лінія-розділювач між блоками.
 * Підтримує різні стилі лінії та відступи.
 *
 * @module packages/ui/src/blocks/DividerBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface DividerBlockProps {
  style?: 'solid' | 'dashed' | 'dotted' | 'gradient';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const styleMap: Record<string, string> = {
  solid: 'border-solid border-border',
  dashed: 'border-dashed border-border',
  dotted: 'border-dotted border-border',
  gradient:
    'border-none h-px bg-gradient-to-r from-transparent via-border to-transparent',
};

const spacingMap: Record<string, string> = {
  none: 'my-0',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-8',
};

export function DividerBlock({ block, children }: BlockComponentProps) {
  const { style = 'solid', spacing = 'md' } =
    block.props as unknown as DividerBlockProps;

  return (
    <div className={spacingMap[spacing] ?? spacingMap.md}>
      <hr
        className={`border-t ${styleMap[style] ?? styleMap.solid}`}
        role="separator"
      />
      {children}
    </div>
  );
}
