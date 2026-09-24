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

  return (
    <table className="mon-table">
      <thead>
        <tr>
          <th>Коли</th>
          <th>Збір</th>
          <th>Стан</th>
          <th className="mon-table-num">Розмір</th>
          <th className="mon-table-num">Рядків</th>
          <th className="mon-table-num">Файлів</th>
          <th>Коміт</th>
        </tr>
      </thead>
      <tbody>
        {history.map((point) => (
          <tr key={point.id}>
            <td>{formatStamp(point.collectedAt)}</td>
            <td>{triggerLabel(point.trigger)}</td>
            <td>
              <span className={`mon-status ${statusClass(point.status)}`}>
                {statusLabel(point.status)}
              </span>
            </td>
            <td className="mon-table-num">
              {formatMetric("code.size_bytes", metricOf(point, "code.size_bytes"))}
            </td>
            <td className="mon-table-num">
              {formatMetric("code.lines", metricOf(point, "code.lines"))}
            </td>
            <td className="mon-table-num">
              {formatMetric("code.files", metricOf(point, "code.files"))}
            </td>
            <td>
              <span className="mon-ref">{shortRef(point.ref)}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
