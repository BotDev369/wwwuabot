/**
 * Платежі громади за місяць: наскрізний список, а не сума по розпорядниках.
 *
 * Список читають як історію: новіші дати зверху, «Показати ще» дописує
 * наступну сторінку за курсором. Призначення платежу — головний текст рядка,
 * бо саме за ним шукають очима; суми й дати стоять праворуч і ліворуч.
 * @module web-admin-dev/src/pages/spending/SpendingPaymentsPage
 */

import { useMemo } from "react";
import { SpendingPeriodControls, SpendingTopbar } from "./SpendingTopbar";
import { formatCompactMoney, formatCount, formatDate, formatMoney, periodsOf } from "./format";
import { useSpending } from "./useSpending";
import { useSpendingCommunityPayments } from "./useSpendingList";

function CommunityPayments({ period }: { readonly period: string }) {
  const list = useSpendingCommunityPayments(period);

  if (list.loading && list.items.length === 0) {
    return <p className="spend-list-note">Завантаження…</p>;
  }
  if (list.error) return <p className="spend-list-note">{list.error}</p>;
  if (list.items.length === 0) {
    return (
      <p className="spend-list-note">
        За цей місяць платежів у базі немає — джерело їх ще не оприлюднило.
      </p>
    );
  }

  return (
    <div className="spend-panel">
      <p className="spend-chart-caption">
        Показано <strong>{formatCount(list.items.length)}</strong> сплат
      </p>
      <div className="spend-table-wrap">
        <table className="wb-data-table spend-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Отримувач</th>
              <th>Призначення</th>
              <th>КЕКВ</th>
              <th className="spend-th-num">Сума</th>
            </tr>
          </thead>
          <tbody>
            {list.items.map((payment) => (
              <tr key={payment.id} className="spend-row">
                <td className="spend-date" data-label="Дата">
                  {formatDate(payment.transDate)}
                </td>
                <td data-label="Отримувач">
                  <span className="spend-org-name">{payment.reciptName || "без назви"}</span>
                  <span className="spend-org-code">{payment.reciptEdrpou || "—"}</span>
                </td>
                <td className="spend-subject" data-label="Призначення">
                  {payment.paymentDetails || "—"}
                </td>
                <td className="spend-code" data-label="КЕКВ">
                  {payment.kekv || "—"}
                </td>
                <td className="spend-num" data-label="Сума">
                  {formatMoney(payment.amount, payment.currency || "UAH")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.nextCursor && (
        <button
          className="wb-btn wb-btn-ghost wb-btn-sm spend-more"
          disabled={list.loading}
          onClick={() => void list.more()}
        >
          {list.loading ? "Завантаження…" : "Показати ще"}
        </button>
      )}
    </div>
  );
}

export function SpendingPaymentsPage() {
  const { overview, loading, error, refreshing, reload, selectPeriod, refresh } = useSpending();
  const periods = useMemo(() => periodsOf(overview?.sync ?? []), [overview]);

  return (
    <>
      <SpendingTopbar title="Платежі" back>
        <SpendingPeriodControls
          periods={periods}
          period={overview?.period ?? null}
          onSelect={(period) => void selectPeriod(period)}
          onRefresh={() => overview?.period && void refresh(overview.period)}
          refreshing={refreshing}
        />
      </SpendingTopbar>

      <section className="spend">
        {error && (
          <div className="wb-badge wb-badge-red">
            {error}
            <button className="wb-btn wb-btn-ghost wb-btn-sm" onClick={() => void reload()}>
              Спробувати ще
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <span className="empty-state-text">Завантаження...</span>
          </div>
        ) : overview?.period ? (
          <>
            <div className="spend-meta">
              <span className="spend-meta-item">
                Сплачено:{" "}
                <strong>
                  {formatCompactMoney(
                    overview.orgs.reduce((sum, org) => sum + org.payments.amount, 0),
                  )}
                </strong>
              </span>
              <span className="spend-meta-item">
                {formatCount(overview.orgs.reduce((sum, org) => sum + org.payments.count, 0))}{" "}
                платежів
              </span>
            </div>
            <p className="spend-note">
              Тут лише сплати розпорядників громади. Надходження — окрема сторона тих самих платежів
              і в цей список не входять, щоб не рахувати громаду двічі.
            </p>
            <CommunityPayments period={overview.period} />
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-state-text">
              За цей період даних немає. Кроки збору — у розділі «Стан збору».
            </span>
          </div>
        )}
      </section>
    </>
  );
}
