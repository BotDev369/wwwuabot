/**
 * Єдина таблиця адмінки: закріплені шапка й перший стовпець (`components.css`)
 * і телефонний режим, де рядок лишає підпис, а числа переходять у `dl` під ним.
 * Ширина колонок — клас конкретної таблиці.
 * @module web-admin-dev/src/shared/components/DataTable
 */

import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  /** Ім'я колонки: ключ для React, не підпис. */
  readonly key: string;
  readonly header: string;
  /** Клас комірки й шапки: ширина, вирівнювання, тип даних. */
  readonly className?: string;
  readonly render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  /** Що показати, коли рядків немає: причина, а не «немає даних». */
  readonly empty: string;
  readonly onRowClick?: (row: T) => void;
  /** Ключ вибраного рядка: підписується акцентом, а не заливкою даних. */
  readonly selectedKey?: string | null;
  /** Підпис над таблицею: скільки показано / за який період. */
  readonly caption?: string;
  /** Клас таблиці: ширина колонок — рішення конкретної таблиці. */
  readonly tableClassName?: string;
  /**
   * Підпис рядка на телефоні: пари `<dt>`/`<dd>` під назвою.
   *
   * На вузькому екрані стовпці не влазять, а горизонтальний скрол на телефоні
   * не працює — тож числа переїжджають під назву, а не обрізаються. Без цього
   * пропу таблиця лишається звичайною і переносить текст у клітинках.
   */
  readonly mobileMeta?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  selectedKey,
  caption,
  tableClassName,
  mobileMeta,
}: DataTableProps<T>) {
  return (
    <div className="wb-table-scroll">
      <table
        className={`wb-table wb-table--grid${mobileMeta ? " wb-table--stack" : ""} ${
          tableClassName ?? ""
        }`.trim()}
      >
        {caption && <caption className="wb-table-caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="wb-table-empty" colSpan={columns.length}>
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              const selected = selectedKey != null && selectedKey === key;

              return (
                <tr
                  key={key}
                  className={`wb-table-row${onRowClick ? " wb-table-row--click" : ""}${
                    selected ? " wb-table-row--on" : ""
                  }`}
                  tabIndex={onRowClick ? 0 : undefined}
                  aria-current={selected ? "true" : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          onRowClick(row);
                        }
                      : undefined
                  }
                >
                  {columns.map((column, index) => (
                    <td key={column.key} className={column.className}>
                      {column.render(row)}
                      {index === 0 && mobileMeta && (
                        <dl className="wb-table-meta">{mobileMeta(row)}</dl>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
