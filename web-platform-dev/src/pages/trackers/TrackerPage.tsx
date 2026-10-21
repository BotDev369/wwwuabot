/**
 * Один трекер: новий запис, графік, звіт за вікно й історія вимірів.
 *
 * Екран читає **вид мірки** (`trackerMode`): накопичувальна мірка малюється
 * стовпчиками днів, вимір — лінією по самих записах; і підсумки в них різні.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerPage
 */

import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { Tabs, tabId, tabPanelId, type TabOption } from "@wwwuabot/ui/tabs";
import {
  TRACKER_RANGES,
  buildTrackerGroupTree,
  flattenTrackerGroupTree,
  formatTrackerAmount,
  trackerAmountText,
  trackerLatest,
  trackerMode,
  trackerWindow,
  type TrackerRange,
} from "@wwwuabot/shared/trackers";
import {
  buildTrackerSeries,
  trackerReadingStats,
  trackerReport,
} from "@wwwuabot/shared/trackers/analytics";
import { TRACKERS_PATH } from "@/app/routes";
import { TrackerChart } from "./TrackerChart";
import { TrackerEntryForm, type EntryDraft } from "./TrackerEntryForm";
import { TrackerTrend } from "./TrackerTrend";
import { useTracker } from "./useTracker";
import { amountOrDash, changeLabel, dayLabel, newestFirst, timeLabel } from "./trackers-view";

const HISTORY_ROWS = 30;

/** Вікна аналітики — ті самі, що `TRACKER_RANGES`, лише ключем вкладки. */
const RANGE_TABS: readonly TabOption[] = TRACKER_RANGES.map((range) => ({
  key: String(range),
  label: `${range} дн.`,
}));

const EMPTY_DRAFT: EntryDraft = { value: "", note: "" };

