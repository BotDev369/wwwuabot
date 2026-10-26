/**
 * Запис: значення або статус, нотатка, без поля дати — момент фіксує сам запис.
 * «Так-ні» обирається вкладкою, а зберігає та сама кнопка «Зберегти», що й
 * число: вибір показує обраний стан, але не фіксує запис за людину. Решта
 * картки приходить вмістом — «Зберегти» належить формі, хай і стоїть унизу.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerEntryForm
 */

import type { FormEvent, ReactElement, ReactNode } from "react";
import type { Tracker } from "@wwwuabot/shared/trackers";
import { TrackerYesNo } from "./TrackerYesNo";

export interface EntryDraft {
  value: string;
  note: string;
}

interface TrackerEntryFormProps {
  tracker: Tracker;
  draft: EntryDraft;
  onChange: (patch: Partial<EntryDraft>) => void;
  /** Запис готовий: значення або статус — у чернетці, зберігає людина кнопкою. */
  onSubmit: () => void;
  /** Дії, публічність і рядок збереження — усе, що належить цій формі. */
  children?: ReactNode;
}

export function TrackerEntryForm({
  tracker,
  draft,
  onChange,
  onSubmit,
  children,
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
      {children}
    </form>
  );
}
