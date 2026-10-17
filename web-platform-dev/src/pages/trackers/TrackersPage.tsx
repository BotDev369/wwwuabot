/**
 * «Трекери» — стрічка мірок людини: сьогоднішнє значення, серія й тиждень.
 *
 * Рядок веде на свій трекер, а «+» відкриває форму в адресі (`?new=1`), тож
 * «назад» у Telegram закриває форму, а не виводить зі списку.
 *
 * @module web-platform-dev/src/pages/trackers/TrackersPage
 */

import type { ReactElement } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import {
  TRACKERS_PATH,
  readCreateIntent,
  trackerPath,
  withCreateIntent,
  withoutCreateIntent,
} from "@/app/routes";
import { useTrackers } from "./useTrackers";
import { TrackerCreateForm } from "./TrackerCreateForm";
import {
  amountOrDash,
  dayLabel,
  goalLabel,
  toTrackerRows,
  type TrackerRowView,
} from "./trackers-view";

function cardMeta(row: TrackerRowView): string {
  const streak =
    row.streak > 0
      ? `серія ${row.streak} дн.`
      : row.lastDay
        ? `останній запис ${dayLabel(row.lastDay)}`
        : "немає записів";
  const goal = goalLabel(row.tracker);
  return goal ? `${streak} · ${goal}` : streak;
}

function TrackerCard({ row, onOpen }: { row: TrackerRowView; onOpen: () => void }): ReactElement {
  const peak = Math.max(...row.series.map((point) => point.value ?? 0), 1);
  return (
    <button type="button" className="wb-tracker-card" onClick={onOpen}>
      <span className="wb-tracker-card-head">
        <span className="wb-tracker-card-icon">
          <Icon name={row.tracker.icon} size={18} />
        </span>
        <span className="wb-tracker-card-title">{row.tracker.title}</span>
        <Icon name="chevron-right" size={18} />
      </span>
      <span className="wb-tracker-card-value">{amountOrDash(row.today, row.tracker.unit)}</span>
      <span className="wb-tracker-card-meta">{cardMeta(row)}</span>
      <span className="wb-tracker-spark" aria-hidden="true">
        {row.series.map((point) => (
          <span
            key={point.day}
            className={
              point.value === null
                ? "wb-tracker-spark-bar wb-tracker-spark-bar--empty"
                : "wb-tracker-spark-bar"
            }
            style={{
              height: `${point.value === null ? 2 : Math.max(12, (point.value / peak) * 100)}%`,
            }}
          />
        ))}
      </span>
    </button>
  );
}

export function TrackersPage(): ReactElement {
  useScreenChrome({ title: "Трекери" });
  const state = useTrackers();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const creating = readCreateIntent(params);
  const rows = toTrackerRows(state.trackers, state.entries, state.endDay);
  const filled = rows.filter((row) => row.today !== null).length;

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <p className="wb-text-muted">
          {rows.length > 0
            ? `Сьогодні записано: ${filled} з ${rows.length}`
            : "Щоденні записи й аналітика"}
        </p>
        <div className="wb-page-actions">
          <button
            type="button"
            className="wb-btn wb-btn-primary wb-page-add"
            aria-label="Додати трекер"
            onClick={() => navigate(withCreateIntent(TRACKERS_PATH))}
          >
            <Icon name="plus" size={20} />
          </button>
        </div>
      </div>

      {creating && (
        <TrackerCreateForm
          onCreate={state.create}
          onCreated={(tracker) => navigate(trackerPath(tracker.id), { replace: true })}
          onCancel={() => navigate(withoutCreateIntent(TRACKERS_PATH), { replace: true })}
        />
      )}

      {state.loading && <p className="wb-text-muted">Завантаження…</p>}

      {!state.loading && state.error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-empty-text">{state.error}</p>
          <button className="wb-btn wb-btn-secondary" onClick={() => void state.reload()}>
            Повторити
          </button>
        </div>
      )}

      {!state.loading && !state.error && rows.length === 0 && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="bar-chart" size={32} />
          </span>
          <p className="wb-empty-text">Трекерів ще немає.</p>
          <p className="wb-text-muted">Натисніть «+» — і запишіть перший день.</p>
        </div>
      )}

      {!state.loading && !state.error && rows.length > 0 && (
        <div className="wb-trackers-list">
          {rows.map((row) => (
            <TrackerCard
              key={row.tracker.id}
              row={row}
              onOpen={() => navigate(trackerPath(row.tracker.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
