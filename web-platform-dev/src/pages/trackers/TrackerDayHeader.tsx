/**
 * Шапка матриці: день тижня над числом, сьогодні першою колонкою. Вона не
 * прикраса — без неї чотири стовпчики чисел не мають адреси, і «400» не
 * відрізнити від «позавчора».
 *
 * @module web-platform-dev/src/pages/trackers/TrackerDayHeader
 */

import type { ReactElement } from "react";
import { matrixDayNumber, matrixWeekday } from "./trackers-view";

export function TrackerDayHeader({ days }: { days: readonly string[] }): ReactElement {
  return (
    <div className="wb-matrix-head" aria-hidden="true">
      <span className="wb-matrix-head-spacer" />
      {days.map((day) => (
        <span key={day} className="wb-matrix-head-day">
          <span className="wb-matrix-head-weekday">{matrixWeekday(day)}</span>
          <span className="wb-matrix-head-date">{matrixDayNumber(day)}</span>
        </span>
      ))}
    </div>
  );
}
