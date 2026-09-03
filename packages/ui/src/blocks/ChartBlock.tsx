/**
 * Page Builder — Chart Block.
 *
 * Displays a simple bar or pie chart using pure CSS (no external libraries).
 *
 * @module packages/ui/src/blocks/ChartBlock
 */

import { useMemo } from 'react';
import type { BlockComponentProps } from '@wwwuabot/shared/types/page-config';

interface ChartDataItem {
  label: string;
  value: number;
  color?: string;
}

const PALETTE = [
  'var(--accent)',
  'var(--green)',
  'var(--yellow)',
  'var(--red)',
  '#7c3aed',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

export function ChartBlock({ block }: BlockComponentProps) {
  const {
    type = 'bar',
    data = [],
    title = '',
    showLabels = true,
  } = block.props as {
    type?: string;
    data?: ChartDataItem[];
    title?: string;
    showLabels?: boolean;
  };

  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  if (data.length === 0) return null;

  if (type === 'pie') {
    // Simple CSS pie chart using conic-gradient
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
        {title && (
          <h4 className="wb-font-semibold wb-mb-3">{title}</h4>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-5)', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: 'var(--radius-full)',
              background: `conic-gradient(${gradientParts.join(', ')})`,
              flexShrink: 0,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {data.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <span
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: 'var(--radius-sm)',
                    background: item.color || PALETTE[i % PALETTE.length],
                    flexShrink: 0,
                  }}
                />
                <span className="wb-text-sm">{item.label}</span>
                {showLabels && (
                  <span className="wb-text-xs wb-text-muted">
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

  // Bar chart (default)
  return (
    <div className="wb-block-chart">
      {title && (
        <h4 className="wb-font-semibold wb-mb-3">{title}</h4>
      )}
      <div
        className="wb-block-chart__bars"
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 'var(--sp-2)',
          height: '160px',
          padding: '0 var(--sp-1)',
        }}
      >
        {data.map((item, i) => {
          const heightPercent = (item.value / maxValue) * 100;
          const color = item.color || PALETTE[i % PALETTE.length];

          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--sp-1)',
                height: '100%',
                justifyContent: 'flex-end',
              }}
            >
              {showLabels && (
                <span className="wb-text-xs wb-text-muted">{item.value}</span>
              )}
              <div
                style={{
                  width: '100%',
                  maxWidth: '40px',
                  height: `${heightPercent}%`,
                  background: color,
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  transition: 'height var(--duration-normal) var(--ease)',
                }}
              />
              <span
                className="wb-text-xs wb-text-secondary"
                style={{
                  writingMode: 'vertical-lr',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  maxHeight: '40px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
