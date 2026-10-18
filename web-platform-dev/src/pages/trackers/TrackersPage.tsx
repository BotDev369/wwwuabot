/**
 * «Трекери» — компактна стрічка: іконка, назва й порожнє поле швидкого запису.
 * Аналітика живе на `/trackers/:id`, тож заголовок відкриває трекер, а поле
 * лишається полем (форма всередині кнопки не мала б ні клавіатури, ні дотику).
 * Кнопка надсилання з'являється лише з введеним значенням.
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
import { toTrackerRows, type TrackerRowView } from "./trackers-view";

interface QuickCardProps {
  row: TrackerRowView;
  onOpen: () => void;
  onAdd: (trackerId: number, value: number) => Promise<unknown>;
}

function TrackerQuickCard({ row, onOpen, onAdd }: QuickCardProps): ReactElement {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const raw = value.replace(",", ".").trim();
    const parsed = Number(raw);
    if (!raw || !Number.isFinite(parsed) || saving) return;
    setSaving(true);
    const entry = await onAdd(row.tracker.id, parsed);
    setSaving(false);
    if (entry) {
      setValue("");
      setSaved(true);
    }
  }

  return (
    <div className="wb-tracker-card">
      <button type="button" className="wb-tracker-card-open" onClick={onOpen}>
        <span className="wb-tracker-card-icon">
          <Icon name={row.tracker.icon} size={18} />
        </span>
        <span className="wb-tracker-card-title">{row.tracker.title}</span>
        <Icon name="chevron-right" size={18} />
      </button>
      <form className="wb-tracker-quick" onSubmit={(event) => void submit(event)}>
        <input
          className="wb-input wb-tracker-quick-input"
          type="number"
          inputMode="decimal"
          step={row.tracker.step}
          min={row.tracker.min}
          max={row.tracker.max ?? undefined}
          value={value}
          aria-label={`Записати: ${row.tracker.title}`}
          placeholder={row.tracker.unit || ""}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
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
      </form>
      {/* Підтвердження — своїм рядком: у картці 150px текст поруч із полем стягнув би його. */}
      <p className="wb-tracker-quick-status" role="status">
        {saved ? "Збережено" : ""}
      </p>
    </div>
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
            <TrackerQuickCard
              key={row.tracker.id}
              row={row}
              onOpen={() => navigate(trackerPath(row.tracker.id))}
              onAdd={state.addEntry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
