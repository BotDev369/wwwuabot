/**
 * «Мій день» — перший екран продукту: не стрічка й не дашборд, а одне питання
 * «що в мене сьогодні». Склад — з макета (01 · Мій день), дані — лише наявні:
 * трекери, записи й профіль. Порожньо — це нормально, і тоді екран каже,
 * звідки взяти мірки, замість малювати нулі.
 *
 * @module web-platform-dev/src/pages/day/MyDayPage
 */

import { useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { todayTrackerDay } from "@wwwuabot/shared/trackers";
import { useScreenChrome } from "@wwwuabot/ui/nav";
import { TRACKERS_PATH } from "@/app/routes";
import { useTrackers } from "@/pages/trackers/useTrackers";
import {
  dailyTrackers,
  dayHeadline,
  dayRhythm,
  daysLabel,
  streakNote,
  waitingNote,
} from "./day-rhythm";

export function MyDayPage(): ReactElement {
  useScreenChrome({ title: "Мій день" });
  const navigate = useNavigate();
  const { trackers, entries, loading, error } = useTrackers();

  // Година й дата — **один раз на монтування**: інакше привітання мінялося б під
  // час читання, і «Доброго ранку» раптом ставало б «Доброго дня» без причини.
  const [now] = useState(() => new Date());
  const today = todayTrackerDay(now);
  const head = dayHeadline(now);
  const rhythm = dayRhythm(entries, today);
  const chosen = dailyTrackers(trackers);
  const recordedToday = new Set(
    entries.filter((entry) => entry.day === today).map((entry) => entry.trackerId),
  );
  const waiting = chosen.filter((tracker) => !recordedToday.has(tracker.id)).length;

  return (
    <div className="wb-page wb-day">
      <p className="wb-day-date">
        {head.weekday} · {head.date}
      </p>

      {loading && (
        <div className="wb-empty">
          <p className="wb-text-muted">Рахую твій тиждень…</p>
        </div>
      )}

      {!loading && error && (
        <div className="wb-empty">
          <span className="wb-empty-icon">
            <Icon name="warning" size={32} />
          </span>
          <p className="wb-text-red">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="wb-day-rhythm" aria-label="Ритм тижня">
            <p className="wb-day-cap">Ритм тижня</p>
            <p className="wb-day-value">{daysLabel(rhythm.streak)}</p>
            <p className="wb-day-note">{streakNote(rhythm)}</p>
            <div className="wb-day-spark" aria-hidden="true">
              {rhythm.bars.map((height, index) => (
                <span
                  key={index}
                  className={height === 0 ? "wb-day-bar wb-day-bar--dim" : "wb-day-bar"}
                  style={{ height: `${Math.round(Math.max(0.12, height) * 100)}%` }}
                />
              ))}
            </div>
          </section>

          <div className="wb-day-tiles">
            <div className="wb-day-tile">
              <p className="wb-day-value">{chosen.length}</p>
              <p className="wb-day-label">справи</p>
              <p className="wb-day-note">{waitingNote(chosen.length, waiting)}</p>
            </div>
            <div className="wb-day-tile wb-day-tile--alt">
              <p className="wb-day-value">{rhythm.today}</p>
              <p className="wb-day-label">записів сьогодні</p>
            </div>
          </div>

          <p className="wb-day-cap wb-day-sec">Далі в тебе</p>

          {chosen.length === 0 ? (
            <div className="wb-day-empty">
              <p className="wb-day-empty-text">
                Познач у Трекерах мірки, які хочеш бачити щодня, — і вони з’являться тут.
              </p>
              <button
                type="button"
                className="wb-btn wb-btn-secondary"
                onClick={() => void navigate(TRACKERS_PATH)}
              >
                Відкрити Трекери
              </button>
            </div>
          ) : (
            <ul className="wb-day-list">
              {chosen.map((tracker) => {
                const done = recordedToday.has(tracker.id);
                return (
                  <li key={tracker.id}>
                    <button
                      type="button"
                      className={done ? "wb-day-row wb-day-row--done" : "wb-day-row"}
                      onClick={() => void navigate(TRACKERS_PATH)}
                    >
                      <span className="wb-day-mark" aria-hidden="true">
                        {done ? <Icon name="check" size={14} /> : null}
                      </span>
                      <span className="wb-day-row-text">{tracker.title}</span>
                      <span className="wb-day-row-state">{done ? "записано" : "чекає"}</span>
                      <Icon name="chevron-right" size={16} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
