/**
 * Таблиця аналізу: рядок — параметр, стовпець — дата. Дат може бути одна й
 * більше, тож «одна дата» — окремий випадок цієї таблиці, а не окремий екран.
 * Рядок розкривається в пояснення параметра й трактування значення кожної дати.
 *
 * @module packages/ui/src/blocks/date-analysis/AnalysisTable
 */

import { Fragment } from "react";
import { Icon } from "@wwwuabot/shared";
import { useExpansion } from "@wwwuabot/ui/hooks";
import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";
import type { CompareDetails, CompareMatrix } from "./api";
import type { AnalysisRow } from "./useAnalysisTable";

export function AnalysisTable({
  dates,
  rows,
  matrix,
  details,
  names,
}: {
  dates: string[];
  rows: AnalysisRow[];
  matrix: CompareMatrix;
  details: CompareDetails;
  names: Record<string, string>;
}) {
  const { isExpanded, toggleExpanded } = useExpansion();

  return (
    <div className="wb-param-frame">
      <table className="wb-param-table wb-param-table--compare">
        <thead>
          <tr>
            <th scope="col">Параметр</th>
            {dates.map((date) => (
              <th key={date} scope="col">
                <span className="wb-param-date">{formatDate(date)}</span>
                {names[date] ? <span className="wb-param-date__name">{names[date]}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = `${row.systemId}:${row.key}`;
            const open = isExpanded(rowId);
            const showSystem = index === 0 || rows[index - 1].systemId !== row.systemId;
            return (
              <Fragment key={rowId}>
                {showSystem && (
                  <tr className="wb-param-group">
                    {/* Назва системи — у першому стовпці: комірка на всю ширину
                        обрізалась на краю екрана. */}
                    <td>{row.systemName}</td>
                    {dates.map((date) => (
                      <td key={date} />
                    ))}
                  </tr>
                )}
                <tr>
                  <td className="wb-param-cell--toggle">
                    <button
                      type="button"
                      className={open ? "wb-param-toggle wb-param-toggle--open" : "wb-param-toggle"}
                      aria-expanded={open}
                      onClick={() => toggleExpanded(rowId)}
                    >
                      <span>{row.label}</span>
                      <span className="wb-param-toggle__caret">
                        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
                      </span>
                    </button>
                  </td>
                  {dates.map((date) => (
                    <td key={date} className="wb-param-value">
                      {matrix[date]?.[row.systemId]?.[row.key] ?? "—"}
                    </td>
                  ))}
                </tr>
                {open && (
                  <tr className="wb-param-detail">
                    <td>{row.about ?? "—"}</td>
                    {dates.map((date) => (
                      <td key={date}>{details[date]?.[row.systemId]?.[row.key]?.meaning ?? "—"}</td>
                    ))}
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={dates.length + 1}
                className="wb-text-sm wb-text-muted"
                style={{ textAlign: "center", padding: "var(--sp-4)" }}
              >
                Немає даних для відображення
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
