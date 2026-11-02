/**
 * Page Builder — графік: стовпці, сектори, нахил і теплова карта.
 *
 * Інлайн лишається рівно на даних: кут сектора, висота стовпця, положення
 * точки нахилу й насиченість клітинки. Геометрія — похідна чисел, не розмітки.
 *
 * @module packages/ui/src/blocks/ChartBlock
 */

import { Fragment, useMemo } from "react";
import type { BlockComponentProps } from "@wwwuabot/shared/types/page-config";

interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

/** Точка нахилу: частка «було» → «стало» — те, що показує зміну напрямку. */
interface SlopeItem {
  label: string;
  from: number;
  to: number;
  color?: string;
}

/** Рядок теплової карти: підпис і значення по колонках. */
interface HeatRow {
  label: string;
  cells: number[];
}

/** Палітра даних — токени теми: серія має власний голос, а не колір сусідньої. */
const PALETTE = [
  "var(--data-1)",
  "var(--data-2)",
  "var(--data-3)",
  "var(--data-4)",
  "var(--data-5)",
  "var(--data-6)",
];

/**
 * Колір клітинки теплової карти: холодний тон на малих значеннях, теплий — на
 * великих, а насиченість росте разом із часткою. Два кольори — це шкала, один
 * колір — це пляма, у якій не видно, де більше.
 */
function heatColor(value: number, max: number): string {
  const share = max > 0 ? value / max : 0;
  const ramp = ["var(--data-6)", "var(--data-3)", "var(--data-1)"];
  const step = Math.min(ramp.length - 1, Math.floor(share * ramp.length));
  const strength = 18 + Math.round(share * 40);
  return `color-mix(in srgb, ${ramp[step]} ${strength}%, var(--card-bg))`;
}

interface SlopeProps {
  items: SlopeItem[];
  title: string;
  fromLabel: string;
  toLabel: string;
  showLabels: boolean;
}

/**
 * Нахил малюється в одному SVG: дві колонки точок і лінії між ними.
 *
 * Вісь Y не нульова, а **від найменшого до найбільшого** значення: у частках
 * різниця між 25% і 29% — це вся історія блоку, і нульова вісь її б з'їла.
 */
function Slope({ items, title, fromLabel, toLabel, showLabels }: SlopeProps) {
  const rowHeight = 42;
  const top = 30;
  const width = 760;
  const plotLeft = 240;
  const plotRight = 650;
  const height = top + items.length * rowHeight + 8;

  const values = items.flatMap((item) => [item.from, item.to]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const y = (value: number): number =>
    top + ((max - value) / span) * (items.length - 1) * rowHeight + rowHeight / 2;

  return (
    <svg
      className="wb-block-chart__slope"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title || "Зміна значень"}
    >
      {fromLabel && (
        <text x={plotLeft} y={14} textAnchor="middle" className="wb-block-chart__slope-caption">
          {fromLabel}
        </text>
      )}
      {toLabel && (
        <text x={plotRight} y={14} textAnchor="middle" className="wb-block-chart__slope-caption">
          {toLabel}
        </text>
      )}
      {items.map((item, i) => {
        const color = item.color || PALETTE[i % PALETTE.length];
        const yFrom = y(item.from);
        const yTo = y(item.to);

        return (
          <Fragment key={item.label}>
            <line
              x1={plotLeft}
              y1={yFrom}
              x2={plotRight}
              y2={yTo}
              stroke={color}
              className="wb-block-chart__slope-line"
            />
            <circle
              cx={plotLeft}
              cy={yFrom}
              r={4}
              fill={color}
              className="wb-block-chart__slope-dot"
            />
            <circle
              cx={plotRight}
              cy={yTo}
              r={4}
              fill={color}
              className="wb-block-chart__slope-dot"
            />
            <text x={0} y={yFrom + 4} className="wb-block-chart__slope-name">
              {item.label}
            </text>
            {showLabels && (
              <>
                <text
                  x={plotLeft - 10}
                  y={yFrom + 4}
                  textAnchor="end"
                  className="wb-block-chart__slope-value"
                >
                  {item.from}
                </text>
                <text
                  x={plotRight + 10}
                  y={yTo + 4}
                  textAnchor="start"
                  className="wb-block-chart__slope-value"
                >
                  {item.to}
                </text>
              </>
            )}
          </Fragment>
        );
      })}
    </svg>
  );
}

interface HeatmapProps {
  rows: HeatRow[];
  columns: string[];
  unit: string;
}

/**
 * Теплова карта — це таблиця, а не набір прямокутників: читання з екрана й
 * озвучування лишаються табличними, а насиченість клітинки — лише підказка.
 */
function Heatmap({ rows, columns, unit }: HeatmapProps) {
  const values = rows.flatMap((row) => row.cells);
  const max = Math.max(...values, 1);
  const width = Math.max(...rows.map((row) => row.cells.length));

  return (
    <table className="wb-block-chart__heat">
      <thead>
        <tr>
          <th scope="col" />
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            {Array.from({ length: width }, (_, i) => {
              const value = row.cells[i];
              if (value === undefined) return <td key={i} />;

              return (
                <td key={i} style={{ background: heatColor(value, max) }}>
                  {value}
                  {unit}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ChartBlock({ block }: BlockComponentProps) {
  const {
    type = "bar",
    data = [],
    rows = [],
    columns = [],
    title = "",
    showLabels = true,
    fromLabel = "",
    toLabel = "",
    unit = "",
  } = block.props as {
    type?: string;
    data?: ChartDataItem[];
    rows?: HeatRow[];
    columns?: string[];
    title?: string;
    showLabels?: boolean;
    fromLabel?: string;
    toLabel?: string;
    unit?: string;
  };

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  if (type === "heatmap" && rows.length > 0) {
    return (
      <div className="wb-block-chart">
        {title && <h4 className="wb-block-chart__title">{title}</h4>}
        <Heatmap rows={rows} columns={columns} unit={unit} />
      </div>
    );
  }

  if (type === "slope" && data.length > 0) {
    return (
      <div className="wb-block-chart">
        {title && <h4 className="wb-block-chart__title">{title}</h4>}
        <Slope
          items={data as unknown as SlopeItem[]}
          title={title}
          fromLabel={fromLabel}
          toLabel={toLabel}
          showLabels={showLabels}
        />
      </div>
    );
  }

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
                style={{ height: `${heightPercent}%`, backgroundColor: color }}
              />
              <span className="wb-block-chart__axis-label">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
