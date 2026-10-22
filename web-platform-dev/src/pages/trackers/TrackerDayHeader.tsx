/**
 * Шапка таблиці: дії екрана в клітинці назви, далі — день тижня над числом,
 * сьогодні першою. Дії стоять тут, а не окремим рядком: без них дати займали
 * б власний рядок, і над таблицею було б дві смуги замість однієї.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerDayHeader
 */

import type { ReactElement, ReactNode } from "react";
import { matrixDayNumber, matrixWeekday } from "./trackers-view";

export function TrackerDayHeader({
  days,
  leading,
  ordering = false,
}: {
  days: readonly string[];
  /** Дії екрана — ліворуч, у тій самій сітці, що й дні. */
  leading?: ReactNode;
  /** Режим «Порядок»: колонок дат немає, сітка — назва й стрілки. */
  ordering?: boolean;
}): ReactElement {
  return (
    <div className={"wb-matrix-head" + (ordering ? " wb-matrix-head--order" : "")}>
      <div className="wb-matrix-head-lead">{leading}</div>
      {days.map((day) => (
        <span key={day} className="wb-matrix-head-day" aria-hidden="true">
          <span className="wb-matrix-head-weekday">{matrixWeekday(day)}</span>
          <span className="wb-matrix-head-date">{matrixDayNumber(day)}</span>
        </span>
      ))}
    </div>
  );
}
