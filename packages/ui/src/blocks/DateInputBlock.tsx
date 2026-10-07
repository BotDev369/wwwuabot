/**
 * Page Builder — DateInputBlock.
 * Введення однієї дати. Блок веде на **інший рядок контенту** (`basePath` +
 * `targetPath`), а не на хвіст своєї адреси: `ScenarioPage` бере весь splat як
 * slug, тож `/dateanalysis/2024-01-01` не знайшов би сторінки (`docs/CONTENT_MODEL.md`).
 * Дату несе `?dates=` — той самий параметр, що й у виборі чекбоксами.
 * @module packages/ui/src/blocks/DateInputBlock
 */

import { useState } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import { isValidDate } from "@wwwuabot/shared/utils/mydate-helpers";

export function DateInputBlock({ block }: BlockComponentProps) {
  const {
    label = "Дата народження",
    buttonLabel = "Показати аналіз",
    basePath = DATE_ANALYSIS_PATH,
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
  const ready = isValidDate(date);

  return (
    <div
      className="wb-block-date-input"
      style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}
    >
      <label className="wb-label" htmlFor="dateanalysis-date">
        {label}
      </label>
      <input
        id="dateanalysis-date"
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
          window.location.href = `${basePath}/${targetPath}?dates=${date}`;
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
