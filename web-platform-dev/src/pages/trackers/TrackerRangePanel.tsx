/**
 * Довільний проміжок: дві дати й графік за ними. До 31 дня колонка — день,
 * далі — місяць: колонка на кожен день року на телефоні не читається.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerRangePanel
 */

import { useState, type ReactElement } from "react";
import {
  addTrackerDays,
  trackerRangeBuckets,
  type TrackerEntry,
  type TrackerMode,
  type TrackerValueType,
} from "@wwwuabot/shared/trackers";
import { TrackerBucketChart } from "./TrackerBucketChart";

/** Скільки днів показує проміжок, поки людина не обрала свого. */
const DEFAULT_DAYS = 30;

interface TrackerRangePanelProps {
  entries: readonly TrackerEntry[];
  endDay: string;
  mode: TrackerMode;
  valueType: TrackerValueType;
  goal: number | null;
  unit: string;
  title: string;
}

export function TrackerRangePanel({
  entries,
  endDay,
  mode,
  valueType,
  goal,
  unit,
  title,
}: TrackerRangePanelProps): ReactElement {
  const [from, setFrom] = useState(() => addTrackerDays(endDay, -(DEFAULT_DAYS - 1)));
  const [to, setTo] = useState(endDay);
  const buckets = trackerRangeBuckets(entries, from || endDay, to || endDay, { mode, valueType });

  return (
    <div className="wb-tp-range">
      <div className="wb-tp-range-fields">
        <label className="wb-field">
          <span className="wb-label">Від</span>
          <input
            className="wb-input"
            type="date"
            value={from}
            max={to || endDay}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="wb-field">
          <span className="wb-label">До</span>
          <input
            className="wb-input"
            type="date"
            value={to}
            min={from}
            max={endDay}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
      </div>
      <TrackerBucketChart
        buckets={buckets}
        mode={mode}
        valueType={valueType}
        goal={goal}
        unit={unit}
        title={title}
      />
    </div>
  );
}
