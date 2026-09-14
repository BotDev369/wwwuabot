import { useState } from "react";

/** Згорнутий переглядач JSON: спершу короткий підсумок, розгортання — за кліком. */
export function JsonBlock({ label, value }: { label: string; value: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  let summary = "—";
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) summary = `Масив [${parsed.length}]`;
    else if (typeof parsed === "object" && parsed !== null)
      summary = `Об'єкт {${Object.keys(parsed).length}}`;
  } catch {
    summary = str.length > 60 ? str.slice(0, 60) + "…" : str;
  }

  const toggleStyle = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--accent, #6c5ce7)",
    fontSize: 13,
    padding: 0,
  } as const;

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: "var(--text-muted, #888)", marginBottom: 4 }}>{label}</div>
      {!expanded ? (
        <button onClick={() => setExpanded(true)} style={toggleStyle}>
          ▸ {summary}
        </button>
      ) : (
        <div>
          <button onClick={() => setExpanded(false)} style={{ ...toggleStyle, marginBottom: 4 }}>
            ▾ {summary}
          </button>
          <pre
            style={{
              background: "var(--bg-2, #1a1a2e)",
              padding: 8,
              borderRadius: 6,
              fontSize: 11,
              overflow: "auto",
              margin: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {str}
          </pre>
        </div>
      )}
    </div>
  );
}
