import type { CSSProperties } from "react";
import { richToRuns, type TextRun } from "./richtext.model";

export function RichPreview({ value }: { value: unknown }) {
  const runs = richToRuns(value);
  if (runs.length === 0) return <span className="tg-placeholder">…</span>;
  return (
    <>
      {runs.map((r, i) => (
        <span key={i} style={runStyle(r)} className={r.marked ? "rt-marked" : undefined}>
          {r.url ? (
            <a className="rt-link" href={r.url} target="_blank" rel="noreferrer">
              {r.text}
            </a>
          ) : (
            r.text
          )}
        </span>
      ))}
    </>
  );
}

function runStyle(r: TextRun): CSSProperties {
  const deco = [r.underline ? "underline" : null, r.strikethrough ? "line-through" : null]
    .filter(Boolean)
    .join(" ");
  return {
    fontWeight: r.bold ? 700 : undefined,
    fontStyle: r.italic ? "italic" : undefined,
    textDecoration: deco || undefined,
  };
}
