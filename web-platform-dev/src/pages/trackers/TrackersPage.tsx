/**
 * «Трекери» — стрічка мірок тематиками: підсумок «скільки зі скількох
 * записано сьогодні», заголовок групи й плитка «знак + назва» по два в рядку.
 * Поле запису зі стрічки прибрано: запис живе на сторінці трекера, де є
 * і контекст, і місце для історії.
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
import { groupTrackerRows, toTrackerRows } from "./trackers-view";

export function TrackersPage(): ReactElement {
  useScreenChrome({ title: "Трекери" });
  const state = useTrackers();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const creating = readCreateIntent(params);
  const rows = toTrackerRows(state.trackers, state.entries, state.endDay);
  const groups = groupTrackerRows(rows);
  const filled = rows.filter((row) => row.recordedToday).length;

  return (
    <div className="wb-page wb-trackers-page">
      {rows.length > 0 && (
        <section className="wb-tracker-day">
          <div className="wb-tracker-day-head">
            {/* `span`, а не `p`: бренд тримає абзаци на 14px з `!important`, і
                підпис-мітка ставав більшим за число, до якого він веде. */}
            <span className="wb-tracker-day-label">Сьогодні записано</span>
            <button
              type="button"
              className="wb-tracker-add"
              aria-label="Додати трекер"
              onClick={() => navigate(withCreateIntent(TRACKERS_PATH))}
            >
              <Icon name="plus" size={22} />
            </button>
          </div>
          <p className="wb-tracker-day-figure">
            <span className="wb-tracker-day-count">{filled}</span>
            <span className="wb-tracker-day-total">з {rows.length}</span>
          </p>
          <div className="wb-tracker-day-bar" aria-hidden="true">
            {rows.map((row) => (
              <span
                key={row.tracker.id}
                className={`wb-tracker-day-seg${
                  row.recordedToday ? " wb-tracker-day-seg--on" : ""
                }`}
              />
            ))}
          </div>
        </section>
      )}

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
          <p className="wb-text-muted">Стандартний набір з'явиться сам — або створіть свій.</p>
          <button
            type="button"
            className="wb-btn wb-btn-primary"
            onClick={() => navigate(withCreateIntent(TRACKERS_PATH))}
          >
            Створити трекер
          </button>
        </div>
      )}

      {!state.loading && !state.error && rows.length > 0 && (
        <>
          {groups.map((group) => (
            <section className="wb-trackers-group" key={group.title}>
              <h2 className="wb-trackers-group-title">{group.title}</h2>
              <ul className="wb-trackers-list">
                {group.rows.map((row) => (
                  <li className="wb-tracker-card" key={row.tracker.id}>
                    <button
                      type="button"
                      className="wb-tracker-card-open"
                      onClick={() => navigate(trackerPath(row.tracker.id))}
                    >
                      <span className="wb-tracker-card-icon">
                        <Icon name={row.tracker.icon} size={18} />
                      </span>
                      <span className="wb-tracker-card-title">{row.tracker.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
