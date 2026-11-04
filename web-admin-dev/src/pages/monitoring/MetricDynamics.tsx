/**
 * Усі показники зрізу в динаміці — таблиця «показник × зріз».
 *
 * **Навіщо, якщо є графік.** Графік показує один показник лінією: він
 * відповідає «як змінювався оцей», але не «що взагалі міряється» — решта
 * показників на ньому просто невидимі. Таблиця показує **весь реєстр
 * одразу**: рядок на показник, колонка на зріз, тож видно і склад зрізу, і
 * динаміку кожного числа.
 *
 * **Список рядків тут не перелічено** — він береться з реєстру показників
 * (`@wwwuabot/shared/monitoring`), як і в `ScopePanel`: новий показник
 * з'явиться в таблиці сам, щойно його почне міряти колектор.
 *
 * **Прочерк — це не нуль.** Зріз може бути частковим, і тоді показника в
 * ньому немає зовсім. Нуль у клітинці читався б як «нічого немає», хоч
 * насправді «не міряли» — тому порожньо видно саме як порожньо.
 *
 * @module web-admin-dev/src/pages/monitoring/MetricDynamics
 */

import {
  METRICS,
  TOTAL_GROUP,
  formatDelta,
  formatMetric,
  metricValues,
  periodDelta,
  sortPoints,
  type SnapshotPoint,
} from "@wwwuabot/shared/monitoring";
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
import { MonPanel } from "./MonPanel";
import { deltaClass, shortRef, stampParts } from "./format";

interface MetricDynamicsProps {
  history: readonly SnapshotPoint[];
  open: boolean;
  onToggle: () => void;
}

/** Рядок таблиці: показник і його значення по зрізах, у тому ж порядку. */
interface DynamicsRow {
  readonly metric: (typeof METRICS)[number];
  readonly series: readonly (number | undefined)[];
}

export function MetricDynamics({ history, open, onToggle }: MetricDynamicsProps) {
  const points = sortPoints(history);
  // Показник, якого немає в жодному зрізі, рядка не отримує: рядок із самих
  // прочерків виглядав би як «усе по нулях», хоч його просто ніколи не міряли.
  const rows = METRICS.map((metric) => ({
    metric,
    series: metricValues(points, metric.key, TOTAL_GROUP),
  })).filter((row) => row.series.some((value) => value !== undefined));

  const columns: readonly DataTableColumn<DynamicsRow>[] = [
    {
      key: "metric",
      header: "Показник",
      className: "wb-cell-nowrap",
      width: 190,
      render: ({ metric }) => <span className="mon-dyn-label">{metric.label}</span>,
    },
    ...points.map((point) => {
      const [date, time] = stampParts(point.collectedAt);
      const column: DataTableColumn<DynamicsRow> = {
        key: `point-${point.id}`,
        header: (
          <>
            <span className="mon-dyn-head">{date}</span>
            <span className="mon-dyn-head">{time}</span>
            <span className="mon-ref">{shortRef(point.ref)}</span>
          </>
        ),
        className: "wb-col-num",
        width: 104,
        render: ({ metric, series }) => {
          const value = series[points.indexOf(point)];
          return value === undefined ? "—" : formatMetric(metric.key, value);
        },
      };
      return column;
    }),
    {
      key: "delta",
      header: "Δ за період",
      className: "wb-col-num",
      width: 120,
      render: ({ metric }) => {
        const delta = periodDelta(points, metric.key, TOTAL_GROUP);
        return (
          <span className={`mon-kpi-delta ${deltaClass(metric.trend, delta)}`}>
            {delta === undefined ? "—" : formatDelta(metric.key, delta)}
          </span>
        );
      },
    },
  ];

  return (
    <MonPanel title="Всі показники в динаміці" open={open} onToggle={onToggle}>
      {rows.length === 0 ? (
        <p className="mon-chart-empty">
          Зрізів поки немає — таблиця заповниться після першого збору.
        </p>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.metric.key}
            empty="Зрізів поки немає."
            tableClassName="mon-dynamics"
            minWidth={points.length * 104 + 320}
          />

          <p className="mon-chart-note">
            Колонка на кожен зріз, у хронологічному порядку; під часом — коміт, на який зріз знято.
            «Δ за період» — різниця між першим і останнім <strong>виміряним</strong> зрізом, а не
            між першим і останнім стовпцем.
          </p>
        </>
      )}
    </MonPanel>
  );
}
