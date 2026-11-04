/**
 * Розріз за кодами платежу: КЕКВ, КПК і бюджетна програма одного місяця.
 *
 * Три класифікації — три незалежні погляди на ті самі рядки, тож суми між
 * вкладками збігаються, а не додаються. Порожній код лишається рядком «без
 * коду»: це стан джерела, а не наша втрата.
 * @module web-admin-dev/src/pages/spending/SpendingCodesPanel
 */

import { useState } from "react";
import type { SpendingCodeKind, SpendingCodeRow } from "@wwwuabot/shared/spending";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { SpendingRankChart } from "./SpendingRankChart";
import { formatCompactMoney, formatCount, formatMoney, formatShare } from "./format";
import { useSpendingCodes } from "./useSpendingAnalytics";

const KINDS: readonly { kind: SpendingCodeKind; label: string; hint: string }[] = [
  { kind: "kekv", label: "КЕКВ", hint: "економічна класифікація видатків" },
  { kind: "kpk", label: "КПК", hint: "програмна класифікація" },
  { kind: "budget", label: "Програма", hint: "код бюджетної програми" },
];

/** Скільки кодів показує рейтинг: решта — хвіст, який читають у таблиці. */
const RANK_ROWS = 8;

function codeLabel(code: string): string {
  return code || "без коду";
}

interface SpendingCodesPanelProps {
  readonly period: string | null;
}

export function SpendingCodesPanel({ period }: SpendingCodesPanelProps) {
  const { view, loading, error } = useSpendingCodes(period);
  const [kind, setKind] = useState<SpendingCodeKind>("kekv");
  const active = KINDS.find((item) => item.kind === kind) ?? KINDS[0];
  const rows: readonly SpendingCodeRow[] = view ? view[kind] : [];
  const total = view?.totals.amount ?? 0;

  const columns: readonly DataTableColumn<SpendingCodeRow>[] = [
    {
      key: "code",
      header: "Код",
      className: "spend-col-code",
      render: (row) => <span className="spend-code">{codeLabel(row.code)}</span>,
    },
    {
      key: "share",
      header: "Частка суми",
      className: "spend-col-share",
      render: (row) => <span className="spend-share">{formatShare(row.amount, total)}</span>,
    },
    {
      key: "count",
      header: "Платежів",
      className: "spend-col-count wb-col-num",
      render: (row) => formatCount(row.count),
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
      <div className="spend-tabs" role="tablist" aria-label="Класифікація платежу">
        {KINDS.map((item) => (
          <button
            key={item.kind}
            role="tab"
            aria-selected={kind === item.kind}
            className={`spend-tab${kind === item.kind ? " spend-tab-active" : ""}`}
            onClick={() => setKind(item.kind)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="spend-list-note">{error}</p>
      ) : loading ? (
        <p className="spend-list-note">Завантаження…</p>
      ) : !view || view.totals.count === 0 ? (
        <p className="spend-list-note">За цей місяць платежів у базі немає.</p>
      ) : (
        <>
          <p className="spend-chart-caption">
            {active.hint}: <strong>{formatCount(rows.length)}</strong> кодів на{" "}
            <strong>{formatCompactMoney(total)}</strong> за {formatCount(view.totals.count)}{" "}
            платежів
          </p>

          <SpendingRankChart
            rows={rows.slice(0, RANK_ROWS).map((row) => ({
              key: row.code || "none",
              label: codeLabel(row.code),
              amount: row.amount,
            }))}
            total={total}
          />

          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.code || "none"}
            tableClassName="spend-table--codes"
            empty="За цей місяць кодів немає."
          />
        </>
      )}
    </div>
  );
}
