/**
 * Page Builder — DateInputBlock.
 * Введення однієї дати. Блок веде на **інший рядок контенту** (`basePath` +
 * `targetPath`), а не на хвіст своєї адреси: `ScenarioPage` бере весь splat
 * як slug, тож `/mydate/2024-01-01` не знайшов би сторінки
 * (`docs/CONTENT_MODEL.md`).
 * @module packages/ui/src/blocks/DateInputBlock
 */

import { useState } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

/** Рядки адреси не можуть містити `_`, а дата — лише цифри й дефіс. */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function DateInputBlock({ block }: BlockComponentProps) {
  const {
    label = "Дата народження",
    buttonLabel = "Показати аналіз",
    basePath = "/mydate",
    targetPath = "analysis",
    min = "1900-01-01",
    max = "2100-12-31",
  } = block.props as {
    label?: string;
    buttonLabel?: string;
    basePath?: string;
    targetPath?: string;
    min?: string;
    max?: string;
  };

  const [date, setDate] = useState("");
  const ready = DATE_RE.test(date);

  return (
    <div
      className="wb-block-date-input"
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}
    >
      <label className="wb-label" htmlFor="mydate-date">
        {label}
      </label>
      <input
        id="mydate-date"
        name="date"
        type="date"
        className="wb-input"
        value={date}
        min={min}
        max={max}
        onChange={(e) => setDate(e.target.value)}
        style={{ width: "100%" }}
      />
      <button
        type="button"
        className="wb-btn wb-btn-primary"
        disabled={!ready}
        style={{ width: "100%" }}
        onClick={() => {
          // Те саме, що робить `compare-setup`: повна адреса, а не `pushState`,
          // бо ціль — інший рядок контенту, а не стан цього екрана.
          window.location.href = `${basePath}/${targetPath}?date=${date}`;
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
