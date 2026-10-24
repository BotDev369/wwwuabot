/**
 * Модалка ручного діапазону: «Період» у рядку чипів відкриває ці два поля.
 *
 * Межі живуть у чернетці модалки, а не в екрані: інакше кожна стерта цифра в
 * полі змінювала б запит до того, як людина натиснула «Застосувати».
 *
 * @module web-admin-dev/src/pages/analytics/RangeModal
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";

export function RangeModal({
  from,
  to,
  onApply,
  onClose,
}: {
  /** Поточні межі екрана — щоб модалка відкривалась на тому, що видно. */
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}): ReactElement {
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">Період</h3>
          <button className="wb-modal-close" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="wb-modal-body ana-range">
          <label className="ana-field">
            <span className="ana-label">Від</span>
            <input
              className="ana-input"
              type="datetime-local"
              value={fromInput}
              onChange={(event) => setFromInput(event.target.value)}
            />
          </label>
          <label className="ana-field">
            <span className="ana-label">До</span>
            <input
              className="ana-input"
              type="datetime-local"
              value={toInput}
              onChange={(event) => setToInput(event.target.value)}
            />
          </label>
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            Скасувати
          </button>
          <button className="wb-btn wb-btn-primary" onClick={() => onApply(fromInput, toInput)}>
            Застосувати
          </button>
        </div>
      </div>
    </div>
  );
}
