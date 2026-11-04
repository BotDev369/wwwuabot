/**
 * Діаграма ряду: один стовпець на точку, висота — частка від максимуму.
 *
 * Ширина береться з `viewBox`, а не з пікселів: ряд тягнеться на всю панель і
 * на телефоні, і на широкому екрані без окремого розрахунку. Числа стоять у
 * таблиці поруч — стовпець показує форму, а не точне значення.
 * @module web-admin-dev/src/pages/spending/SpendingBarChart
 */

import { formatCompactMoney } from "./format";

interface ChartPoint {
  readonly key: string;
  readonly amount: number;
}

interface SpendingBarChartProps {
  readonly points: readonly ChartPoint[];
  readonly label: (key: string) => string;
}

/** Скільки підписів по осі: решта — шум, який не читають. */
const TICKS = 6;

export function SpendingBarChart({ points, label }: SpendingBarChartProps) {
  const max = Math.max(...points.map((point) => point.amount), 0);
  const step = points.length > 0 ? 100 / points.length : 100;
  const ticks = points.filter(
    (_, index) =>
      index === 0 ||
      index === points.length - 1 ||
      index % Math.max(1, Math.ceil(points.length / TICKS)) === 0,
  );

  if (points.length === 0 || max === 0) {
    return (
      <p className="spend-list-note">
        Ряд порожній: за це вікно джерело не віддало жодного платежу.
      </p>
    );
  }

  return (
    <div className="spend-chart">
      <svg
        className="spend-chart-svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Сума платежів за точками ряду"
      >
        {points.map((point, index) => {
          const height = max > 0 ? (point.amount / max) * 100 : 0;
          return (
            <rect
              key={point.key}
              className="spend-chart-bar"
              x={index * step + step * 0.12}
              y={100 - height}
              width={step * 0.76}
              height={Math.max(height, point.amount > 0 ? 1 : 0)}
            >
              <title>{`${label(point.key)}: ${formatCompactMoney(point.amount)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="spend-chart-axis">
        {ticks.map((point) => (
          <span key={point.key} className="spend-chart-tick">
            {label(point.key)}
          </span>
        ))}
      </div>
    </div>
  );
}
