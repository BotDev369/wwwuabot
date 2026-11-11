/**
 * Сторінка кодів платежу: один місяць у трьох класифікаціях.
 *
 * Період задає шапка, тож панель не має власного вибору місяця — інакше на
 * екрані було б два незалежні «місяці» й два різні числа.
 * @module web-admin-dev/src/pages/spending/SpendingCodesPage
 */

import { useMemo } from "react";
import { SpendingCodesPanel } from "./SpendingCodesPanel";
import { SpendingPeriodControls, SpendingTopbar } from "./SpendingTopbar";
import { periodsOf } from "./format";
import { useSpending } from "./useSpending";

export function SpendingCodesPage() {
  const { overview, loading, error, refreshing, reload, selectPeriod, refresh } = useSpending();
  const periods = useMemo(() => periodsOf(overview?.sync ?? []), [overview]);

  return (
    <>
      <SpendingTopbar title="Коди платежів" back>
        <SpendingPeriodControls
          periods={periods}
          period={overview?.period ?? null}
          onSelect={(period) => void selectPeriod(period)}
          onRefresh={() => overview?.period && void refresh(overview.period)}
          refreshing={refreshing}
          capturedAt={overview?.capturedAt ?? null}
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
          <div className="spend-panel">
            <SpendingCodesPanel period={overview.period} />
          </div>
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
