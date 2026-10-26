/**
 * Аналітика трекера — окрема поверхня, а не сторінка: графік, звіт за вікно й
 * історія вимірів. Вид мірки (`trackerMode`) вирішує форму графіка й підсумки:
 * суми читають стовпчиками, виміри — лінією.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerAnalyticsModal
 */

import { useState, type ReactElement } from "react";
import { MenuModal } from "@wwwuabot/ui/menu";
import { Tabs, tabId, tabPanelId, type TabOption } from "@wwwuabot/ui/tabs";
import {
  TRACKER_RANGES,
  formatTrackerAmount,
  trackerAmountText,
  trackerLatest,
  trackerMode,
  trackerWindow,
  type Tracker,
  type TrackerRange,
} from "@wwwuabot/shared/trackers";
import {
  buildTrackerSeries,
  trackerReadingStats,
  trackerReport,
} from "@wwwuabot/shared/trackers/analytics";
import { TrackerChart } from "./TrackerChart";
import { TrackerHistoryList } from "./TrackerHistoryList";
import { TrackerTrend } from "./TrackerTrend";
import { useTracker } from "./useTracker";
import { amountOrDash, changeLabel } from "./trackers-view";

/** Вікна аналітики — ті самі, що `TRACKER_RANGES`, лише ключем вкладки. */
const RANGE_TABS: readonly TabOption[] = TRACKER_RANGES.map((range) => ({
  key: String(range),
  label: `${range} дн.`,
}));

interface TrackerAnalyticsModalProps {
  tracker: Tracker;
  onClose: () => void;
}

export function TrackerAnalyticsModal({
  tracker,
  onClose,
}: TrackerAnalyticsModalProps): ReactElement {
  const state = useTracker(tracker.id);
  const [days, setDays] = useState<TrackerRange>(30);
  const rangeKey = String(days);

  // Поки відповідь летить, картка вже показує те, що прийшло зі стрічкою.
  const shown = state.tracker ?? tracker;
  const mode = trackerMode(shown);
  const entries = state.entries;
  // Порожній `endDay` — ще не завантажено: вікно з нього не будується.
  const windowRecords = state.endDay ? trackerWindow(entries, state.endDay, days) : [];
  const reads = trackerReadingStats(windowRecords);
  const latest = trackerLatest(entries);
  const points = state.endDay ? buildTrackerSeries(entries, state.endDay, days, mode) : [];
  const report = state.endDay
    ? trackerReport(entries, { endDay: state.endDay, days, goal: shown.goal, mode })
    : null;

  return (
    <MenuModal
      title="Аналітика"
      variant="card"
      onClose={onClose}
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

          {!state.loading && !state.error && report && (
            <>
              <Tabs
                options={RANGE_TABS}
                value={rangeKey}
                onChange={(key) => setDays(Number(key) as TrackerRange)}
                label="Вікно аналітики"
              />
              <div
                id={tabPanelId(rangeKey)}
                role="tabpanel"
                aria-labelledby={tabId(rangeKey)}
                className="wb-tracker-analytics-body"
              >
                {mode === "sum" ? (
                  <TrackerChart
                    points={points}
                    goal={shown.goal}
                    unit={shown.unit}
                    title={shown.title}
                  />
                ) : (
                  <TrackerTrend
                    records={windowRecords}
                    goal={shown.goal}
                    unit={shown.unit}
                    title={shown.title}
                  />
                )}

                <dl className="wb-tracker-stats">
                  {mode === "sum" ? (
                    <>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Середнє за день</dt>
                        <dd className="wb-tracker-stat-value">
                          {amountOrDash(report.average, shown.unit)}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Усього</dt>
                        <dd className="wb-tracker-stat-value">
                          {formatTrackerAmount(report.total, shown.unit)}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Днів із записом</dt>
                        <dd className="wb-tracker-stat-value">
                          {report.filled} з {report.days}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Серія</dt>
                        <dd className="wb-tracker-stat-value">{report.streak} дн.</dd>
                      </div>
                      {shown.goal !== null && report.goalRate !== null && (
                        <div className="wb-tracker-stat">
                          <dt className="wb-tracker-stat-label">Ціль виконано</dt>
                          <dd className="wb-tracker-stat-value">
                            {report.goalDays} з {report.days} · {Math.round(report.goalRate * 100)}%
                          </dd>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Останнє</dt>
                        <dd className="wb-tracker-stat-value">
                          {trackerAmountText(latest?.value ?? null, shown)}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Середнє</dt>
                        <dd className="wb-tracker-stat-value">
                          {amountOrDash(reads.average, shown.unit)}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Найменше</dt>
                        <dd className="wb-tracker-stat-value">
                          {trackerAmountText(reads.min?.value ?? null, shown)}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Найбільше</dt>
                        <dd className="wb-tracker-stat-value">
                          {trackerAmountText(reads.max?.value ?? null, shown)}
                        </dd>
                      </div>
                      <div className="wb-tracker-stat">
                        <dt className="wb-tracker-stat-label">Записів</dt>
                        <dd className="wb-tracker-stat-value">{reads.count}</dd>
                      </div>
                    </>
                  )}
                </dl>

                {mode === "sum" && changeLabel(report.changePct) && (
                  <p className="wb-tracker-trend">{changeLabel(report.changePct)}</p>
                )}
              </div>

              <TrackerHistoryList tracker={shown} entries={entries} onRemove={state.remove} />
            </>
          )}
        </div>
      }
    />
  );
}
