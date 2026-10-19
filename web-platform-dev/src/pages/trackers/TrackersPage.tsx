/**
 * «Трекери» — список мірок: підсумок «скільки зі скількох записано сьогодні» і
 * рядок на мірку з полем швидкого запису. Аналітика живе на `/trackers/:id`;
 * рядок же не форма: поле стоїть «лункою», а підпис під назвою каже стан мірки —
 * суму дня («2 л») або останній вимір із його датою («7 кг · вчора»).
 *
 * @module web-platform-dev/src/pages/trackers/TrackersPage
 */

import { useState, type FormEvent, type ReactElement } from "react";
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
import { rowStatus, toTrackerRows, type TrackerRowView } from "./trackers-view";

interface QuickRowProps {
  row: TrackerRowView;
  day: string;
  onOpen: () => void;
  onAdd: (trackerId: number, value: number) => Promise<unknown>;
}

function TrackerQuickRow({ row, day, onOpen, onAdd }: QuickRowProps): ReactElement {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const done = row.recordedToday;

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const raw = value.replace(",", ".").trim();
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || saving) return;
    setSaving(true);
    const entry = await onAdd(row.tracker.id, parsed);
    setSaving(false);
    // Порожнє поле й є підтвердження: «Збережено» в кожному рядку — шум.
    if (entry) setValue("");
  }

  return (
    <li className="wb-tracker-card">
      <button type="button" className="wb-tracker-card-open" onClick={onOpen}>
        <span className="wb-tracker-card-icon">
          <Icon name={row.tracker.icon} size={18} />
        </span>
        <span className="wb-tracker-card-body">
          <span className="wb-tracker-card-title">{row.tracker.title}</span>
          <span className={`wb-tracker-card-meta${done ? " wb-tracker-card-meta--done" : ""}`}>
            {done && (
              <span className="wb-tracker-card-check">
                <Icon name="check" size={12} />
              </span>
            )}
            <span className="wb-tracker-card-meta-text">{rowStatus(row, day)}</span>
          </span>
        </span>
      </button>
      {/* Без `min`/`max`/`step`: нативна перевірка поля малювала чужу підказку
          «введіть дійсне значення» на крок, якого людина не обирала. */}
      <form className="wb-tracker-quick" onSubmit={(event) => void submit(event)}>
        <span className="wb-tracker-quick-field">
          <input
            className="wb-tracker-quick-input"
            type="number"
            inputMode="decimal"
            step="any"
            value={value}
            placeholder="—"
            aria-label={`Записати: ${row.tracker.title}`}
            onChange={(event) => setValue(event.target.value)}
          />
          <span className="wb-tracker-quick-unit">{row.tracker.unit}</span>
        </span>
        <span className="wb-tracker-quick-action">
          {value.trim() !== "" && (
            <button
              type="submit"
              className="wb-btn wb-btn-primary wb-tracker-quick-submit"
              disabled={saving}
              aria-label={`Записати ${row.tracker.title}`}
            >
              <Icon name="check" size={16} />
            </button>
          )}
        </span>
      </form>
    </li>
  );
}

export function TrackersPage(): ReactElement {
  useScreenChrome({ title: "Трекери" });
  const state = useTrackers();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const creating = readCreateIntent(params);
  const rows = toTrackerRows(state.trackers, state.entries, state.endDay);
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
        <ul className="wb-trackers-list">
          {rows.map((row) => (
            <TrackerQuickRow
              key={row.tracker.id}
              row={row}
              day={state.endDay}
              onOpen={() => navigate(trackerPath(row.tracker.id))}
              onAdd={state.addEntry}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
