/**
 * Власний трекер — форма з чотирьох полів: назва, одиниця, ціль, крок.
 *
 * Перевіряє та сама `validateTrackerFields`, що й сервер: поле не дає
 * надіслати те, що база однаково відхилить (AGENTS.md §3).
 *
 * @module web-platform-dev/src/pages/trackers/TrackerCreateForm
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { validateTrackerFields, type Tracker, type TrackerFields } from "@wwwuabot/shared/trackers";

interface TrackerCreateFormProps {
  onCreate: (fields: TrackerFields) => Promise<Tracker | null>;
  onCreated: (tracker: Tracker) => void;
  onCancel: () => void;
}

function numberOrNull(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

export function TrackerCreateForm({
  onCreate,
  onCreated,
  onCancel,
}: TrackerCreateFormProps): ReactElement {
  const [title, setTitle] = useState("");
  const [unit, setUnit] = useState("");
  const [goal, setGoal] = useState("");
  // Без дефолтної цифри: порожній крок — це крок 1 (`?? 1` нижче), а число в
  // полі, яке ніхто не міняв, читається як чиясь вимога, а не як типовий вибір.
  const [step, setStep] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    const validated = validateTrackerFields({
      title,
      unit,
      goal: numberOrNull(goal),
      step: numberOrNull(step) ?? 1,
      min: 0,
    });
    if (!validated.ok) {
      setError(validated.message);
      return;
    }
    setError(null);
    setBusy(true);
    const tracker = await onCreate(validated.value);
    setBusy(false);
    if (tracker) onCreated(tracker);
  }

  return (
    <form className="wb-card wb-tracker-form" onSubmit={(event) => void submit(event)}>
      <p className="wb-tracker-form-title">Свій трекер</p>
      <label className="wb-field">
        <span className="wb-label">Назва</span>
        <input
          className="wb-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Наприклад, кава"
          maxLength={40}
          autoFocus
        />
      </label>
      <div className="wb-tracker-form-row">
        <label className="wb-field">
          <span className="wb-label">Одиниця</span>
          <input
            className="wb-input"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="чашок"
            maxLength={8}
          />
        </label>
        <label className="wb-field">
          <span className="wb-label">Ціль дня</span>
          <input
            className="wb-input"
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            inputMode="decimal"
            placeholder="не обов'язково"
          />
        </label>
      </div>
      <label className="wb-field">
        <span className="wb-label">Крок</span>
        <input
          className="wb-input"
          value={step}
          onChange={(event) => setStep(event.target.value)}
          inputMode="decimal"
          placeholder="1"
        />
      </label>
      {error && <p className="wb-input-error">{error}</p>}
      <div className="wb-tracker-form-actions">
        <button type="button" className="wb-btn wb-btn-secondary" onClick={onCancel}>
          Скасувати
        </button>
        <button type="submit" className="wb-btn wb-btn-primary" disabled={busy}>
          Створити
        </button>
      </div>
    </form>
  );
}
