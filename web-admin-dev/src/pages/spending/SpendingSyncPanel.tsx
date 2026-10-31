/**
 * Стан збору: кроки, помилки й довідка джерела.
 *
 * Панель стоїть поруч із даними, бо перше питання до порожнього екрана —
 * «коли збирали і чим це скінчилось». Ключ кроку лишається в базі: людина
 * читає предмет і розпорядника (`format`), а не `org:04360586:2026-09`.
 * @module web-admin-dev/src/pages/spending/SpendingSyncPanel
 */

import type { SpendingLastLoad, SpendingOrg, SpendingSyncRow } from "@wwwuabot/shared/spending";
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

export function SpendingSyncPanel({ rows, lastLoad, orgs }: SpendingSyncPanelProps) {
  const sources = lastLoad ? lastLoadSources(lastLoad.raw) : [];

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
              {rows.map((row) => {
                const subject = syncStepSubject(row, orgs);

                return (
                  <tr key={row.key} className="spend-row">
                    <td data-label="">
                      <span className="spend-org-name">{syncKindLabel(row.kind)}</span>
                      {subject && <span className="spend-org-code">{subject}</span>}
                    </td>
                    <td className="spend-code" data-label="Період">
                      {row.period ? formatPeriod(row.period) : "—"}
                    </td>
                    <td data-label="Стан">
                      <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                    </td>
                    <td className="spend-num" data-label="Рядків">
                      {formatCount(row.rows)}
                    </td>
                    <td className="spend-date" data-label="Завершено">
                      {formatStamp(row.finishedAt)}
                    </td>
                    <td className="spend-subject" data-label="Помилка">
                      {row.error || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
          <div className="spend-table-wrap spend-lastload">
            <table className="wb-data-table spend-table">
              <thead>
                <tr>
                  <th>Джерело</th>
                  <th>Дата даних джерела</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={`${source.name}:${source.date}`} className="spend-row">
                    <td data-label="Джерело">{source.name}</td>
                    <td className="spend-date" data-label="Дата">
                      {formatDate(source.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}
