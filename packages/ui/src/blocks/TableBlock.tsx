/**
 * Page Builder — Table Block. Малює ту саму таблицю, що й адмінка: окремих
 * таблиць у продукті немає (`DataTable`).
 *
 * @module packages/ui/src/blocks/TableBlock
 */

import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DataTable, type DataTableColumn } from "../table/DataTable";

/** Рядок блока: комірки в порядку заголовків. */
interface TableRow {
  readonly id: number;
  readonly cells: readonly string[];
}

export function TableBlock({ block }: BlockComponentProps) {
  const { headers = [], rows = [] } = block.props as {
    headers?: string[];
    rows?: string[][];
  };

  if (headers.length === 0) return null;

  const columns: readonly DataTableColumn<TableRow>[] = headers.map((header, index) => ({
    key: `${index}`,
    header,
    width: 120,
    render: (row) => row.cells[index] ?? "",
  }));

  return (
    <div className="wb-block-table">
      <DataTable
        columns={columns}
        rows={rows.map((cells, id) => ({ id, cells }))}
        rowKey={(row) => String(row.id)}
        empty="Таблиця без рядків."
        minWidth={headers.length * 120}
      />
    </div>
  );
}
