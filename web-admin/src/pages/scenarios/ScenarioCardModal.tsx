import { useEffect, useState } from "react";
import { readScenarioAll } from "../../shared/api/scenarios.api";

interface Props {
  codeword: string;
  onClose: () => void;
  onEdit: (codeword?: string) => void;
}

export function ScenarioCardModal({ codeword, onClose, onEdit }: Props) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await readScenarioAll(codeword);
        if (!cancelled) {
          setData(row);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [codeword]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatValue = (_key: string, value: unknown): { text: string; isJson: boolean } => {
    if (value === null || value === undefined) return { text: "—", isJson: false };
    if (typeof value === "string") {
      // Try to detect JSON
      const trimmed = value.trim();
      if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && trimmed.length > 2) {
        try {
          JSON.parse(trimmed);
          return { text: trimmed, isJson: true };
        } catch { /* not JSON */ }
      }
      return { text: value, isJson: false };
    }
    if (typeof value === "object") {
      return { text: JSON.stringify(value, null, 2), isJson: true };
    }
    return { text: String(value), isJson: false };
  };

  const formatTimestamp = (value: string): string => {
    if (!value) return "—";
    const date = new Date(value.replace(" ", "T") + "Z");
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("uk-UA", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(date);
  };

  const fields = data
    ? Object.entries(data).filter(([k]) => k !== "codeword")
    : [];

  return (
    <div className="usr-modal-overlay" onClick={onClose}>
      <div className="usr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usr-modal-header">
          <span className="usr-modal-title">
            📋 {codeword}
          </span>
          <button className="usr-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="usr-modal-body" style={{ maxHeight: "70vh", overflow: "auto" }}>
          {loading ? (
            <div className="usr-modal-loading">Завантаження…</div>
          ) : error ? (
            <div className="usr-modal-error">{error}</div>
          ) : !data ? (
            <div className="usr-modal-empty">Сценарій не знайдено</div>
          ) : (
            <table className="usr-card-table">
              <thead>
                <tr>
                  <th className="usr-card-th-field">Поле</th>
                  <th className="usr-card-th-value">Значення</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="usr-card-td-field">codeword</td>
                  <td className="usr-card-td-value usr-card-mono">{codeword}</td>
                </tr>
                {fields.map(([key, value]) => {
                  const { text, isJson } = formatValue(key, value);
                  const isExpanded = expanded.has(key);
                  const isTimestamp = key.includes("at") || key.includes("date");

                  let displayText = text;
                  if (isTimestamp && !isJson) {
                    displayText = formatTimestamp(text);
                  }

                  // Show first 2 lines for compact display
                  const lines = displayText.split("\n");
                  const truncated = !isJson && lines.length > 2;

                  return (
                    <tr key={key}>
                      <td className="usr-card-td-field">{key}</td>
                      <td className="usr-card-td-value">
                        {isJson ? (
                          <div>
                            <button
                              className="json-toggle"
                              onClick={() => toggleExpand(key)}
                            >
                              {isExpanded ? "▾" : "▸"} JSON ({lines.length} рядків)
                            </button>
                            {isExpanded && (
                              <pre className="json-block">{displayText}</pre>
                            )}
                          </div>
                        ) : truncated && !isExpanded ? (
                          <div>
                            <span>{lines.slice(0, 2).join("\n")}</span>
                            <button
                              className="json-toggle"
                              onClick={() => toggleExpand(key)}
                            >
                              ▸ ще {lines.length - 2} рядків
                            </button>
                          </div>
                        ) : truncated && isExpanded ? (
                          <div>
                            <span>{displayText}</span>
                            <button
                              className="json-toggle"
                              onClick={() => toggleExpand(key)}
                            >
                              ▾ згорнути
                            </button>
                          </div>
                        ) : (
                          <span>{displayText}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="usr-modal-footer">
          <button className="btn btn--primary" onClick={() => onEdit(codeword)}>✏️ Змінити</button>
          <button className="btn btn--secondary" onClick={onClose}>Закрити</button>
        </div>
      </div>
    </div>
  );
}
