/**
 * Розріз за кодами платежу: КЕКВ, КПК і бюджетна програма одного місяця.
 *
 * Три класифікації — три незалежні погляди на ті самі рядки, тож суми між
 * вкладками збігаються, а не додаються. Порожній код лишається рядком «без
 * коду»: це стан джерела, а не наша втрата.
 * @module web-admin-dev/src/pages/spending/SpendingCodesPanel
 */

import { useState } from "react";
import type { SpendingCodeKind } from "@wwwuabot/shared/spending";
import { SpendingMeter } from "./SpendingMeter";
import { formatCompactMoney, formatCount, formatMoney, formatShare } from "./format";
import { useSpendingCodes } from "./useSpendingAnalytics";

const KINDS: readonly { kind: SpendingCodeKind; label: string; hint: string }[] = [
  { kind: "kekv", label: "КЕКВ", hint: "економічна класифікація видатків" },
  { kind: "kpk", label: "КПК", hint: "програмна класифікація" },
  { kind: "budget", label: "Програма", hint: "код бюджетної програми" },
];

interface SpendingCodesPanelProps {
  readonly period: string | null;
}

export function SpendingCodesPanel({ period }: SpendingCodesPanelProps) {
  const { view, loading, error } = useSpendingCodes(period);
  const [kind, setKind] = useState<SpendingCodeKind>("kekv");
  const active = KINDS.find((item) => item.kind === kind) ?? KINDS[0];
  const rows = view ? view[kind] : [];
  const max = rows.reduce((top, row) => Math.max(top, row.amount), 0);
  const total = view?.totals.amount ?? 0;

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
          <div className="spend-table-wrap">
            <table className="wb-data-table spend-table spend-analytics-table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Частка</th>
                  <th className="spend-th-num">Платежів</th>
                  <th className="spend-th-num">Сума</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.code || "none"} className="spend-row">
                    <td data-label="Код">
                      <span className="spend-code">{row.code || "без коду"}</span>
                    </td>
                    <td data-label="Частка">
                      <span className="spend-share-cell">
                        <SpendingMeter share={max > 0 ? row.amount / max : 0} />
                        <span className="spend-share">{formatShare(row.amount, total)}</span>
                      </span>
                    </td>
                    <td className="spend-num" data-label="Платежів">
                      {formatCount(row.count)}
                    </td>
                    <td className="spend-num" data-label="Сума">
                      {formatMoney(row.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
