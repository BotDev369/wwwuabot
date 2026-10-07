/**
 * Page Builder — кирпичик «системи та параметри».
 *
 * Це крок, а не екран: його рендерить той екран, який спитав дати, а підписи й
 * адресу дає господар — тому друга копія вибору не потрібна.
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
}: SystemsPickerProps) {
  const picker = useSystemsPicker({ valueParam, values, targetUrl, systemParam, parameterParam });

  if (values === "") {
    return (
      <div className={className}>
        <p className="wb-text-muted">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h2>{title}</h2>
      <p className="wb-text-sm wb-text-muted" style={{ marginBottom: "var(--sp-4)" }}>
        {lead}
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--sp-4)",
          marginBottom: "var(--sp-4)",
        }}
      >
        {picker.systems.map((system) => {
          const on = system.implemented && picker.isSystemSelected(system.id);
          return (
            <div
              key={system.id}
              style={{
                padding: "var(--sp-4)",
                background: "var(--bg-1, var(--bg-home, #f0f2f5))",
                border: "1px solid var(--border-subtle, #e2e8f0)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--sp-2)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!system.implemented}
                  onChange={(e) => picker.toggleSystem(system.id, e.target.checked)}
                />
                <strong>{system.name}</strong>
                {!system.implemented && <em className="wb-text-sm wb-text-muted"> (скоро)</em>}
              </label>

              {on && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--sp-3)",
                    marginTop: "var(--sp-3)",
                    paddingLeft: "var(--sp-6)",
                  }}
                >
                  {(system.parameters ?? []).map((parameter) => (
                    <label
                      key={parameter.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--sp-1)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
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
        className="wb-btn wb-btn-primary"
        onClick={picker.confirm}
        disabled={!picker.ready}
        style={{ width: "100%" }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
