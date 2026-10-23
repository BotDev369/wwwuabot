/**
 * Рядок матриці: назва (відкриває картку запису) і значення днів, сьогодні
 * першим. Назва й сьогоднішня клітинка — запис (`TrackerEntryModal`), минула —
 * картка трекера: минулі виміри живуть у звіті й історії.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerMatrixRow
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Tracker } from "@wwwuabot/shared/trackers";
import { cellAmount, matrixDayLabel, type TrackerCellView } from "./trackers-view";

interface TrackerMatrixRowProps {
  tracker: Tracker;
  cells: readonly TrackerCellView[];
  today: string;
  /** Дотик на назву або сьогоднішню клітинку — модалка запису. */
  onOpen: () => void;
  /** Минулий день — картка трекера: звіт та історія. */
  onOpenHistory: () => void;
}

interface CellClassInput {
  empty: boolean;
  goal: boolean;
}

function cellClass({ empty, goal }: CellClassInput): string {
  return (
    "wb-matrix-cell" +
    (empty ? " wb-matrix-cell--empty" : "") +
    (goal ? " wb-matrix-cell--goal" : "")
  );
}

export function TrackerMatrixRow({
  tracker,
  cells,
  today,
  onOpen,
  onOpenHistory,
}: TrackerMatrixRowProps): ReactElement {
  const name = (
    <>
      <span className="wb-matrix-icon">
        <Icon name={tracker.icon} size={16} />
      </span>
      <span className="wb-matrix-title">{tracker.title}</span>
    </>
  );

  return (
    <li className="wb-matrix">
      <div className="wb-matrix-row">
        <button type="button" className="wb-matrix-name" onClick={onOpen}>
          {name}
        </button>

        {cells.map((cell) => {
          const isToday = cell.day === today;
          const content = cellAmount(cell.value, tracker);
          const label = `${tracker.title}, ${matrixDayLabel(cell.day)}${content ? `: ${content}` : ""}`;
          return (
            <button
              key={cell.day}
              type="button"
              className={cellClass({
                empty: cell.value === null,
                goal: cell.goalMet,
              })}
              aria-label={label}
              onClick={isToday ? onOpen : onOpenHistory}
            >
              {tracker.valueType === "boolean" && cell.value !== null ? (
                <Icon name={cell.value > 0 ? "check" : "close"} size={16} />
              ) : content ? (
                <span className="wb-matrix-value">
                  <span className="wb-matrix-number">{content}</span>
                  {tracker.unit && <span className="wb-matrix-unit">{tracker.unit}</span>}
                </span>
              ) : (
                <span aria-hidden="true">·</span>
              )}
            </button>
          );
        })}
      </div>
    </li>
  );
}
