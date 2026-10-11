/**
 * Перемикач вигляду результатів: рядками йдуть параметри чи дати.
 *
 * Вигляд у смузі читається **словом**, а не знаком: з форми «плитки / рядки» не
 * видно, що саме стає рядками, а помилитись тут — прочитати не ту таблицю.
 *
 * @module packages/ui/src/blocks/date-analysis/AnalysisViewSwitch
 */

import type { ReactElement } from "react";
import type { AnalysisView } from "./AnalysisTable";

const OPTIONS: readonly { key: AnalysisView; label: string }[] = [
  { key: "params", label: "Параметри" },
  { key: "dates", label: "Дати" },
];

export function AnalysisViewSwitch({
  view,
  onChange,
}: {
  view: AnalysisView;
  onChange: (view: AnalysisView) => void;
}): ReactElement {
  return (
    <div className="wb-analysis-views">
      <div className="wb-segmented" role="group" aria-label="Вигляд результатів">
        {OPTIONS.map((option) => {
          const active = option.key === view;
          return (
            <button
              key={option.key}
              type="button"
              className={`wb-segmented-btn${active ? " wb-segmented-btn--active" : ""}`}
              aria-pressed={active}
              onClick={() => onChange(option.key)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
