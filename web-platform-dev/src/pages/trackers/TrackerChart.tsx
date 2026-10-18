/**
 * Графік трекера: стовпчик на день, пунктирна лінія цілі.
 *
 * Порожній день — порожній стовпчик, а не нуль: «не записано» і «нуль» різні.
 * Сітку малює CSS — без неї самотній стовпчик праворуч читався як поломка.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerChart
 */

import type { ReactElement } from "react";
import { formatTrackerAmount, type TrackerPoint } from "@wwwuabot/shared/trackers";
import { dayLabel } from "./trackers-view";

interface TrackerChartProps {
  points: readonly TrackerPoint[];
  goal: number | null;
  unit: string;
  title: string;
}

export function TrackerChart({ points, goal, unit, title }: TrackerChartProps): ReactElement {
  const values = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const highest = Math.max(...values);
  // Запас над найбільшим стовпчиком: без нього єдиний запис у вікні стоїть на
  // всю висоту й читається як поломка, а не як одне вимірювання.
  const peak = Math.max(goal ?? 0, highest * 1.12, 1);
  const first = points[0]?.day;
  const last = points[points.length - 1]?.day;
  const summary = `${title}: ${points.length} дн., записів ${values.length}. Найбільше — ${formatTrackerAmount(highest, unit)}.`;

  // Порожнє вікно — словами: сітка без жодного запису читалась як поламаний графік.
  if (values.length === 0) {
    return (
      <div className="wb-tracker-chart">
        <p className="wb-tracker-chart-empty">Немає записів за цей період</p>
      </div>
    );
  }

  return (
    <div className="wb-tracker-chart">
      <div className="wb-tracker-chart-plot" role="img" aria-label={summary}>
        {goal !== null && (
          <span
            className="wb-tracker-goal-line"
            style={{ bottom: `${(goal / peak) * 100}%` }}
            aria-hidden="true"
          />
        )}
        {points.map((point) => {
          const height = point.value === null ? 0 : Math.max(4, (point.value / peak) * 100);
          return (
            <span className="wb-tracker-bar-slot" key={point.day}>
              <span
                className={
                  point.value === null ? "wb-tracker-bar wb-tracker-bar--empty" : "wb-tracker-bar"
                }
                style={{ height: `${height}%` }}
                title={
                  point.value === null
                    ? `${dayLabel(point.day)} — без запису`
                    : `${dayLabel(point.day)} — ${formatTrackerAmount(point.value, unit)}`
                }
              />
            </span>
          );
        })}
      </div>
      <div className="wb-tracker-chart-axis">
        <span>{first ? dayLabel(first) : ""}</span>
        {goal !== null && <span>ціль {formatTrackerAmount(goal, unit)}</span>}
        <span>{last ? dayLabel(last) : ""}</span>
      </div>
    </div>
  );
}
