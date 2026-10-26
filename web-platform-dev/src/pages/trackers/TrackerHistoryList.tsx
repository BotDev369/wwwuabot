/**
 * Історія вимірів: рядок — не кнопка, бо минулий вимір не редагується, лише
 * прибирається. Стоїть у аналітиці: звіт і історія читають ті самі рядки.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerHistoryList
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { trackerAmountText, type Tracker, type TrackerEntry } from "@wwwuabot/shared/trackers";
import { dayLabel, newestFirst, timeLabel } from "./trackers-view";

const HISTORY_ROWS = 30;

interface TrackerHistoryListProps {
  tracker: Tracker;
  entries: readonly TrackerEntry[];
  onRemove: (entryId: number) => Promise<boolean>;
}

export function TrackerHistoryList({
  tracker,
  entries,
  onRemove,
}: TrackerHistoryListProps): ReactElement {
  const dialog = useDialog();
  const history = newestFirst(entries).slice(0, HISTORY_ROWS);

  async function remove(entryId: number): Promise<void> {
    const ok = await dialog.confirm("Прибрати цей запис?", {
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (ok) await onRemove(entryId);
  }

  return (
    <section className="wb-tracker-history">
      <span className="wb-tracker-section-title">Історія</span>
      {history.length === 0 && <p className="wb-text-muted">Записів ще немає.</p>}
      {history.map((entry) => (
        <div className="wb-tracker-history-row" key={entry.id}>
          <span className="wb-tracker-history-day">{dayLabel(entry.day)}</span>
          <span className="wb-tracker-history-time">{timeLabel(entry.loggedAt)}</span>
          <span className="wb-tracker-history-value">
            {trackerAmountText(entry.value, tracker)}
          </span>
          {entry.note && <span className="wb-tracker-history-note">{entry.note}</span>}
          <button
            type="button"
            className="wb-tracker-history-remove"
            aria-label={`Прибрати запис ${dayLabel(entry.day)} ${timeLabel(entry.loggedAt)}`.trim()}
            title="Прибрати запис"
            onClick={() => void remove(entry.id)}
          >
            <Icon name="trash" size={16} />
          </button>
        </div>
      ))}
    </section>
  );
}
