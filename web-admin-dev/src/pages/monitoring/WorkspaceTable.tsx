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
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";

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

  const columns: readonly DataTableColumn<{ group: string; values: Record<string, number> }>[] = [
    {
      key: "group",
      header: "Воркспейс",
      width: 220,
      render: ({ group, values: row }) => {
        const bytes = row["code.size_bytes"] ?? 0;
        const share = totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0;
        return (
          <>
            <span className="mon-group">{group}</span>
            <span className="mon-bar">
              <span className="mon-bar-fill" style={{ width: `${share}%` }} />
            </span>
          </>
        );
      },
    },
    {
      key: "size",
      header: "Розмір",
      className: "wb-col-num",
      width: 110,
      render: ({ values: row }) => formatMetric("code.size_bytes", row["code.size_bytes"] ?? 0),
    },
    {
      key: "lines",
      header: "Рядків",
      className: "wb-col-num",
      width: 100,
      render: ({ values: row }) => formatMetric("code.lines", row["code.lines"] ?? 0),
    },
    {
      key: "code",
      header: "Коду",
      className: "wb-col-num",
      width: 100,
      render: ({ values: row }) => formatMetric("code.code_lines", row["code.code_lines"] ?? 0),
    },
    {
      key: "files",
      header: "Файлів",
      className: "wb-col-num",
      width: 100,
      render: ({ values: row }) => formatMetric("code.files", row["code.files"] ?? 0),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.group}
      empty="У цьому зрізі немає розбивки по воркспейсах."
      minWidth={720}
    />
  );
}
