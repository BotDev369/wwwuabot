/**
 * Аналітика трекера — окрема поверхня, а не сторінка: серія акордеонів із
 * періодами (рік → місяць → тиждень → день → година → 15 хв → довільний
 * проміжок) і історія під власним акордеоном. Стан відкритості живе в
 * `localStorage`, бо це вибір людини, а не налаштування сервера.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerAnalyticsModal
 */

import { useMemo, type ReactElement, type ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  trackerHourBuckets,
  trackerMinuteBuckets,
  trackerMode,
  trackerMonthBuckets,
  trackerMonthDayBuckets,
  trackerWeekBuckets,
  trackerYearBuckets,
  type Tracker,
  type TrackerBucket,
} from "@wwwuabot/shared/trackers";
import { TrackerBucketChart } from "./TrackerBucketChart";
import { TrackerHistoryList } from "./TrackerHistoryList";
import { TrackerRangePanel } from "./TrackerRangePanel";
import { nowStamp } from "./trackers-view";
import { useGroupAccordion } from "./useGroupAccordion";
import { useTracker } from "./useTracker";

/** Ключ сховища: які акордеони аналітики відкриті. */
const STORAGE_KEY = "wb-tracker-analytics-open";

const HISTORY_KEY = "history";
const RANGE_KEY = "range";

interface TrackerAnalyticsModalProps {
  tracker: Tracker;
  onClose: () => void;
}

interface AnalyticsPanelProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function AnalyticsPanel({ title, open, onToggle, children }: AnalyticsPanelProps): ReactElement {
  return (
    <section className="wb-tp-panel">
      <button type="button" className="wb-tp-panel-head" aria-expanded={open} onClick={onToggle}>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
        <span className="wb-tp-panel-title">{title}</span>
      </button>
      {open && <div className="wb-tp-panel-body">{children}</div>}
    </section>
  );
}

export function TrackerAnalyticsModal({
  tracker,
  onClose,
}: TrackerAnalyticsModalProps): ReactElement {
  const state = useTracker(tracker.id, { allHistory: true });
  const accordion = useGroupAccordion(STORAGE_KEY);

  // Поки відповідь летить, картка вже показує те, що прийшло зі стрічкою.
  const shown = state.tracker ?? tracker;
  const mode = trackerMode(shown);
  const entries = state.entries;
  const endDay = state.endDay;

  const panels = useMemo(() => {
    if (!endDay) return [] as { key: string; title: string; buckets: TrackerBucket[] }[];
    const options = { mode, valueType: shown.valueType };
    const clock = nowStamp();
    return [
      { key: "years", title: "Всього", buckets: trackerYearBuckets(entries, endDay, options) },
      { key: "months", title: "Помісячно", buckets: trackerMonthBuckets(entries, endDay, options) },
      {
        key: "month",
        title: "Поточний місяць",
        buckets: trackerMonthDayBuckets(entries, endDay, options),
      },
      { key: "week", title: "Тиждень", buckets: trackerWeekBuckets(entries, endDay, options) },
      { key: "day", title: "День", buckets: trackerHourBuckets(entries, endDay, options) },
      {
        key: "hour",
        title: "Година",
        buckets: trackerMinuteBuckets(entries, clock, { ...options, size: 5, count: 12 }),
      },
      {
        key: "quarter",
        title: "15 хв",
        buckets: trackerMinuteBuckets(entries, clock, { ...options, size: 1, count: 15 }),
      },
    ];
  }, [entries, endDay, mode, shown.valueType]);

  const keys = [...panels.map((panel) => panel.key), RANGE_KEY, HISTORY_KEY];
  const allOpen = accordion.allOpen(keys);

  return (
    <MenuModal
      title="Аналітика"
      variant="card"
      onClose={onClose}
      header={
        <div className="wb-tp-tools">
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            disabled={!endDay}
            onClick={() => accordion.setAll(keys, !allOpen)}
          >
            {allOpen ? "Згорнути все" : "Розгорнути все"}
          </button>
        </div>
      }
      content={
        <div className="wb-tracker-analytics">
          {state.loading && <p className="wb-text-muted">Завантаження…</p>}

          {!state.loading && state.error && (
            <div className="wb-empty">
              <p className="wb-empty-text">{state.error}</p>
              <button className="wb-btn wb-btn-secondary" onClick={() => void state.reload()}>
                Повторити
              </button>
            </div>
          )}

          {!state.loading && !state.error && endDay && (
            <>
              {panels.map((panel) => (
                <AnalyticsPanel
                  key={panel.key}
                  title={panel.title}
                  open={accordion.isOpen(panel.key)}
                  onToggle={() => accordion.toggle(panel.key)}
                >
                  <TrackerBucketChart
                    buckets={panel.buckets}
                    mode={mode}
                    valueType={shown.valueType}
                    goal={shown.goal}
                    unit={shown.unit}
                    title={`${shown.title} — ${panel.title}`}
                  />
                </AnalyticsPanel>
              ))}

              <AnalyticsPanel
                title="Довільний проміжок"
                open={accordion.isOpen(RANGE_KEY)}
                onToggle={() => accordion.toggle(RANGE_KEY)}
              >
                <TrackerRangePanel
                  entries={entries}
                  endDay={endDay}
                  mode={mode}
                  valueType={shown.valueType}
                  goal={shown.goal}
                  unit={shown.unit}
                  title={shown.title}
                />
              </AnalyticsPanel>

              <AnalyticsPanel
                title="Історія"
                open={accordion.isOpen(HISTORY_KEY)}
                onToggle={() => accordion.toggle(HISTORY_KEY)}
              >
                <TrackerHistoryList tracker={shown} entries={entries} onRemove={state.remove} />
              </AnalyticsPanel>
            </>
          )}
        </div>
      }
    />
  );
}
