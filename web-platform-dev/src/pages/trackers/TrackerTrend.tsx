/**
 * Графік вимірів: лінія по записах у часі, точки — самі записи.
 *
 * Це не «стовпчик дня», бо вимір не додається до дня: два зважування за день —
 * два виміри, а не сума. Діапазон будує `readingBand` — навколо значень.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerTrend
 */

import type { CSSProperties, ReactElement } from "react";
import { formatTrackerAmount, type TrackerEntry } from "@wwwuabot/shared/trackers";
import { dayLabel, readingBand } from "./trackers-view";

interface TrackerTrendProps {
  /** Записи вікна — хронологічно, від старішого до останнього. */
  records: readonly TrackerEntry[];
  goal: number | null;
  unit: string;
  title: string;
}

export function TrackerTrend({ records, goal, unit, title }: TrackerTrendProps): ReactElement {
  if (records.length === 0) {
    return (
      <div className="wb-tracker-chart">
        <p className="wb-tracker-chart-empty">Немає записів за цей період</p>
      </div>
    );
  }

  const band = readingBand(
    records.map((record) => record.value),
    goal,
  );
  const height = band.max - band.min || 1;
  const share = (value: number): number =>
    Math.min(100, Math.max(0, ((value - band.min) / height) * 100));

  const last = records[records.length - 1];
  const first = records[0];
  // Один запис — точка на правому краї: вона і є «останній вимір», а лінії немає.
  const pointX = (index: number): number =>
    records.length === 1 ? 100 : (index / (records.length - 1)) * 100;
  const line = records
    .map((record, index) => `${pointX(index).toFixed(2)},${(100 - share(record.value)).toFixed(2)}`)
    .join(" ");

  const summary = `${title}: ${records.length} записів. Останній — ${formatTrackerAmount(last.value, unit)} ${dayLabel(last.day)}${goal === null ? "" : `, ціль ${formatTrackerAmount(goal, unit)}`}.`;

  return (
    <div className="wb-tracker-chart">
      {/* Тло й сітка — ті самі, що в стовпчиків: та сама шкала, лише інша міра. */}
      <div className="wb-tracker-chart-plot" role="img" aria-label={summary}>
        {/* Лінія — в SVG, точки — окремі елементи: `preserveAspectRatio="none"`
            тягне кола в еліпси, а кругла точка мусить лишатись круглою. */}
        <svg
          className="wb-tracker-trend-line"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polyline points={line} />
        </svg>
        {goal !== null && (
          <span
            className="wb-tracker-goal-line"
            style={{ bottom: `${share(goal)}%` } as CSSProperties}
            aria-hidden="true"
          />
        )}
        {records.map((record, index) => (
          <span
            className={
              index === records.length - 1
                ? "wb-tracker-dot wb-tracker-dot--last"
                : "wb-tracker-dot"
            }
            key={record.id}
            style={
              { left: `${pointX(index)}%`, bottom: `${share(record.value)}%` } as CSSProperties
            }
            title={`${dayLabel(record.day)} — ${formatTrackerAmount(record.value, unit)}`}
          />
        ))}
      </div>
      <div className="wb-tracker-chart-axis">
        <span>{dayLabel(first.day)}</span>
        {goal !== null && <span>ціль {formatTrackerAmount(goal, unit)}</span>}
        <span>{dayLabel(last.day)}</span>
      </div>
    </div>
  );
}
