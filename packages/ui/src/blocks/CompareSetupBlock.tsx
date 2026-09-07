/**
 * Page Builder — CompareSetupBlock.
 *
 * Date input form for the comparison workflow.
 * Replaces the hardcoded CompareSetupPage.
 *
 * Users add dates, reorder them, and proceed to system selection.
 *
 * @module packages/ui/src/blocks/CompareSetupBlock
 */

import { useState, useCallback } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(raw: string): string {
  const parts = raw.split("-");
  if (parts.length !== 3) return raw;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

// ── Main Block Component ──────────────────────────────────────────

export function CompareSetupBlock({ block }: BlockComponentProps) {
  const {
    title = "Співставлення дат",
    description = "Вкажіть дати для аналізу. Дати можна переміщати — це визначить порядок відображення в таблиці.",
    maxDates = 10,
    nextUrl = "/mydate/compare/systems",
  } = block.props as {
    title?: string;
    description?: string;
    maxDates?: number;
    nextUrl?: string;
  };

  const [input, setInput] = useState("");
  const [dates, setDates] = useState<string[]>([]);

  const addDate = useCallback(() => {
    if (!input) return;
    if (dates.includes(input)) return;
    if (dates.length >= maxDates) return;
    setDates((prev) => [...prev, input]);
    setInput("");
  }, [input, dates, maxDates]);

  const move = useCallback((index: number, dir: -1 | 1) => {
    setDates((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const remove = useCallback((index: number) => {
    setDates((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const goNext = useCallback(() => {
    if (dates.length === 0) return;
    const url = `${nextUrl}?dates=${encodeURIComponent(dates.join(","))}`;
    window.location.href = url;
  }, [dates, nextUrl]);

  return (
    <div className="wb-block-compare-setup">
      <h2>{title}</h2>
      <p className="wb-text-sm wb-text-muted" style={{ marginBottom: "var(--sp-4)" }}>
        {description}
      </p>

      {/* Date input */}
      <div style={{ display: "flex", gap: "var(--sp-3)", marginBottom: "var(--sp-4)" }}>
        <input
          type="date"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="wb-input"
          style={{ flex: 1 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addDate();
            }
          }}
        />
        <button
          className="wb-btn wb-btn-primary"
          onClick={addDate}
          disabled={!input || dates.length >= maxDates}
        >
          Додати дату
        </button>
      </div>

      {/* Date list */}
      {dates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
          {dates.map((d, i) => (
            <div
              key={`${d}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--sp-3)",
                padding: "var(--sp-3)",
                background: "var(--bg-1, #fff)",
                border: "1px solid var(--border-subtle, #e2e8f0)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <span style={{ flex: 1, fontWeight: 500 }}>{formatDate(d)}</span>
              <button
                className="wb-btn wb-btn-sm wb-btn-secondary"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                title="Вгору"
              >
                ↑
              </button>
              <button
                className="wb-btn wb-btn-sm wb-btn-secondary"
                onClick={() => move(i, 1)}
                disabled={i === dates.length - 1}
                title="Вниз"
              >
                ↓
              </button>
              <button
                className="wb-btn wb-btn-sm wb-btn-danger"
                onClick={() => remove(i)}
                title="Видалити"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action button */}
      <button
        className="wb-btn wb-btn-primary"
        onClick={goNext}
        disabled={dates.length === 0}
        style={{ width: "100%" }}
      >
        {dates.length === 0
          ? "Додайте хоча б одну дату"
          : `Обрати системи для співставлення (${dates.length})`}
      </button>
    </div>
  );
}
