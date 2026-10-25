/**
 * Запис: значення або статус, нотатка, без поля дати — момент фіксує сам запис.
 *
 * «Так-ні» обирається вкладкою, а зберігає та сама кнопка «Зберегти», що й
 * число: вибір показує обраний стан, але не фіксує запис за людину.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryForm
 */

import type { FormEvent, ReactElement, ReactNode } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Tracker } from "@wwwuabot/shared/trackers";
import { TrackerYesNo } from "./TrackerYesNo";

export interface EntryDraft {
  value: string;
  note: string;
}

interface TrackerEntryFormProps {
  tracker: Tracker;
  draft: EntryDraft;
  saving: boolean;
  onChange: (patch: Partial<EntryDraft>) => void;
  /** Запис готовий: значення або статус — у чернетці, зберігає людина кнопкою. */
  onSubmit: () => void;
  /**
   * Друга дія в рядку збереження: картка трекера ставить там пріоритет, а
   * сторінка трекера — нічого. Рядок один, бо обидві дії стосуються цього ж
   * запису.
   */
  aside?: ReactNode;
}

export function TrackerEntryForm({
  tracker,
  draft,
  saving,
  onChange,
  onSubmit,
  aside,
}: TrackerEntryFormProps): ReactElement {
  function submit(event: FormEvent): void {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="wb-tracker-entry" onSubmit={submit}>
      {tracker.valueType === "boolean" ? (
        <div className="wb-field">
          <span className="wb-label">Статус</span>
          <TrackerYesNo
            value={draft.value}
            onChange={(value) => onChange({ value })}
            label="Так чи ні"
          />
        </div>
      ) : (
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
      )}
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
      <div className="wb-tracker-entry-actions">
        <button
          type="submit"
          className="wb-btn wb-btn-primary wb-tracker-entry-submit"
          disabled={saving}
        >
          <Icon name="check" size={18} />
          Зберегти
        </button>
        {aside}
      </div>
    </form>
  );
}
