/**
 * Page Builder — DateAnalysisBlock: екран «Аналіз дат».
 * Дат може бути одна або більше: вибір систем спільний, а результат — таблиця,
 * де кожна дата має свій стовпець. Тому дати їдуть `?dates=`, а `?sys=` означає
 * крок результатів; порожній `?sys=` — крок вибору.
 *
 * @module packages/ui/src/blocks/DateAnalysisBlock
 */

import { useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DATE_ANALYSIS_PATH, DATE_ANALYSIS_RESULT_PATH } from "@wwwuabot/shared/content";
import { SystemsPicker } from "./systems-picker";
import { mydateTitle } from "./mydate/screen-title";
import { AnalysisTable } from "./date-analysis/AnalysisTable";
import { listFrom, readDates } from "./date-analysis/date-params";
import { useAnalysisTable } from "./date-analysis/useAnalysisTable";

export function DateAnalysisBlock({ block }: BlockComponentProps) {
  const {
    title: storedTitle,
    backUrl = DATE_ANALYSIS_PATH,
    targetUrl = DATE_ANALYSIS_RESULT_PATH,
  } = block.props as {
    title?: string;
    backUrl?: string;
    targetUrl?: string;
  };

  const title = mydateTitle("analysis", storedTitle);

  // Адреса читається один раз за прохід екрана: крок змінюється переходом на
  // іншу адресу, а не станом цього компонента.
  const dates = useMemo(() => readDates(window.location.search), []);
  const systemIds = useMemo(
    () => listFrom(new URLSearchParams(window.location.search).get("sys")),
    [],
  );
  const parameterKeys = useMemo(
    () => listFrom(new URLSearchParams(window.location.search).get("p")),
    [],
  );

  const table = useAnalysisTable(dates, systemIds, parameterKeys);

  if (dates.length === 0) {
    return (
      <div className="wb-block-date-analysis">
        <p className="wb-text-muted">Немає дат для аналізу.</p>
        <a className="wb-btn wb-btn-secondary" href={backUrl}>
          Обрати дати
        </a>
      </div>
    );
  }

  const values = dates.join(",");

  if (systemIds.length === 0) {
    return (
      <div className="wb-block-date-analysis">
        <SystemsPicker
          className="wb-block-systems-picker"
          title="Оберіть системи та параметри"
          lead={`Дат в аналізі: ${dates.length}`}
          confirmLabel="Аналізувати"
          emptyText="Немає дат для аналізу."
          valueParam="dates"
          values={values}
          targetUrl={targetUrl}
        />
      </div>
    );
  }

  return (
    <div className="wb-block-date-analysis">
      <h2 className="wb-block-date-analysis__title">{title}</h2>

      {table.error && (
        <p className="wb-text-sm" style={{ color: "var(--color-danger, #ef4444)" }}>
          {table.error}
        </p>
      )}

      {table.loading && <p className="wb-text-sm wb-text-muted">Аналізуємо...</p>}

      {!table.error && (
        <AnalysisTable
          dates={dates}
          rows={table.rows}
          matrix={table.matrix}
          details={table.details}
          names={table.names}
        />
      )}

      {/* Крок вибору — та сама адреса без `?sys=`: повернення не має губити дати. */}
      <a
        className="wb-btn wb-btn-secondary"
        href={`${targetUrl}?dates=${encodeURIComponent(values)}`}
        style={{ marginTop: "var(--sp-4)" }}
      >
        Змінити системи
      </a>
    </div>
  );
}
