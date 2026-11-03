/**
 * Page Builder — DateAnalysisBlock: екран результату аналізу. Суб'єктів може
 * бути кілька: вибір систем спільний, а кожен суб'єкт має свій стовпець. Дати й
 * підписи їдуть `?dates=` / `?labels=`, вид — `?kind=`, а порожній `?sys=` — це
 * ще крок вибору систем.
 *
 * @module packages/ui/src/blocks/DateAnalysisBlock
 */

import { useMemo, useState } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import {
  DATE_ANALYSIS_PATH,
  DATE_ANALYSIS_RESULT_PATH,
  SUBJECT_LABELS_QUERY,
  SUBJECT_QUERY,
  SELF_QUERY,
  encodeLabels,
  encodeScopes,
  scopeLead,
  scopePlural,
  scopeTitle,
} from "@wwwuabot/shared/content";
import { SystemsPicker } from "./systems-picker";
import { analysisScreenTitle } from "./date-analysis/screen-title";
import { AnalysisTable, type AnalysisView } from "./date-analysis/AnalysisTable";
import { AnalysisViewSwitch } from "./date-analysis/AnalysisViewSwitch";
import { listFrom, readDates, readSubject } from "./date-analysis/date-params";
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

  // Адреса читається один раз за прохід екрана: крок змінюється переходом на
  // іншу адресу, а не станом цього компонента.
  const search = window.location.search;
  const dates = useMemo(() => readDates(search), [search]);
  const subject = useMemo(() => readSubject(search, dates.length), [search, dates.length]);
  const systemIds = useMemo(() => listFrom(new URLSearchParams(search).get("sys")), [search]);
  const parameterKeys = useMemo(() => listFrom(new URLSearchParams(search).get("p")), [search]);

  const kindParam = encodeScopes(subject.kinds);
  const table = useAnalysisTable(dates, systemIds, parameterKeys, kindParam);
  const [view, setView] = useState<AnalysisView>("params");

  if (dates.length === 0) {
    return (
      <div className="wb-block-date-analysis">
        <p className="wb-text-muted">Немає суб'єктів для аналізу.</p>
        <a className="wb-btn wb-btn-secondary" href={backUrl}>
          Обрати, кого аналізувати
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
          lead={`${scopePlural(subject.scope)} в аналізі: ${dates.length}. ${scopeLead(
            subject.scope,
            subject.self,
          )}`}
          confirmLabel="Аналізувати"
          emptyText="Немає суб'єктів для аналізу."
          valueParam="dates"
          values={values}
          targetUrl={targetUrl}
          forward={{
            [SUBJECT_QUERY]: kindParam,
            [SUBJECT_LABELS_QUERY]: encodeLabels(subject.labels),
            ...(subject.self ? { [SELF_QUERY]: "1" } : {}),
          }}
        />
      </div>
    );
  }

  const heading =
    subject.self && subject.scope === "person"
      ? "Ваш аналіз:"
      : analysisScreenTitle("analysis", storedTitle);

  // Імена суб'єктів перекривають назви зі збережених дат: людина щойно написала
  // їх сама, і саме вони пояснюють, кого читають.
  const names = { ...table.names };
  subject.labels.forEach((label, index) => {
    if (label && dates[index]) names[dates[index]] = label;
  });

  return (
    <div className="wb-block-date-analysis">
      <h2 className="wb-block-date-analysis__title">{heading}</h2>
      <p className="wb-text-sm wb-text-muted wb-block-date-analysis__lead">
        {scopeTitle(subject.scope)}. {scopeLead(subject.scope, subject.self)}
      </p>

      {table.error && <p className="wb-text-sm wb-block-date-analysis__error">{table.error}</p>}

      {table.loading && <p className="wb-text-sm wb-text-muted">Аналізуємо...</p>}

      {!table.error && (
        <>
          <AnalysisViewSwitch view={view} onChange={setView} scope={subject.scope} />
          <AnalysisTable
            view={view}
            dates={dates}
            kinds={subject.kinds}
            rows={table.rows}
            matrix={table.matrix}
            details={table.details}
            names={names}
          />
        </>
      )}
    </div>
  );
}
