/**
 * Історія зрізів — те, з чого складається динаміка.
 *
 * Кожен рядок несе ще й **стан** зрізу: частковий зріз у динаміці виглядає як
 * провал, і без позначки «частковий» падіння виглядало б як спад коду.
 * Коміт показано, бо саме на ньому зріз знято — без нього стрибок у графіку
 * нічим не пояснити.
 *
 * @module web-admin-dev/src/pages/monitoring/SnapshotHistory
 */

import {
  TOTAL_GROUP,
  formatMetric,
  valueKey,
  type SnapshotPoint,
} from "@wwwuabot/shared/monitoring";
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
import { formatStamp, shortRef, statusClass, statusLabel, triggerLabel } from "./format";

interface SnapshotHistoryProps {
  history: readonly SnapshotPoint[];
}

export function SnapshotHistory({ history }: SnapshotHistoryProps) {
  if (history.length === 0) {
    return <p className="mon-chart-empty">Зрізів ще немає.</p>;
  }

  const metricOf = (point: SnapshotPoint, metric: string): number =>
    point.totals[valueKey(TOTAL_GROUP, metric)] ?? 0;

  const columns: readonly DataTableColumn<SnapshotPoint>[] = [
    {
      key: "when",
      header: "Коли",
      className: "wb-cell-nowrap",
      width: 150,
      render: (point) => formatStamp(point.collectedAt),
    },
    {
      key: "trigger",
      header: "Збір",
      className: "wb-cell-nowrap",
      width: 120,
      render: (point) => triggerLabel(point.trigger),
    },
    {
      key: "status",
      header: "Стан",
      className: "wb-cell-nowrap",
      width: 130,
      render: (point) => (
        <span className={`mon-status ${statusClass(point.status)}`}>
          {statusLabel(point.status)}
        </span>
      ),
    },
    {
      key: "size",
      header: "Розмір",
      className: "wb-col-num",
      width: 110,
      render: (point) => formatMetric("code.size_bytes", metricOf(point, "code.size_bytes")),
    },
    {
      key: "lines",
      header: "Рядків",
      className: "wb-col-num",
      width: 100,
      render: (point) => formatMetric("code.lines", metricOf(point, "code.lines")),
    },
    {
      key: "files",
      header: "Файлів",
      className: "wb-col-num",
      width: 100,
      render: (point) => formatMetric("code.files", metricOf(point, "code.files")),
    },
    {
      key: "ref",
      header: "Коміт",
      className: "wb-cell-nowrap",
      width: 90,
      render: (point) => <span className="mon-ref">{shortRef(point.ref)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={history}
      rowKey={(point) => String(point.id)}
      empty="Зрізів ще немає."
      minWidth={820}
    />
  );
}
