/**
 * «Трекери» — компактний список: іконка, назва й порожнє поле швидкого запису.
 * Аналітика живе на `/trackers/:id`, тож заголовок відкриває трекер, а поле
 * лишається полем: форма всередині кнопки не мала б ні клавіатури, ні дотику.
 * Підтвердження запису не малюється — поле просто порожніє (див. `docs/TRACKERS.md`).
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

interface QuickRowProps {
  row: TrackerRowView;
  onOpen: () => void;
  onAdd: (trackerId: number, value: number) => Promise<unknown>;
}

function TrackerQuickRow({ row, onOpen, onAdd }: QuickRowProps): ReactElement {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

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
    <div className="wb-tracker-card">
      <button type="button" className="wb-tracker-card-open" onClick={onOpen}>
        <span className="wb-tracker-card-icon">
          <Icon name={row.tracker.icon} size={16} />
        </span>
        <span className="wb-tracker-card-title">{row.tracker.title}</span>
      </button>
      {/* Без `min`/`max`/`step`: нативна перевірка поля малювала чужу підказку
          «введіть дійсне значення» на крок, якого людина не обирала. */}
      <form className="wb-tracker-quick" onSubmit={(event) => void submit(event)}>
        {/* Поле — свій маленький кирпичик, а не `.wb-input`: у бренда воно
            має 12/16px внутрішніх відступів і росло б на весь рядок. */}
        <input
          className="wb-tracker-quick-input"
          type="number"
          inputMode="decimal"
          step="any"
          value={value}
          aria-label={`Записати: ${row.tracker.title}`}
          onChange={(event) => setValue(event.target.value)}
        />
        {!value.trim() && <span className="wb-tracker-quick-unit">{row.tracker.unit}</span>}
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
      <span className="wb-tracker-card-hint" aria-hidden="true">
        <Icon name="chevron-right" size={16} />
      </span>
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
    <div className="wb-page wb-trackers-page">
      <div className="wb-page-head wb-trackers-head">
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
            <TrackerQuickRow
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
