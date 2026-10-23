/**
 * Рядок матриці: назва (веде на картку) і значення днів, сьогодні першим;
 * число велике, одиниця дрібна під ним, «так-ні» — знаком ✓/✕.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerMatrixRow
 */

import { useState, type FormEvent, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import type { Tracker } from "@wwwuabot/shared/trackers";
import { TrackerYesNo } from "./TrackerYesNo";
import { cellAmount, matrixDayLabel, type TrackerCellView } from "./trackers-view";

interface TrackerMatrixRowProps {
  tracker: Tracker;
  cells: readonly TrackerCellView[];
  today: string;
  saving: boolean;
  onOpen: () => void;
  onSave: (value: number, note: string) => Promise<boolean>;
}

interface CellClassInput {
  empty: boolean;
  goal: boolean;
}

function cellClass({ empty, goal }: CellClassInput): string {
  return (
    "wb-matrix-cell" +
    (empty ? " wb-matrix-cell--empty" : "") +
    (goal ? " wb-matrix-cell--goal" : "")
  );
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

  const name = (
    <>
      <span className="wb-matrix-icon">
        <Icon name={tracker.icon} size={16} />
      </span>
      <span className="wb-matrix-title">{tracker.title}</span>
    </>
  );

  return (
    <li className="wb-matrix">
      <div className="wb-matrix-row">
        <button type="button" className="wb-matrix-name" onClick={onOpen}>
          {name}
        </button>

        {cells.map((cell) => {
          const isToday = cell.day === today;
          const content = cellAmount(cell.value, tracker);
          const label = `${tracker.title}, ${matrixDayLabel(cell.day)}${content ? `: ${content}` : ""}`;
          return (
            <button
              key={cell.day}
              type="button"
              className={cellClass({
                empty: cell.value === null,
                goal: cell.goalMet,
              })}
              aria-label={label}
              onClick={() => (isToday ? setOpen((value) => !value) : onOpen())}
            >
              {tracker.valueType === "boolean" && cell.value !== null ? (
                <Icon name={cell.value > 0 ? "check" : "close"} size={16} />
              ) : content ? (
                <span className="wb-matrix-value">
                  <span className="wb-matrix-number">{content}</span>
                  {tracker.unit && <span className="wb-matrix-unit">{tracker.unit}</span>}
                </span>
              ) : (
                <span aria-hidden="true">·</span>
              )}
            </button>
          );
        })}
      </div>

      {open && (
        <form className="wb-matrix-form" onSubmit={(event) => void submit(event)}>
          {tracker.valueType === "boolean" ? (
            <div className="wb-field">
              <span className="wb-label">{tracker.title}</span>
              <TrackerYesNo value={draft} onChange={setDraft} label="Так чи ні" />
            </div>
          ) : (
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
          )}
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
