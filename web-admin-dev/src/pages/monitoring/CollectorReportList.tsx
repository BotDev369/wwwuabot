/**
 * Звіт колекторів — **чому** зріз такий, який він є.
 *
 * Без цього блоку нуль у показнику не відрізнити від «не змогли зібрати»:
 * саме тому стан колекторів зберігається разом зі зрізом, а не живе лише в
 * логах (логи живуть три дні, питання — місяць).
 *
 * @module web-admin-dev/src/pages/monitoring/CollectorReportList
 */

import type { CollectorReport } from "@wwwuabot/shared/monitoring";
import { collectorStatusLabel, formatDuration, statusClass } from "./format";

interface CollectorReportListProps {
  collectors: readonly CollectorReport[];
}

export function CollectorReportList({ collectors }: CollectorReportListProps) {
  if (collectors.length === 0) {
    return <p className="mon-chart-empty">Звіту колекторів у цього зрізу немає.</p>;
  }

  return (
    <div className="mon-collectors">
      {collectors.map((collector) => (
        <div className="mon-collector" key={collector.id}>
          <div className="mon-collector-head">
            <span className={`mon-status ${statusClass(collector.status)}`}>
              {collectorStatusLabel(collector.status)}
            </span>
            <span className="mon-collector-label">{collector.label}</span>
            {collector.status === "ok" && (
              <span className="mon-collector-meta">{formatDuration(collector.durationMs)}</span>
            )}
          </div>
          {collector.message && <p className="mon-collector-meta">{collector.message}</p>}
        </div>
      ))}
    </div>
  );
}
