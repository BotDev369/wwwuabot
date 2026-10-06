/**
 * Page Builder — DateAnalysisBlock.
 *
 * Аналіз однієї дати — окремий процес: спершу вибір систем і параметрів,
 * і лише звідти результати — картки з **трактуванням** кожного значення.
 *
 * @module packages/ui/src/blocks/DateAnalysisBlock
 */

import { useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { formatDate, isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";
import { SystemsPicker } from "./systems-picker";
import { useDateAnalysis } from "./date-analysis/useDateAnalysis";
import type { AnalysisSystem, SystemResult } from "./mydate/api";

const CARD_STYLE = {
  padding: "var(--sp-5)",
  background: "var(--bg-1, var(--bg-home, #f0f2f5))",
  border: "1px solid var(--border-subtle, #e2e8f0)",
  borderRadius: "var(--radius-lg)",
} as const;

/**
 * Параметр із трактуванням: значення праворуч, пояснення — під ним, на всю
 * ширину. Поруч із значенням пояснення не влізло б на 360px.
 */
function ParameterRow({ parameter }: { parameter: SystemResult["parameters"][number] }) {
  return (
    <div
      style={{
        padding: "var(--sp-2) 0",
        borderBottom: "1px solid var(--border-subtle, #e2e8f0)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "var(--sp-3)",
        }}
      >
        <span className="wb-text-sm">{parameter.label}</span>
        <strong className="wb-text-sm">{parameter.value}</strong>
      </div>
      {parameter.hint && (
        <p className="wb-text-xs wb-text-muted" style={{ margin: "var(--sp-1) 0 0" }}>
          {parameter.hint}
        </p>
      )}
    </div>
  );
}

/** Одна система зі своїм результатом. */
function SystemCard({
  system,
  result,
  parameterKeys,
}: {
  system: AnalysisSystem;
  result: SystemResult | undefined;
  parameterKeys: string[];
}) {
  const parameters = (result?.parameters ?? []).filter(
    (parameter) => parameterKeys.length === 0 || parameterKeys.includes(parameter.key),
  );

  return (
    <div style={CARD_STYLE}>
      <h3 style={{ margin: "0 0 var(--sp-3) 0" }}>{system.name}</h3>

      {result ? (
        <div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {parameters.map((parameter) => (
              <ParameterRow key={parameter.key} parameter={parameter} />
            ))}
          </div>
          {result.comingSoon.length > 0 && (
            <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-3)" }}>
              Скоро підключимо: {result.comingSoon.join(", ")}
            </p>
          )}
        </div>
      ) : (
        <p className="wb-text-sm wb-text-muted" style={{ margin: 0 }}>
          {system.description}
        </p>
      )}
    </div>
  );
}

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--sp-4)",
        }}
      >
        {(state.systems ?? []).map((system) => (
          <SystemCard
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
      <p className="wb-text-sm wb-text-muted" style={{ marginBottom: "var(--sp-4)" }}>
        Ви вказували дату: <strong>{formatDate(date)}</strong>
      </p>
      <DateAnalysisFlow date={date} title={title} targetUrl={targetUrl} />
    </div>
  );
}
