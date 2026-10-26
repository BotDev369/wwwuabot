/**
 * Пріоритет — **одна шкала на всі мірки**: «Відсутній» і 1–9, тож кнопок
 * десять. У виборі рівня для трекера числа на кнопках нічого не кажуть; у
 * фільтрі — кажуть, скільки мірок на кожному рівні, і повертають «усі».
 *
 * @module web-platform-dev/src/pages/trackers/TrackerPriorityModal
 */

import type { ReactElement } from "react";
import { MenuModal } from "@wwwuabot/ui/menu";
import { TRACKER_PRIORITIES, trackerPriorityLabel } from "@wwwuabot/shared/trackers";

interface TrackerPriorityModalProps {
  title: string;
  /** Теперішній рівень: `null` — «Відсутній», `undefined` — «усі» (лише фільтр). */
  value: number | null | undefined;
  /** Рахунок на кнопках і кнопка «Усі»: немає — це вибір рівня, а не фільтр. */
  counts?: ReadonlyMap<number | null, number>;
  onPick: (priority: number | null | undefined) => void;
  onClose: () => void;
}

export function TrackerPriorityModal({
  title,
  value,
  counts,
  onPick,
  onClose,
}: TrackerPriorityModalProps): ReactElement {
  function button(priority: number | null, wide: boolean): ReactElement {
    const label = trackerPriorityLabel(priority);
    // У фільтрі число є завжди — і нуль теж: «порожньо на цьому рівні» теж
    // відповідь, а кнопка без числа читалась би як незаповнена.
    const count = counts === undefined ? undefined : (counts.get(priority) ?? 0);
    return (
      <button
        key={String(priority)}
        type="button"
        className={
          "wb-priority-btn" +
          (wide ? " wb-priority-btn--wide" : "") +
          (value === priority ? " wb-priority-btn--on" : "")
        }
        aria-pressed={value === priority}
        aria-label={count === undefined ? label : `${label}: трекерів ${count}`}
        onClick={() => onPick(priority)}
      >
        <span className="wb-priority-label">{label}</span>
        {count !== undefined && (
          <span className={"wb-priority-count" + (count === 0 ? " wb-priority-count--zero" : "")}>
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <MenuModal
      title={title}
      onClose={onClose}
      header={
        counts === undefined ? undefined : (
          <div className="wb-group-picker-tools">
            <button
              type="button"
              className="wb-btn wb-btn-secondary"
              aria-pressed={value === undefined}
              onClick={() => onPick(undefined)}
            >
              Усі трекери
            </button>
          </div>
        )
      }
      content={
        <div className="wb-priority-grid">
          {button(null, true)}
          {TRACKER_PRIORITIES.map((priority) => button(priority, false))}
        </div>
      }
    />
  );
}
