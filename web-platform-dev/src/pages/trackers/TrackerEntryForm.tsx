/**
 * Запис дня: дата, значення, нотатка. Той самий рядок править уже наявний день.
 *
 * Чернетка живе в сторінці, бо її ж заповнює вибір рядка в історії — двоє
 * власників одного поля розійшлися б.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryForm
 */

import type { FormEvent, ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Tracker } from "@wwwuabot/shared/trackers";

export interface EntryDraft {
  day: string;
  value: string;
  note: string;
}

interface TrackerEntryFormProps {
  tracker: Tracker;
  draft: EntryDraft;
  maxDay: string;
  saving: boolean;
  onChange: (patch: Partial<EntryDraft>) => void;
  onSubmit: () => void;
}

export function TrackerEntryForm({
  tracker,
  draft,
  maxDay,
  saving,
  onChange,
  onSubmit,
}: TrackerEntryFormProps): ReactElement {
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="wb-tracker-entry" onSubmit={submit}>
      <div className="wb-tracker-entry-row">
        <label className="wb-field">
          <span className="wb-label">День</span>
          <input
            className="wb-input"
            type="date"
            value={draft.day}
            max={maxDay}
            onChange={(event) => onChange({ day: event.target.value })}
          />
        </label>
        <label className="wb-field">
          <span className="wb-label">Значення{tracker.unit ? `, ${tracker.unit}` : ""}</span>
          {/* Без `min`/`max`/`step`: нативна підказка «введіть дійсне значення»
              з'являлась на кроці, якого людина не обирала — межі перевіряє сервер. */}
          <input
            className="wb-input"
            type="number"
            inputMode="decimal"
            step="any"
            value={draft.value}
            onChange={(event) => onChange({ value: event.target.value })}
          />
        </label>
        <button
          type="submit"
          className="wb-btn wb-btn-primary wb-tracker-entry-submit"
          disabled={saving}
          aria-label="Зберегти"
          title="Зберегти"
        >
          <Icon name="check" size={20} />
        </button>
      </div>
      <label className="wb-field">
        <span className="wb-label">Нотатка</span>
        <input
          className="wb-input"
          value={draft.note}
          maxLength={200}
          placeholder="не обов'язково"
          onChange={(event) => onChange({ note: event.target.value })}
        />
      </label>
    </form>
  );
}
