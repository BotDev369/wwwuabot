/**
 * Page Builder — кирпичик «системи та параметри».
 *
 * Це крок, а не екран: його рендерить той екран, який спитав дати, а підписи й
 * адресу дає господар. Вигляд — у `styles/blocks.css`.
 *
 * @module packages/ui/src/blocks/systems-picker/SystemsPicker
 */

import { useSystemsPicker } from "./useSystemsPicker";

export interface SystemsPickerProps {
  /** Клас кореня — його дає господар: екран, який спитав дати. */
  className: string;
  title: string;
  lead: string;
  confirmLabel: string;
  /** Що сказати, коли дат немає зовсім: крок без даних не має права мовчати. */
  emptyText: string;
  valueParam: string;
  values: string;
  targetUrl: string;
  systemParam?: string;
  parameterParam?: string;
  /**
   * Що перенести на наступний крок без змін: вид суб'єкта та його підписи.
   * Без цього результат відкрився б як аналіз людини, навіть якщо читали подію.
   */
  forward?: Record<string, string>;
}

export function SystemsPicker({
  className,
  title,
  lead,
  confirmLabel,
  emptyText,
  valueParam,
  values,
  targetUrl,
  systemParam = "sys",
  parameterParam = "p",
  forward,
}: SystemsPickerProps) {
  const picker = useSystemsPicker({
    valueParam,
    values,
    targetUrl,
    systemParam,
    parameterParam,
    forward,
  });

  if (values === "") {
    return (
      <div className={className}>
        <p className="wb-text-muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2 className="wb-block-systems-picker__title">{title}</h2>
      <p className="wb-text-sm wb-text-muted wb-block-systems-picker__lead">{lead}</p>

      <div className="wb-block-systems-picker__list">
        {picker.systems.map((system) => {
          const on = system.implemented && picker.isSystemSelected(system.id);
          return (
            <div
              key={system.id}
              className={
                on
                  ? "wb-block-systems-picker__card wb-block-systems-picker__card--on"
                  : "wb-block-systems-picker__card"
              }
            >
              <label className="wb-block-systems-picker__system">
                <input
                  type="checkbox"
                  className="wb-check"
                  checked={on}
                  disabled={!system.implemented}
                  onChange={(e) => picker.toggleSystem(system.id, e.target.checked)}
                />
                <strong>{system.name}</strong>
                {!system.implemented && <em className="wb-text-sm wb-text-muted"> (скоро)</em>}
              </label>

              {on && (
                <div className="wb-block-systems-picker__params">
                  {(system.parameters ?? []).map((parameter) => (
                    <label key={parameter.key} className="wb-block-systems-picker__param">
                      <input
                        type="checkbox"
                        className="wb-check"
                        checked={!!picker.selected[system.id]?.[parameter.key]}
                        onChange={(e) =>
                          picker.toggleParam(system.id, parameter.key, e.target.checked)
                        }
                      />
                      <span className="wb-text-sm">{parameter.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        className="wb-btn wb-btn-primary wb-block-systems-picker__action"
        onClick={picker.confirm}
        disabled={!picker.ready}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