export function TrackerPage(): ReactElement {
  const params = useParams<{ id: string }>();
  const numericId = Number(params.id);
  const state = useTracker(Number.isInteger(numericId) && numericId > 0 ? numericId : 0);
  useScreenChrome({ title: state.tracker?.title ?? "Трекер" });
  const navigate = useNavigate();
  const dialog = useDialog();
  const [days, setDays] = useState<TrackerRange>(30);
  const [draft, setDraft] = useState<EntryDraft>(EMPTY_DRAFT);
  const rangeKey = String(days);

  const tracker = state.tracker;
  const mode = tracker ? trackerMode(tracker) : "sum";
  const entries = state.entries;
  // Поки трекер не завантажено, `endDay` порожній: добудова дня з нього кидає
  // `RangeError: Invalid time value`, і екран падає раніше за свій власний стан завантаження.
  const windowRecords = state.endDay ? trackerWindow(entries, state.endDay, days) : [];
  const reads = trackerReadingStats(windowRecords);
  const latest = trackerLatest(entries);

  const history = newestFirst(entries);
  const points = tracker ? buildTrackerSeries(entries, state.endDay, days, mode) : [];
  const report = tracker
    ? trackerReport(entries, { endDay: state.endDay, days, goal: tracker.goal, mode })
    : null;

  async function submit(): Promise<void> {
    if (!tracker) return;
    // «Так-ні» не вводиться цифрой: статус обирають вкладкою, і порожній вибір
    // — це ще не відповідь, а не «0». Межі все одно перевіряє сервер.
    if (tracker.valueType === "boolean") {
      if (draft.value !== "0" && draft.value !== "1") {
        await dialog.alert("Оберіть «Так» або «Ні».", { tone: "danger" });
        return;
      }
      if (await state.save(Number(draft.value), draft.note)) setDraft(EMPTY_DRAFT);
      return;
    }
    const raw = draft.value.replace(",", ".").trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) {
      await dialog.alert("Введіть число — скільки вийшло.", { tone: "danger" });
      return;
    }
    if (await state.save(value, draft.note)) {
      // День і момент ставить сервер, тож полю нема чого запам'ятовувати.
      setDraft(EMPTY_DRAFT);
    }
  }

  async function removeEntry(entryId: number): Promise<void> {
    const ok = await dialog.confirm("Прибрати цей запис?", {
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!ok) return;
    await state.remove(entryId);
  }

  async function archive(): Promise<void> {
    if (!tracker) return;
    const ok = await dialog.confirm(`Прибрати трекер «${tracker.title}»? Історія збережеться.`, {
      tone: "danger",
      confirmText: "Прибрати",
    });
    if (!ok) return;
    if (await state.archive()) navigate(TRACKERS_PATH, { replace: true });
  }

  return (
    <div className="wb-page wb-trackers-page">
      {state.loading && <p className="wb-text-muted">Завантаження…</p>}

      {!state.loading && (state.error || !tracker || !report) && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-empty-text">{state.error ?? "Такого трекера немає."}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => navigate(TRACKERS_PATH)}>
            До списку
          </button>
        </div>
      )}

      {!state.loading && tracker && report && (
        <>
          <section className="wb-tracker-panel">
            <TrackerEntryForm
              tracker={tracker}
              draft={draft}
              saving={state.saving}
              onChange={(patch) => setDraft({ ...draft, ...patch })}
              onSubmit={() => void submit()}
            />
            <label className="wb-field">
              <span className="wb-label">Група</span>
              {/* Нерозривні пробіли позначають рівень глибини дерева. */}
              <select
                className="wb-select"
                value={tracker.groupId ?? ""}
                onChange={(event) =>
                  void state.move(event.target.value === "" ? null : Number(event.target.value))
                }
              >
                <option value="">Свої</option>
                {flattenTrackerGroupTree(buildTrackerGroupTree(state.groups)).map((option) => (
                  <option key={option.group.id} value={option.group.id}>
                    {"\u00A0".repeat(option.depth * 3)}
                    {option.group.title}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="wb-tracker-panel">
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
                  goal={tracker.goal}
                  unit={tracker.unit}
                  title={tracker.title}
                />
              ) : (
                <TrackerTrend
                  records={windowRecords}
                  goal={tracker.goal}
                  unit={tracker.unit}
                  title={tracker.title}
                />
              )}

              <dl className="wb-tracker-stats">
                {mode === "sum" ? (
                  <>
                    <div className="wb-tracker-stat">
                      <dt className="wb-tracker-stat-label">Середнє за день</dt>
                      <dd className="wb-tracker-stat-value">
                        {amountOrDash(report.average, tracker.unit)}
                      </dd>
                    </div>
                    <div className="wb-tracker-stat">
                      <dt className="wb-tracker-stat-label">Усього</dt>
                      <dd className="wb-tracker-stat-value">
                        {formatTrackerAmount(report.total, tracker.unit)}
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
                    {tracker.goal !== null && report.goalRate !== null && (
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
                        {trackerAmountText(latest?.value ?? null, tracker)}
                      </dd>
                    </div>
                    <div className="wb-tracker-stat">
                      <dt className="wb-tracker-stat-label">Середнє</dt>
                      <dd className="wb-tracker-stat-value">
                        {amountOrDash(reads.average, tracker.unit)}
                      </dd>
                    </div>
                    <div className="wb-tracker-stat">
                      <dt className="wb-tracker-stat-label">Найменше</dt>
                      <dd className="wb-tracker-stat-value">
                        {trackerAmountText(reads.min?.value ?? null, tracker)}
                      </dd>
                    </div>
                    <div className="wb-tracker-stat">
                      <dt className="wb-tracker-stat-label">Найбільше</dt>
                      <dd className="wb-tracker-stat-value">
                        {trackerAmountText(reads.max?.value ?? null, tracker)}
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
          </section>

          <section className="wb-tracker-panel wb-tracker-history">
            <span className="wb-tracker-section-title">Історія</span>
            {history.length === 0 && <p className="wb-text-muted">Записів ще немає.</p>}
            {history.slice(0, HISTORY_ROWS).map((entry) => (
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
                  onClick={() => void removeEntry(entry.id)}
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </section>

          <button
            type="button"
            className="wb-btn wb-btn-ghost wb-tracker-archive"
            onClick={() => void archive()}
          >
            <Icon name="trash" size={16} />
            Прибрати трекер
          </button>
        </>
      )}
    </div>
  );
}
