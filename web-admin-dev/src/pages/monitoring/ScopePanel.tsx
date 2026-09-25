/**
 * Панель однієї теми показників: код, репозиторій, далі — Cloudflare.
 *
 * **Склад панелі береться з реєстру, а не зі списку в розмітці.** Саме заради
 * цього реєстр і існує: щоб новий показник з'явився на сторінці, досить рядка
 * в `@wwwuabot/shared/monitoring/metrics` і колектора, який його міряє, —
 * список на сторінці не правиться взагалі.
 *
 * **Показник, якого в цьому зрізі немає, не малюється.** Порожня картка з
 * нулем читалась би як «нуль» (нічого не зроблено), хоч насправді означала б
 * «не міряли»: частковий зріз — це стан, і сторінка не має права вигадувати
 * за нього число.
 *
 * @module web-admin-dev/src/pages/monitoring/ScopePanel
 */

import {
  TOTAL_GROUP,
  metricsOfScope,
  valueKey,
  type MetricScope,
} from "@wwwuabot/shared/monitoring";
import { MetricCard } from "./MetricCard";
import { MonPanel } from "./MonPanel";

interface ScopePanelProps {
  scope: MetricScope;
  title: string;
  /** Значення зрізу в групі `total`: `{ "code.lines": 41230, … }`. */
  values: Readonly<Record<string, number>>;
  /** Зміни проти попереднього зрізу — за ключем `група|метрика`. */
  deltas: Readonly<Record<string, number>>;
  open: boolean;
  onToggle: () => void;
}

export function ScopePanel({ scope, title, values, deltas, open, onToggle }: ScopePanelProps) {
  const metrics = metricsOfScope(scope).filter((metric) => values[metric.key] !== undefined);
  if (metrics.length === 0) return null;

  return (
    <MonPanel title={title} open={open} onToggle={onToggle}>
      <div className="mon-kpis">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.key}
            metric={metric.key}
            value={values[metric.key]}
            delta={deltas[valueKey(TOTAL_GROUP, metric.key)]}
          />
        ))}
      </div>
    </MonPanel>
  );
}
