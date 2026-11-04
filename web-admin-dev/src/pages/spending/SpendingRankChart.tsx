/**
 * Рейтинг довжиною смуги: хто скільки зʼїв від найбільшого.
 *
 * Горизонтальні смуги, а не стовпці: підписи — коди й назви, які в стовпцях
 * довелось би повертати на 90°. Точні числа стоять у таблиці поруч, тут форма
 * ряду: око шукає не суму, а перекіс.
 * @module web-admin-dev/src/pages/spending/SpendingRankChart
 */

import { formatCompactMoney, formatShare } from "./format";

export interface RankRow {
  readonly key: string;
  readonly label: string;
  readonly amount: number;
  /** Підпис праворуч замість грошей: частка, кількість — що саме тут читають. */
  readonly note?: string;
}

interface SpendingRankChartProps {
  readonly rows: readonly RankRow[];
  readonly total: number;
  readonly label?: string;
}

export function SpendingRankChart({ rows, total, label }: SpendingRankChartProps) {
  const max = rows.reduce((top, row) => Math.max(top, row.amount), 0);

  if (rows.length === 0 || max === 0) return null;

  return (
    <figure className="spend-rank">
      {label && <figcaption className="spend-rank-caption">{label}</figcaption>}
      {rows.map((row) => {
        const width = Math.max((row.amount / max) * 100, row.amount > 0 ? 1 : 0);

        return (
          <div key={row.key} className="spend-rank-row">
            <span className="spend-rank-label" title={row.label}>
              {row.label}
            </span>
            <svg
              className="spend-rank-bar"
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <rect className="spend-rank-fill" x="0" y="0" width={width} height="8" rx="4" />
            </svg>
            <span className="spend-rank-value">
              {formatCompactMoney(row.amount)}
              <span className="spend-rank-share">{row.note ?? formatShare(row.amount, total)}</span>
            </span>
          </div>
        );
      })}
    </figure>
  );
}
