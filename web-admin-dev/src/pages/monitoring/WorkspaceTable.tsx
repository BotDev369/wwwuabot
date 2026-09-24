/**
 * Розбивка останнього зрізу по воркспейсах.
 *
 * Це відповідь на «де саме виросло»: той самий показник у `api-dev`,
 * `packages` і `docs` — різні речі, і зведене число про проєкт їх не
 * розрізняє. Частка розміру показана смугою — так видно перекіс, який у
 * таблиці чисел читається очима.
 *
 * @module web-admin-dev/src/pages/monitoring/WorkspaceTable
 */

import {
  TOTAL_GROUP,
  formatMetric,
  groupValues,
  groupsOf,
  type MetricValue,
} from "@wwwuabot/shared/monitoring";

interface WorkspaceTableProps {
  values: readonly MetricValue[];
}

export function WorkspaceTable({ values }: WorkspaceTableProps) {
  const total = groupValues(values, TOTAL_GROUP);
  const totalBytes = total["code.size_bytes"] ?? 0;

  const rows = groupsOf(values)
    .map((group) => ({ group, values: groupValues(values, group) }))
    .sort(
      (a, b) =>
        (b.values["code.size_bytes"] ?? 0) - (a.values["code.size_bytes"] ?? 0) ||
        a.group.localeCompare(b.group),
    );

  if (rows.length === 0) {
    return <p className="mon-chart-empty">У цьому зрізі немає розбивки по воркспейсах.</p>;
  }

  return (
    <table className="mon-table">
      <thead>
        <tr>
          <th>Воркспейс</th>
          <th className="mon-table-num">Розмір</th>
          <th className="mon-table-num">Рядків</th>
          <th className="mon-table-num">Коду</th>
          <th className="mon-table-num">Файлів</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ group, values: row }) => {
          const bytes = row["code.size_bytes"] ?? 0;
          const share = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;

          return (
            <tr key={group}>
              <td>
                <span className="mon-group">{group}</span>
                <span className="mon-bar">
                  <span className="mon-bar-fill" style={{ width: `${share}%` }} />
                </span>
              </td>
              <td className="mon-table-num">{formatMetric("code.size_bytes", bytes)}</td>
              <td className="mon-table-num">
                {formatMetric("code.lines", row["code.lines"] ?? 0)}
              </td>
              <td className="mon-table-num">
                {formatMetric("code.code_lines", row["code.code_lines"] ?? 0)}
              </td>
              <td className="mon-table-num">
                {formatMetric("code.files", row["code.files"] ?? 0)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
