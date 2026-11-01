/**
 * Page Builder — Columns Block.
 * Container with 2 or 3 columns. Each column holds child blocks rendered by ZoneRenderer.
 * Props.columns[].children are PageBlock arrays — the ZoneRenderer recurses into them.
 * Ширину колонок задає CSS (на телефоні — стовпчик); з props береться лише
 * їх кількість, бо це структура, а не вигляд.
 * @module packages/ui/src/blocks/ColumnsBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface ColumnDef {
  width?: string;
  children?: unknown[];
}

export function ColumnsBlock({ block, children }: BlockComponentProps) {
  const { count = "2", columns = [] } = block.props as {
    count?: string;
    columns?: ColumnDef[];
  };

  const span = count === "3" ? 3 : 2;

  return (
    <div className={`wb-block-columns wb-block-columns--${span}`}>
      {columns.length > 0
        ? columns.map((_, i) => (
            <div key={i} className="wb-block-columns__col">
              {children}
            </div>
          ))
        : Array.from({ length: span }, (_, i) => (
            <div key={i} className="wb-block-columns__col">
              {children}
            </div>
          ))}
    </div>
  );
}
