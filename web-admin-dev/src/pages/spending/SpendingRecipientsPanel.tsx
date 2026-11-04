/**
 * Розріз за отримувачами: ряд у часі й топ за сумою за одне вікно.
 *
 * Вікно — це вибір, а не адреса: «День» бере останню дату, за яку джерело вже
 * опублікувало платежі, бо саме слово «сьогодні» вранці дало б порожній екран.
 * Хвіст списку згорнуто в «інші» — інакше топ читався б як повний перелік.
 * @module web-admin-dev/src/pages/spending/SpendingRecipientsPanel
 */

import type { SpendingScope } from "@wwwuabot/shared/spending";
import { SpendingBarChart } from "./SpendingBarChart";
import { SpendingMeter } from "./SpendingMeter";
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

export function SpendingRecipientsPanel() {
  const { view, loading, error, selectScope } = useSpendingRecipients("month");
  const rows = view?.rows ?? [];
  const total = view?.totals.amount ?? 0;
  const listed = rows.reduce((sum, row) => sum + row.amount, 0);
  const rest = Math.max(total - listed, 0);
  const restCount = Math.max((view?.totals.recipients ?? 0) - rows.length, 0);
  const top = Math.max(rows[0]?.amount ?? 0, rest, 0);

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
      ) : !view || view.totals.count === 0 ? (
        <p className="spend-list-note">За це вікно платежів у базі немає.</p>
      ) : (
        <>
          <p className="spend-chart-caption">
            {formatDate(view.from)} — {formatDate(view.to)}:{" "}
            <strong>{formatCompactMoney(total)}</strong> за {formatCount(view.totals.count)}{" "}
            платежів на <strong>{formatCount(view.totals.recipients)}</strong> отримувачів
          </p>

          <SpendingBarChart points={view.buckets} label={formatBucket} />

          <div className="spend-table-wrap">
            <table className="wb-data-table spend-table spend-analytics-table">
              <thead>
                <tr>
                  <th>Отримувач</th>
                  <th>Частка</th>
                  <th className="spend-th-num">Платежів</th>
                  <th className="spend-th-num">Сума</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.edrpou} className="spend-row">
                    <td data-label="Отримувач">
                      <span className="spend-org-name">{row.name || "без назви"}</span>
                      <span className="spend-org-code">{row.edrpou}</span>
                    </td>
                    <td data-label="Частка">
                      <span className="spend-share-cell">
                        <SpendingMeter share={top > 0 ? row.amount / top : 0} />
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
                {rest > 0 && (
                  <tr className="spend-row">
                    <td data-label="Отримувач">
                      <span className="spend-org-name">Інші</span>
                      <span className="spend-org-code">{formatCount(restCount)} отримувачів</span>
                    </td>
                    <td data-label="Частка">
                      <span className="spend-share-cell">
                        <SpendingMeter share={top > 0 ? rest / top : 0} />
                        <span className="spend-share">{formatShare(rest, total)}</span>
                      </span>
                    </td>
                    <td className="spend-num" data-label="Платежів">
                      —
                    </td>
                    <td className="spend-num" data-label="Сума">
                      {formatMoney(rest)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="spend-list-note">
            «День» — остання дата, за яку джерело вже опублікувало платежі; сьогоднішні операції
            з'являються в Є-data із запізненням, тож порожній «сьогодні» нічого не доводить.
          </p>
        </>
      )}
    </div>
  );
}
