/**
 * Стан збору: кроки, помилки й довідка джерела.
 *
 * Перша колонка — розпорядник, а не «Договори»: підпис рядка мусить
 * відрізняти рядки, а тип кроку має власний стовпчик.
 * @module web-admin-dev/src/pages/spending/SpendingSyncPanel
 */

import type { SpendingLastLoad, SpendingOrg, SpendingSyncRow } from "@wwwuabot/shared/spending";
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
import {
  formatCount,
  formatDate,
  formatPeriod,
  formatStamp,
  lastLoadSources,
  statusClass,
  statusLabel,
  syncKindLabel,
  syncStepSubject,
} from "./format";

interface SpendingSyncPanelProps {
  rows: readonly SpendingSyncRow[];
  lastLoad: SpendingLastLoad | null;
  orgs: readonly SpendingOrg[];
}

/** Рядок таблиці: предмет кроку окремо від його типу й стану. */
interface SyncRowView {
  readonly key: string;
  readonly subject: string;
  readonly code: string;
  readonly step: string;
  readonly row: SpendingSyncRow;
}

interface SourceRow {
  readonly name: string;
  readonly date: string;
}

const SOURCE_COLUMNS: readonly DataTableColumn<SourceRow>[] = [
  { key: "name", header: "Джерело", className: "spend-col-org", render: (row) => row.name },
  {
    key: "date",
    header: "Дата даних джерела",
    className: "spend-col-date",
    render: (row) => formatDate(row.date),
  },
];

export function SpendingSyncPanel({ rows, lastLoad, orgs }: SpendingSyncPanelProps) {
  const sources = lastLoad ? lastLoadSources(lastLoad.raw) : [];
  const hasErrors = rows.some((row) => Boolean(row.error));

  const views: SyncRowView[] = rows.map((row) => {
    const [, edrpou = ""] = row.key.split(":");

    return {
      key: row.key,
      subject: syncStepSubject(row, orgs),
      code: row.key.startsWith("org:") ? edrpou : "",
      step: syncKindLabel(row.kind),
      row,
    };
  });

  const columns: readonly DataTableColumn<SyncRowView>[] = [
    {
      key: "subject",
      header: "Розпорядник / пачка",
      className: "spend-col-org",
      render: (view) => (
        <>
          <span className="wb-cell-title" title={view.subject}>
            {view.subject}
          </span>
          {view.code && <span className="wb-cell-sub">{view.code}</span>}
        </>
      ),
    },
    {
      key: "step",
      header: "Крок",
      className: "spend-col-step",
      render: (view) => view.step,
    },
    {
      key: "period",
      header: "Період",
      className: "spend-col-period",
      render: (view) => (view.row.period ? formatPeriod(view.row.period) : "—"),
    },
    {
      key: "status",
      header: "Стан",
      className: "spend-col-status",
      render: (view) => (
        <span className={statusClass(view.row.status)}>{statusLabel(view.row.status)}</span>
      ),
    },
    {
      key: "rows",
      header: "Рядків",
      className: "spend-col-count wb-col-num",
      render: (view) => formatCount(view.row.rows),
    },
    {
      key: "finished",
      header: "Завершено",
      className: "spend-col-date",
      render: (view) => formatStamp(view.row.finishedAt),
    },
    ...(hasErrors
      ? [
          {
            key: "error",
            header: "Помилка",
            className: "spend-col-subject",
            render: (view: SyncRowView) => view.row.error || "—",
          },
        ]
      : []),
  ];

  return (
    <div className="spend-panel spend-sync">
      <h2 className="spend-detail-title">Стан збору</h2>
      <p className="spend-list-note">
        Збір іде за розкладом (05:37 UTC) — останні два місяці перечитуються щодня, бо джерело
        дописує рядки із запізненням. Кнопка «Зібрати зараз» перечитує вибраний місяць одразу. Час у
        таблиці — коли завершився наш крок, а не дата даних у джерелі.
      </p>

      <DataTable
        columns={columns}
        rows={views}
        rowKey={(view) => view.key}
        tableClassName="spend-table--sync"
        empty="Кроків збору ще немає: колектор не запускався."
      />

      <details className="spend-raw">
        <summary className="spend-raw-summary">
          Довідка джерела: {lastLoad ? formatStamp(lastLoad.fetchedAt) : "не читалась"}
          {sources.length > 0 ? ` · ${formatCount(sources.length)} джерел` : ""}
        </summary>
        <p className="spend-list-note">
          Це власний звіт Є-data: назва джерела й дата, станом на яку воно завантажило свої дані.
          Дата джерела не збігається з датою нашого збору — саме тому вони показані окремо.
        </p>
        {sources.length === 0 ? (
          <p className="spend-list-note">
            {lastLoad
              ? "У відповіді джерела немає впізнаваного списку: ні назв, ні дат."
              : "Довідки lastload у KV немає."}
          </p>
        ) : (
          <DataTable
            columns={SOURCE_COLUMNS}
            rows={sources}
            rowKey={(source) => `${source.name}:${source.date}`}
            tableClassName="spend-table--sources"
            empty="Джерел немає."
          />
        )}
      </details>
    </div>
  );
}
