/**
 * Page Builder — графік.
 *
 * Інлайн лишається рівно на трьох речах, і всі три — дані: кут сектора
 * (`conic-gradient`), висота стовпця й колір, який автор задав у даних.
 *
 * @module packages/ui/src/blocks/ChartBlock
 */

import { useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = [
  "var(--accent)",
  "var(--green)",
  "var(--yellow)",
  "var(--red)",
  "#7c3aed",
  "#06b6d4",
  "#f97316",
  "#ec4899",
];

export function ChartBlock({ block }: BlockComponentProps) {
  const {
    type = "bar",
    data = [],
    title = "",
    showLabels = true,
  } = block.props as {
    type?: string;
    data?: ChartDataItem[];
    title?: string;
    showLabels?: boolean;
  };

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  if (data.length === 0) return null;

  if (type === "pie") {
    // Сектор — це кут у градусах: єдине, що справді народжується з даних.
    const total = data.reduce((s, d) => s + d.value, 0);
    let accumulated = 0;
    const gradientParts: string[] = [];

    data.forEach((item, i) => {
      const start = (accumulated / total) * 360;
      accumulated += item.value;
      const end = (accumulated / total) * 360;
      const color = item.color || PALETTE[i % PALETTE.length];
      gradientParts.push(`${color} ${start}deg ${end}deg`);
    });

    return (
      <div className="wb-block-chart">
        {title && <h4 className="wb-block-chart__title">{title}</h4>}
        <div className="wb-block-chart__pie-row">
          <div
            className="wb-block-chart__pie"
            style={{ background: `conic-gradient(${gradientParts.join(", ")})` }}
          />
          <div className="wb-block-chart__legend">
            {data.map((item, i) => (
              <div key={i} className="wb-block-chart__legend-item">
                <span
                  className="wb-block-chart__dot"
                  style={{ background: item.color || PALETTE[i % PALETTE.length] }}
                />
                <span className="wb-text-sm">{item.label}</span>
                {showLabels && (
                  <span className="wb-block-chart__pct">
                    {Math.round((item.value / total) * 100)}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Стовпчики: висота — частка від найбільшого значення, тобто теж дані.
  return (
    <div className="wb-block-chart">
      {title && <h4 className="wb-block-chart__title">{title}</h4>}
      <div className="wb-block-chart__bars">
        {data.map((item, i) => {
          const heightPercent = (item.value / maxValue) * 100;
          const color = item.color || PALETTE[i % PALETTE.length];

          return (
            <div key={i} className="wb-block-chart__bar-col">
              {showLabels && <span className="wb-block-chart__pct">{item.value}</span>}
              <div
                className="wb-block-chart__bar"
                style={{ height: `${heightPercent}%`, background: color }}
              />
              <span className="wb-block-chart__axis-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
