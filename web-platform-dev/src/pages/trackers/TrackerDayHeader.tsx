/**
 * Шапка таблиці: день тижня над числом, сьогодні першою колонкою.
 *
 * Дій екрана тут немає — вони в контекстному футері (`ContextBar`): у клітинці
 * назви вони забирали рядок у дат. Порожня клітинка лишається — вона тримає
 * сітку з рядками, і дати стоять рівно над своїми числами.
 * @module web-platform-dev/src/pages/trackers/TrackerDayHeader
 */

import type { ReactElement } from "react";
import { matrixDayNumber, matrixWeekday } from "./trackers-view";

export function TrackerDayHeader({ days }: { days: readonly string[] }): ReactElement {
  return (
    <div className="wb-matrix-head">
      <span className="wb-matrix-head-lead" aria-hidden="true" />
      {days.map((day) => (
        <span key={day} className="wb-matrix-head-day" aria-hidden="true">
          <span className="wb-matrix-head-weekday">{matrixWeekday(day)}</span>
          <span className="wb-matrix-head-date">{matrixDayNumber(day)}</span>
        </span>
      ))}
    </div>
  );
}
