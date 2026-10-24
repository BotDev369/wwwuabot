/**
 * Модалка прибирання журналу: кого, за який час і що саме прибрати.
 *
 * Ознаки незалежні — кожна звужує вибір. Коли не задано жодної, зникає весь
 * журнал, і саме тому кнопка каже це словами, а сервер вимагає явного `all`.
 *
 * @module web-admin-dev/src/pages/analytics/CleanupModal
 */

import type { ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { EVENT_KIND_LABELS, SURFACE_LABELS } from "@wwwuabot/shared/events";
import { CLEANUP_KINDS, CLEANUP_SURFACES } from "./cleanup-view";
import { useEventCleanup } from "./useEventCleanup";

/** Той самий сегментований перемикач, що й режим екрана: один вигляд на вибір. */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}): ReactElement {
  return (
    <div className="wb-field">
      <span className="wb-label">{label}</span>
      <div className="ana-mode" role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            className={`ana-mode-btn${value === option.value ? " ana-mode-btn--active" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CleanupModal({
  range,
  onClose,
  onDeleted,
}: {
  range: { from: string; to: string };
  onClose: () => void;
  onDeleted: () => void;
}): ReactElement {
  const cleanup = useEventCleanup(range, () => {
    onDeleted();
    onClose();
  });
  const { form, update } = cleanup;

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <h3 className="wb-modal-title">Очистити журнал</h3>
          <button className="wb-modal-close" onClick={onClose} aria-label="Закрити">
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="wb-modal-body ana-cleanup">
          <Choice
            label="Кого"
            value={form.scope}
            onChange={(scope) => update({ scope })}
            options={[
              { value: "all", label: "Усі користувачі" },
              { value: "user", label: "Один користувач" },
            ]}
          />
          {form.scope === "user" && (
            <label className="wb-field">
              <span className="wb-label">Номер користувача (Telegram ID)</span>
              <input
                className="wb-input"
                inputMode="numeric"
                placeholder="372567448"
                value={form.userId}
                onChange={(event) => update({ userId: event.target.value })}
              />
            </label>
          )}

          <Choice
            label="Коли"
            value={form.period}
            onChange={(period) => update({ period })}
            options={[
              { value: "range", label: "За період" },
              { value: "all", label: "За весь час" },
            ]}
          />
          {form.period === "range" && (
            <div className="ana-range">
              <label className="ana-field">
                <span className="ana-label">Від</span>
                <input
                  className="ana-input"
                  type="datetime-local"
                  value={form.fromInput}
                  onChange={(event) => update({ fromInput: event.target.value })}
                />
              </label>
              <label className="ana-field">
                <span className="ana-label">До</span>
                <input
                  className="ana-input"
                  type="datetime-local"
                  value={form.toInput}
                  onChange={(event) => update({ toInput: event.target.value })}
                />
              </label>
            </div>
          )}

          <div className="ana-range">
            <label className="ana-field">
              <span className="ana-label">Поверхня</span>
              <select
                className="wb-select"
                value={form.surface}
                onChange={(event) => update({ surface: event.target.value as typeof form.surface })}
              >
                <option value="">Усі</option>
                {CLEANUP_SURFACES.map((surface) => (
                  <option key={surface} value={surface}>
                    {SURFACE_LABELS[surface]}
                  </option>
                ))}
              </select>
            </label>
            <label className="ana-field">
              <span className="ana-label">Вид події</span>
              <select
                className="wb-select"
                value={form.kind}
                onChange={(event) => update({ kind: event.target.value as typeof form.kind })}
              >
                <option value="">Усі</option>
                {CLEANUP_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {EVENT_KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="ana-cleanup-warn">
            Видалене не відновлюється. Кількість буде показано до підтвердження.
          </p>
          {cleanup.error && <p className="wb-modal-error">{cleanup.error}</p>}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose} disabled={cleanup.busy}>
            Скасувати
          </button>
          <button
            className="wb-btn wb-btn-danger"
            onClick={() => void cleanup.run()}
            disabled={cleanup.busy}
          >
            {cleanup.busy ? "Перевіряю…" : "Очистити"}
          </button>
        </div>
      </div>
    </div>
  );
}
