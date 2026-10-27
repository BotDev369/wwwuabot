/**
 * Графік періодів: підписи періодів у шапці зверху, тонка лінія між
 * колонками — щоб сусідні періоди можна було порівнювати очима. Суми стоять
 * стовпчиками, виміри — точками в смузі значень: стовпчик від нуля для ваги
 * 78–79 кг — пласка лінія на всю висоту. Порожня колонка — сіра крапка.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerBucketChart
 */

import type { CSSProperties, ReactElement } from "react";
import {
  formatTrackerAmount,
  type TrackerBucket,
  type TrackerMode,
  type TrackerValueType,
} from "@wwwuabot/shared/trackers";
import { readingBand } from "./trackers-view";

interface TrackerBucketChartProps {
  buckets: readonly TrackerBucket[];
  mode: TrackerMode;
  valueType: TrackerValueType;
  goal: number | null;
  unit: string;
  /** Назва мірки — для підпису графіка й читалки. */
  title: string;
}

export function TrackerBucketChart({
  buckets,
  mode,
  valueType,
  goal,
  unit,
  title,
}: TrackerBucketChartProps): ReactElement {
  const values = buckets
    .map((bucket) => bucket.value)
    .filter((value): value is number => value !== null);

  if (values.length === 0) {
    return <p className="wb-tp-empty">Немає записів за цей період</p>;
  }

  // «Так-ні» — теж стовпчики: це лічба днів, а в лічбі нуль осмислений.
  const bars = mode === "sum" || valueType === "boolean";
  const highest = Math.max(...values);
  // Запас над найвищим стовпчиком: без нього єдиний запис стоїть на всю
  // висоту й читається як поломка.
  const peak = Math.max(goal ?? 0, highest * 1.12, 1);
  const band = readingBand(values, goal);
  const span = band.max - band.min || 1;
  /** Висота в процентах від низу поля — та сама шкала для стовпчика й точки. */
  const share = (value: number): number =>
    bars ? (value / peak) * 100 : ((value - band.min) / span) * 100;

  const summary = `${title}: ${values.length} з ${buckets.length} періодів із записом. Найбільше — ${formatTrackerAmount(highest, unit)}.`;

  function slotTitle(bucket: TrackerBucket): string {
    return bucket.value === null
      ? `${bucket.label} — без запису`
      : `${bucket.label} — ${formatTrackerAmount(bucket.value, unit)}`;
  }

  return (
    <div className="wb-tp-chart">
      <div className="wb-tp-scroll">
        <div className="wb-tp-inner">
          <div className="wb-tp-head">
            {buckets.map((bucket) => (
              <span className="wb-tp-cell wb-tp-cell--head" key={bucket.key}>
                {bucket.label}
              </span>
            ))}
          </div>
          <div className="wb-tp-plot" role="img" aria-label={summary}>
            {goal !== null && (
              <span
                className="wb-tp-goal"
                style={{ bottom: `${Math.min(100, Math.max(0, share(goal)))}%` } as CSSProperties}
                aria-hidden="true"
              />
            )}
            {buckets.map((bucket) => (
              <span className="wb-tp-cell wb-tp-slot" key={bucket.key} title={slotTitle(bucket)}>
                {bucket.value === null ? (
                  <span className="wb-tp-void" aria-hidden="true" />
                ) : bars ? (
                  <span
                    className="wb-tp-bar"
                    style={{ height: `${share(bucket.value)}%` } as CSSProperties}
                  />
                ) : (
                  <span
                    className="wb-tp-dot"
                    style={{ bottom: `${share(bucket.value)}%` } as CSSProperties}
                  />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
      {goal !== null && <p className="wb-tp-note">ціль {formatTrackerAmount(goal, unit)}</p>}
    </div>
  );
}
