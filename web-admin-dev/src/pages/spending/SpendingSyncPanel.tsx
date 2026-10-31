/**
 * Стан збору: кроки, помилки й довідка джерела.
 *
 * Панель стоїть поруч із даними, а не в логах, бо перше питання до порожнього
 * екрана — «коли збирали і чим це скінчилось». Сиру відповідь `lastload`
 * показуємо як є: її форма не описана (`docs/SPENDING.md` §2).
 * @module web-admin-dev/src/pages/spending/SpendingSyncPanel
 */

import type { SpendingLastLoad, SpendingSyncRow } from "@wwwuabot/shared/spending";
import { formatCount, formatStamp, statusClass, statusLabel } from "./format";

interface SpendingSyncPanelProps {
  rows: readonly SpendingSyncRow[];
  lastLoad: SpendingLastLoad | null;
}

export function SpendingSyncPanel({ rows, lastLoad }: SpendingSyncPanelProps) {
  return (
    <div className="spend-panel spend-sync">
      <h2 className="spend-detail-title">Стан збору</h2>
      <p className="spend-list-note">
        Збір іде за розкладом (05:37 UTC), а не з цієї сторінки. Час у таблиці — коли завершився наш
        крок, а не дата даних у джерелі.
      </p>

      {rows.length === 0 ? (
        <p className="spend-list-note">Кроків збору ще немає: колектор не запускався.</p>
      ) : (
        <div className="spend-table-wrap">
          <table className="wb-data-table spend-table">
            <thead>
              <tr>
                <th>Крок</th>
                <th>Період</th>
                <th>Стан</th>
                <th className="spend-th-num">Рядків</th>
                <th>Завершено</th>
                <th>Помилка</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="spend-row">
                  <td>
                    <span className="spend-org-name">{row.kind}</span>
                    <span className="spend-org-code">{row.key}</span>
                  </td>
                  <td className="spend-code">{row.period || "—"}</td>
                  <td>
                    <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                  </td>
                  <td className="spend-num">{formatCount(row.rows)}</td>
                  <td className="spend-date">{formatStamp(row.finishedAt)}</td>
                  <td className="spend-subject">{row.error || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <details className="spend-raw">
        <summary className="spend-raw-summary">
          Довідка джерела: {lastLoad ? formatStamp(lastLoad.fetchedAt) : "не читалась"}
        </summary>
        <pre className="spend-raw-body">
          {lastLoad ? JSON.stringify(lastLoad.raw, null, 2) : "Довідки lastload у KV немає."}
        </pre>
      </details>
    </div>
  );
}
