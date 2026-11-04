/**
 * Єдина таблиця адмінки: розмітка, що вмикає наскрізне правило закріплених
 * шапки й першого стовпця (`components.css`), і власна скрол-рамка — інакше
 * шапка їде разом зі сторінкою. Ширина колонок — клас конкретної таблиці.
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
}: DataTableProps<T>) {
  return (
    <div className="wb-table-scroll">
      <table className={`wb-table wb-table--grid ${tableClassName ?? ""}`.trim()}>
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
                  {columns.map((column) => (
                    <td key={column.key} className={column.className}>
                      {column.render(row)}
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
