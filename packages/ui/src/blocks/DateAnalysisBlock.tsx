/**
 * Page Builder — DateAnalysisBlock.
 *
 * Кожен параметр — рядок-акордеон: згорнутий каже «параметр — значення», а
 * розгорнутий додає пояснення параметра й трактування значення.
 *
 * @module packages/ui/src/blocks/DateAnalysisBlock
 */

import { useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { SystemsPicker } from "./systems-picker";
import { SystemParameterTable } from "./date-analysis/SystemParameterTable";
import { useDateAnalysis } from "./date-analysis/useDateAnalysis";

function DateAnalysisFlow({
  date,
  title,
  targetUrl,
}: {
  date: string;
  title: string;
  targetUrl: string;
}) {
  const state = useDateAnalysis(date);

  if (!state.chosen) {
    return (
      <SystemsPicker
        className="wb-block-systems-picker"
        title="Оберіть системи та параметри"
        lead="Позначте, що саме показати в результаті."
        confirmLabel="Аналізувати"
        emptyText="Немає дати для аналізу."
        valueParam="date"
        values={date}
        targetUrl={targetUrl}
      />
    );
  }

  return (
    <>
      <h2>{title}</h2>

      {state.error && (
        <p className="wb-text-sm" style={{ color: "var(--color-danger, #ef4444)" }}>
          {state.error}
        </p>
      )}

      {state.systems?.length === 0 && (
        <p className="wb-text-sm wb-text-muted">Немає систем, які можна показати.</p>
      )}

      <div className="wb-analysis-systems">
        {(state.systems ?? []).map((system) => (
          <SystemParameterTable
            key={system.id}
            system={system}
            result={state.analysis[system.id]}
            parameterKeys={state.parameterKeys}
          />
        ))}
      </div>

      {/* Крок вибору — той самий екран без `?sys=`: повернення не має губити дату. */}
      <a
        className="wb-btn wb-btn-secondary"
        href={`${targetUrl}?date=${date}`}
        style={{ marginTop: "var(--sp-4)" }}
      >
        Змінити системи
      </a>
    </>
  );
}

export function DateAnalysisBlock({ block }: BlockComponentProps) {
  const {
    title = "Аналіз дати",
    dateSource = "url",
    customDate = "",
    backUrl = "/mydate",
    targetUrl = "/mydate/analysis",
  } = block.props as {
    title?: string;
    dateSource?: string;
    customDate?: string;
    backUrl?: string;
    targetUrl?: string;
  };

  const date = useMemo(() => {
    if (dateSource === "custom" && customDate) return customDate;

    const pathParts = window.location.pathname.split("/");
    const lastSegment = pathParts[pathParts.length - 1] ?? "";
    if (isValidDate(lastSegment)) return lastSegment;

    const params = new URLSearchParams(window.location.search);
    const fromParam = params.get("date");
    if (fromParam && isValidDate(fromParam)) return fromParam;

    return null;
  }, [dateSource, customDate]);

  if (!date || !isValidDate(date)) {
    return (
      <div className="wb-block-date-analysis">
        <p className="wb-text-muted">Невірний формат дати.</p>
        <a className="wb-btn wb-btn-secondary" href={backUrl}>
          Спробувати ще раз
        </a>
      </div>
    );
  }

  return (
    <div className="wb-block-date-analysis">
      <DateAnalysisFlow date={date} title={title} targetUrl={targetUrl} />
    </div>
  );
}
