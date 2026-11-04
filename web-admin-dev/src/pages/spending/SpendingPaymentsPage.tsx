/**
 * Платежі громади за місяць: наскрізний список сплат розпорядників.
 *
 * Рядок однієї висоти: довге призначення обрізається з підказкою, інакше
 * десяток платежів не порівняти оком. «Показати ще» дописує сторінку.
 * @module web-admin-dev/src/pages/spending/SpendingPaymentsPage
 */

import { useMemo } from "react";
import type { SpendingTransaction } from "@wwwuabot/shared/spending";
import { DataTable, type DataTableColumn } from "../../shared/components/DataTable";
import { SpendingPeriodControls, SpendingTopbar } from "./SpendingTopbar";
import { formatCompactMoney, formatCount, formatDate, formatMoney, periodsOf } from "./format";
import { useSpending } from "./useSpending";
import { useSpendingCommunityPayments } from "./useSpendingList";

const COLUMNS: readonly DataTableColumn<SpendingTransaction>[] = [
  {
    key: "date",
    header: "Дата",
    className: "spend-col-date",
    render: (payment) => formatDate(payment.transDate),
  },
  {
    key: "recipient",
    header: "Отримувач",
    className: "spend-col-party",
    render: (payment) => (
      <>
        <span className="wb-cell-title" title={payment.reciptName || undefined}>
          {payment.reciptName || "без назви"}
        </span>
        <span className="wb-cell-sub">{payment.reciptEdrpou || "—"}</span>
      </>
    ),
  },
  {
    key: "subject",
    header: "Призначення",
    className: "spend-col-subject",
    render: (payment) => (
      <span className="spend-subject" title={payment.paymentDetails || undefined}>
        {payment.paymentDetails || "—"}
      </span>
    ),
  },
  {
    key: "kekv",
    header: "КЕКВ",
    className: "spend-col-code",
    render: (payment) => payment.kekv || "—",
  },
  {
    key: "amount",
    header: "Сума",
    className: "spend-col-sum wb-col-num",
    render: (payment) => formatMoney(payment.amount, payment.currency || "UAH"),
  },
];

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
      <DataTable
        columns={COLUMNS}
        rows={list.items}
        rowKey={(payment) => payment.id}
        tableClassName="spend-table--payments"
        caption={`Показано ${formatCount(list.items.length)} сплат`}
        empty="За цей місяць платежів немає."
      />
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
