/**
 * Один трекер: запис, графік, звіт за вікно й історія дотиків.
 * Звіт рахує `trackerReport` з тих самих рядків, що й графік: друге число для
 * одного вікна означало б другу формулу. Дотики дня в звіті сумаються.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerPage
 */

import { useState, type ReactElement } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import {
  TRACKER_RANGES,
  buildTrackerSeries,
  formatTrackerAmount,
  trackerReport,
  type TrackerRange,
} from "@wwwuabot/shared/trackers";
import { TRACKERS_PATH } from "@/app/routes";
import { TrackerChart } from "./TrackerChart";
import { TrackerEntryForm, type EntryDraft } from "./TrackerEntryForm";
import { useTracker } from "./useTracker";
import {
  amountOrDash,
  changeLabel,
  dayLabel,
  goalLabel,
  newestFirst,
  timeLabel,
} from "./trackers-view";

const HISTORY_ROWS = 30;

export function TrackerPage(): ReactElement {
  const params = useParams<{ id: string }>();
  const numericId = Number(params.id);
  const state = useTracker(Number.isInteger(numericId) && numericId > 0 ? numericId : 0);
  useScreenChrome({ title: state.tracker?.title ?? "Трекер" });
  const navigate = useNavigate();
  const dialog = useDialog();
  const [days, setDays] = useState<TrackerRange>(30);
  const [draft, setDraft] = useState<EntryDraft | null>(null);

  const tracker = state.tracker;
  // Сума сьогоднішніх дотиків; порожнє поле форми — свідомо: дефолтне число
  // в ньому бентежить більше, ніж допомагає.
  const todayValues = state.entries.filter((entry) => entry.day === state.endDay);
  const todaySum = todayValues.reduce((sum, entry) => sum + entry.value, 0);
  const activeDraft: EntryDraft = draft ?? { day: state.endDay, value: "", note: "" };

  const history = newestFirst(state.entries);
  const points = tracker ? buildTrackerSeries(state.entries, state.endDay, days) : [];
  const report = tracker
    ? trackerReport(state.entries, { endDay: state.endDay, days, goal: tracker.goal })
    : null;

  async function submit(): Promise<void> {
    if (!tracker) return;
    const raw = activeDraft.value.replace(",", ".").trim();
    const value = Number(raw);
    if (!raw || !Number.isFinite(value)) {
      await dialog.alert("Введіть число — скільки вийшло за день.", { tone: "danger" });
      return;
    }
    if (!activeDraft.day) {
      await dialog.alert("Оберіть день.", { tone: "danger" });
      return;
    }
    if (await state.save(activeDraft.day, value, activeDraft.note)) {
      // Дотик додано, а не правлено: поле порожніє для наступного, день лишається.
      setDraft({ day: activeDraft.day, value: "", note: "" });
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
          <section className="wb-card wb-tracker-hero">
            <p className="wb-tracker-hero-value">
              {amountOrDash(todayValues.length === 0 ? null : todaySum, tracker.unit)}
            </p>
            <p className="wb-tracker-hero-meta">
              {goalLabel(tracker) ?? "без цілі"}
              {report.streak > 0 ? ` · серія ${report.streak} дн.` : ""}
            </p>
            <TrackerEntryForm
              tracker={tracker}
              draft={activeDraft}
              maxDay={state.endDay}
              saving={state.saving}
              onChange={(patch) => setDraft({ ...activeDraft, ...patch })}
              onSubmit={() => void submit()}
            />
          </section>

          <section className="wb-card wb-tracker-analytics">
            <div className="wb-tracker-ranges" role="group" aria-label="Вікно аналітики">
              {TRACKER_RANGES.map((range) => {
                const active = days === range;
                return (
                  <button
                    key={range}
                    type="button"
                    className={`wb-chip wb-tools-chip wb-tracker-range${
                      active ? " wb-tracker-range--on" : ""
                    }`}
                    aria-pressed={active}
                    onClick={() => setDays(range)}
                  >
                    <span className="wb-tools-chip-label">{range} дн.</span>
                  </button>
                );
              })}
            </div>

            <TrackerChart
              points={points}
              goal={tracker.goal}
              unit={tracker.unit}
              title={tracker.title}
            />

            <dl className="wb-tracker-stats">
              <div className="wb-tracker-stat">
                <dt className="wb-tracker-stat-label">Середнє</dt>
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
            </dl>

            {changeLabel(report.changePct) && (
              <p className="wb-tracker-trend">{changeLabel(report.changePct)}</p>
            )}
          </section>

          <section className="wb-card wb-tracker-history">
            <p className="wb-tracker-form-title">Історія</p>
            {history.length === 0 && (
              <p className="wb-text-muted">Записів ще немає — почніть із сьогодні.</p>
            )}
            {history.slice(0, HISTORY_ROWS).map((entry) => (
              <div className="wb-tracker-history-row" key={entry.id}>
                <button
                  type="button"
                  className="wb-tracker-history-open"
                  onClick={() => {
                    // Дотик підставляє **день** для наступного запису: минуле вже
                    // збережене, правити його тут не можна — лише додати своє.
                    setDraft({ day: entry.day, value: "", note: "" });
                  }}
                >
                  <span className="wb-tracker-history-day">{dayLabel(entry.day)}</span>
                  {timeLabel(entry.loggedAt) && (
                    <span className="wb-tracker-history-time">{timeLabel(entry.loggedAt)}</span>
                  )}
                  <span className="wb-tracker-history-value">
                    {formatTrackerAmount(entry.value, tracker.unit)}
                  </span>
                  {entry.note && <span className="wb-tracker-history-note">{entry.note}</span>}
                </button>
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
