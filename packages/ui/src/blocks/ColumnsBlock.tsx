/**
 * Page Builder — Columns Block.
 *
 * Container with 2 or 3 columns. Each column holds child blocks rendered by ZoneRenderer.
 * Props.columns[].children are PageBlock arrays — the ZoneRenderer recurses into them.
 *
 * @module packages/ui/src/blocks/ColumnsBlock
 */

import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ColumnDef {
  width?: string;
  children?: unknown[];
}

export function ColumnsBlock({ block, children }: BlockComponentProps) {
  const {
    count = '2',
    gap = 'md',
    columns = [],
  } = block.props as {
    count?: string;
    gap?: string;
    columns?: ColumnDef[];
  };

  const gapMap: Record<string, string> = {
    sm: 'var(--sp-2)',
    md: 'var(--sp-4)',
    lg: 'var(--sp-6)',
  };

  const widthMap: Record<string, string> = {
    auto: '1fr',
    '1/3': '1fr',
    '1/2': '1fr',
    '2/3': '2fr',
  };

  const gridCols = columns.length > 0
    ? columns.map((col) => widthMap[col.width ?? 'auto'] ?? '1fr').join(' ')
    : `repeat(${count}, 1fr)`;

  return (
    <div
      className="wb-block-columns"
      style={{
        display: 'grid',
        gridTemplateColumns: gridCols,
        gap: gapMap[gap] ?? gapMap.md,
      }}
    >
      {columns.map((_, i) => (
        <div key={i} className="wb-block-columns__col">
          {children}
        </div>
      ))}
    </div>
  );
}
