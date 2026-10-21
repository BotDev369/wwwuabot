/**
 * Рядок матриці: назва мірки (веде на картку) й клітинки днів. Дотик по
 * клітинці — форма введення, але **лише по сьогоднішній**: день ставить
 * сервер, і «записати за вчора» в моделі не існує; минулі клітинки —
 * історія, вони ведуть на картку, де вона й живе (див. `docs/TRACKERS.md`).
 *
 * @module web-platform-dev/src/pages/trackers/TrackerMatrixRow
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Tracker } from "@wwwuabot/shared/trackers";
import { cellAmount, type TrackerCellView } from "./trackers-view";

interface TrackerMatrixRowProps {
  tracker: Tracker;
  cells: readonly TrackerCellView[];
  today: string;
  saving: boolean;
  onOpen: () => void;
  onSave: (value: number, note: string) => Promise<boolean>;
}

export function TrackerMatrixRow({
  tracker,
  cells,
  today,
  saving,
  onOpen,
  onSave,
}: TrackerMatrixRowProps): ReactElement {
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const value = Number(draft.replace(",", "."));
    if (!Number.isFinite(value)) return;
    const saved = await onSave(value, note.trim());
    if (saved) {
      setDraft("");
      setNote("");
      setOpen(false);
    }
  }

  return (
    <li className="wb-matrix">
      <div className="wb-matrix-row">
        <button type="button" className="wb-matrix-name" onClick={onOpen}>
          <span className="wb-matrix-icon">
            <Icon name={tracker.icon} size={14} />
          </span>
          <span className="wb-matrix-title">{tracker.title}</span>
        </button>
        {cells.map((cell) => {
          const isToday = cell.day === today;
          const content = cellAmount(cell.value);
          const label = `${tracker.title}, ${cell.day}${content ? `: ${content}` : ""}`;
          return (
            <button
              key={cell.day}
              type="button"
              className={
                "wb-matrix-cell" +
                (cell.value === null ? " wb-matrix-cell--empty" : "") +
                (cell.goalMet ? " wb-matrix-cell--goal" : "") +
                (isToday ? " wb-matrix-cell--today" : "")
              }
              aria-label={label}
              onClick={() => (isToday ? setOpen((value) => !value) : onOpen())}
            >
              {content ||
                (isToday ? <Icon name="plus" size={14} /> : <span aria-hidden="true">·</span>)}
            </button>
          );
        })}
      </div>
      {open && (
        <form className="wb-matrix-form" onSubmit={(event) => void submit(event)}>
          <label className="wb-field">
            <span className="wb-label">
              {tracker.title}
              {tracker.unit ? `, ${tracker.unit}` : ""}
            </span>
            {/* Без нативних min/max/step: межі перевіряє сервер, а підказка
                «введіть дійсне значення» малює чужий крок. */}
            <input
              className="wb-input"
              type="number"
              inputMode="decimal"
              step="any"
              value={draft}
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
            />
          </label>
          <label className="wb-field">
            <span className="wb-label">Нотатка</span>
            <input
              className="wb-input"
              value={note}
              maxLength={200}
              placeholder="не обов'язково"
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button type="submit" className="wb-btn wb-btn-primary" disabled={saving}>
            Записати
          </button>
        </form>
      )}
    </li>
  );
}
