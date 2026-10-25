/**
 * Модалка періоду: готові проміжки й ручні межі, під кнопкою, що називає вибір.
 * Готовий застосовується дотиком, ручні межі живуть у чернетці (`docs/EVENTS.md`).
 *
 * @module web-admin-dev/src/pages/analytics/PeriodModal
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { EVENT_PRESETS, type AnalyticsPeriod, type EventPresetKey } from "./analytics-view";

export function PeriodModal({
  period,
  from,
  to,
  onPreset,
  onApply,
  onClose,
}: {
  /** Обраний період — щоб чип показував поточний вибір. */
  period: AnalyticsPeriod;
  /** Межі поточного діапазону для полів. */
  from: string;
  to: string;
  onPreset: (key: EventPresetKey) => void;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}): ReactElement {
  const [fromInput, setFromInput] = useState(from);
  const [toInput, setToInput] = useState(to);

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div
        className="wb-modal"
        role="dialog"
        aria-label="Період"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">Період</h3>
          <button className="wb-modal-close" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="wb-modal-body ana-period-modal">
          <div className="ana-presets" role="group" aria-label="Готовий період">
            {EVENT_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                aria-pressed={period === preset.key}
                className={`ana-preset${period === preset.key ? " ana-preset--active" : ""}`}
                onClick={() => onPreset(preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="ana-range">
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
