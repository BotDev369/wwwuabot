/**
 * Єдина таблиця проєкту (docs/DESIGN_SYSTEM.md §27): окремих таблиць немає ні в
 * адмінці, ні в платформі. Рамка скролить у обидва боки, шапка й перший стовпець
 * закріплені, у комірок немає заливки — рядок тримає межа.
 * @module packages/ui/src/table/DataTable
 */

import { type CSSProperties, type ReactNode, useRef } from "react";

import { useStickyHeader } from "./useStickyHeader";

export interface DataTableColumn<T> {
  /** Ім'я колонки: ключ для React, не підпис. */
  readonly key: string;
  /** Підпис у шапці — текст або кнопка сортування. */
  readonly header: ReactNode;
  /** Клас комірки й шапки: ширина, тип даних (`wb-col-num`). */
  readonly className?: string;
  /** Мінімальна ширина в px: нею колонка тримає форму при скролі вбік. */
  readonly width?: number;
  /** Зсув закріплення зліва для другої й далі закріпленої колонки. */
  readonly pin?: number;
  readonly render: (row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  readonly columns: readonly DataTableColumn<T>[];
  readonly rows: readonly T[];
  readonly rowKey: (row: T) => string;
  /** Що показати, коли рядків немає: причина, а не «немає даних». */
  readonly empty: string;
  readonly onRowClick?: (row: T) => void;
  /** Ключ вибраного рядка: позначається акцентом, а не заливкою даних. */
  readonly selectedKey?: string | null;
  /** Підпис над таблицею: скільки показано / за який період. */
  readonly caption?: string;
  /** Клас таблиці: ширина колонок — рішення конкретної таблиці. */
  readonly tableClassName?: string;
  /** Мінімальна ширина полотна: вужче — їде горизонтальний скрол. */
  readonly minWidth?: number;
  /**
   * Висота рамки для таблиці в обмеженому місці (прев'ю в картці). Типово
   * висоти немає: таблиця росте на всю довжину, а гортається сторінка.
   */
  readonly maxHeight?: string;
  readonly rowClassName?: (row: T) => string;
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
  minWidth,
  maxHeight,
  rowClassName,
}: DataTableProps<T>) {
  const frame = useRef<HTMLDivElement>(null);
  useStickyHeader(frame);

  return (
    <div
      ref={frame}
      className={maxHeight ? "wb-table-scroll wb-table-scroll--capped" : "wb-table-scroll"}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table
        className={`wb-table${tableClassName ? ` ${tableClassName}` : ""}`}
        style={minWidth ? { minWidth } : undefined}
      >
        {caption && <caption className="wb-table-caption">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cellClass(column)}
                style={cellStyle(column)}
              >
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
            rows.map((row, index) => {
              const key = rowKey(row);
              const selected = selectedKey != null && selectedKey === key;

              return (
                <tr
                  key={key}
                  className={[
                    onRowClick ? "wb-table-row--click" : "",
                    selected ? "wb-table-row--on" : "",
                    rowClassName ? rowClassName(row) : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
                    <td key={column.key} className={cellClass(column)} style={cellStyle(column)}>
                      {column.render(row, index)}
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

function cellClass<T>(column: DataTableColumn<T>): string | undefined {
  if (column.pin === undefined) return column.className;
  return column.className ? `${column.className} wb-table-pin` : "wb-table-pin";
}

function cellStyle<T>(column: DataTableColumn<T>): CSSProperties | undefined {
  if (column.pin === undefined && column.width === undefined) return undefined;

  return {
    ...(column.pin !== undefined ? { left: column.pin } : null),
    ...(column.width !== undefined ? { minWidth: column.width } : null),
  };
}
