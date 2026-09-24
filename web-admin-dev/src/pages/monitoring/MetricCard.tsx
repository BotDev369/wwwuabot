/**
 * Картка одного показника зрізу: значення, зміна і пояснення.
 *
 * Показники беруться з реєстру (`@wwwuabot/shared/monitoring`), тож картки
 * описуються списком, а не розміткою: новий показник з'являється на сторінці
 * рядком у реєстрі.
 *
 * @module web-admin-dev/src/pages/monitoring/MetricCard
 */

import { formatDelta, formatMetric, metricDefinition } from "@wwwuabot/shared/monitoring";
import { deltaClass } from "./format";

interface MetricCardProps {
  /** Ключ із реєстру (`code.lines`). */
  metric: string;
  value: number;
  /** Зміна проти попереднього зрізу; `undefined` — порівнювати нема з чим. */
  delta?: number;
  /** Група показника: `total` або ім'я воркспейса. */
  group?: string;
}

export function MetricCard({ metric, value, delta, group = "total" }: MetricCardProps) {
  const definition = metricDefinition(metric);
  if (!definition) return null;

  return (
    <div className="mon-kpi">
      <div className="mon-kpi-head">
        <span className="mon-kpi-label">{definition.label}</span>
        {group !== "total" && <span className="mon-kpi-group">{group}</span>}
      </div>

      <div className="mon-kpi-row">
        <span className="mon-kpi-value">{formatMetric(metric, value)}</span>
        <span className={`mon-kpi-delta ${deltaClass(definition.trend, delta)}`}>
          {delta === undefined ? "—" : formatDelta(metric, delta)}
        </span>
      </div>

      <p className="mon-kpi-hint">{definition.hint}</p>
    </div>
  );
}
