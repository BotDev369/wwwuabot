/**
 * Розріз за отримувачами: ряд у часі й топ за сумою за одне вікно.
 *
 * Вікно — це вибір, а не адреса: «День» бере останню дату, за яку джерело вже
 * опублікувало платежі, бо саме слово «сьогодні» вранці дало б порожній екран.
 * Хвіст списку згорнуто в «інші» — інакше топ читався б як повний перелік.
 * @module web-admin-dev/src/pages/spending/SpendingRecipientsPanel
 */

import type { SpendingRecipientRow, SpendingScope } from "@wwwuabot/shared/spending";
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
import { SpendingBarChart } from "./SpendingBarChart";
import {
  formatBucket,
  formatCompactMoney,
  formatCount,
  formatDate,
  formatMoney,
  formatShare,
} from "./format";
import { useSpendingRecipients } from "./useSpendingAnalytics";

const SCOPES: readonly { scope: SpendingScope; label: string }[] = [
  { scope: "all", label: "Все" },
  { scope: "year", label: "Рік" },
  { scope: "month", label: "Місяць" },
  { scope: "day", label: "День" },
];

/** Рядок «Інші» — такий самий рядок таблиці, лише зі згорнутим хвостом. */
interface RecipientRow {
  readonly edrpou: string;
  readonly name: string;
  readonly count: number | null;
  readonly amount: number;
  readonly note: string;
}

function toRow(row: SpendingRecipientRow): RecipientRow {
  return {
    edrpou: row.edrpou,
    name: row.name,
    count: row.count,
    amount: row.amount,
    note: row.edrpou,
  };
}

export function SpendingRecipientsPanel() {
  const { view, loading, error, selectScope } = useSpendingRecipients("month");
  const rows = view?.rows ?? [];
  const total = view?.totals?.amount ?? 0;
  const listed = rows.reduce((sum, row) => sum + row.amount, 0);
  const rest = Math.max(total - listed, 0);
  const restCount = Math.max((view?.totals?.recipients ?? 0) - rows.length, 0);

  const tableRows: RecipientRow[] = [
    ...rows.map(toRow),
    ...(rest > 0
      ? [
          {
            edrpou: "rest",
            name: "Інші",
            count: null,
            amount: rest,
            note: `${formatCount(restCount)} отримувачів`,
          },
        ]
      : []),
  ];

  const columns: readonly DataTableColumn<RecipientRow>[] = [
    {
      key: "name",
      header: "Отримувач",
      className: "spend-col-org",
      render: (row) => (
        <>
          <span className="wb-cell-title" title={row.name || undefined}>
            {row.name || "без назви"}
          </span>
          <span className="wb-cell-sub">{row.note}</span>
        </>
      ),
    },
    {
      key: "share",
      header: "Частка",
      className: "spend-col-share",
      render: (row) => <span className="spend-share">{formatShare(row.amount, total)}</span>,
    },
    {
      key: "count",
      header: "Платежів",
      className: "spend-col-count wb-col-num",
      render: (row) => (row.count === null ? "—" : formatCount(row.count)),
    },
    {
      key: "amount",
      header: "Сума",
      className: "spend-col-sum wb-col-num",
      render: (row) => formatMoney(row.amount),
    },
  ];

  return (
    <div className="spend-analytics-panel">
      <div className="spend-tabs" role="tablist" aria-label="Вікно розрізу">
        {SCOPES.map((item) => (
          <button
            key={item.scope}
            role="tab"
            aria-selected={view?.scope === item.scope}
            className={`spend-tab${view?.scope === item.scope ? " spend-tab-active" : ""}`}
            onClick={() => selectScope(item.scope)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="spend-list-note">{error}</p>
      ) : loading ? (
        <p className="spend-list-note">Завантаження…</p>
      ) : !view || !view.totals || view.totals.count === 0 ? (
        <p className="spend-list-note">За це вікно платежів у базі немає.</p>
      ) : (
        <>
          <p className="spend-chart-caption">
            {formatDate(view.from)} — {formatDate(view.to)}:{" "}
            <strong>{formatCompactMoney(total)}</strong> за {formatCount(view.totals.count)}{" "}
            платежів на <strong>{formatCount(view.totals.recipients)}</strong> отримувачів
          </p>

          <SpendingBarChart points={view.buckets} label={formatBucket} />

          <DataTable
            columns={columns}
            rows={tableRows}
            rowKey={(row) => row.edrpou}
            tableClassName="spend-table--recipients"
            empty="За це вікно отримувачів немає."
          />

          <p className="spend-list-note">
            «День» — остання дата, за яку джерело вже опублікувало платежі; сьогоднішні операції
            з'являються в Є-data із запізненням, тож порожній «сьогодні» нічого не доводить.
          </p>
        </>
      )}
    </div>
  );
}
