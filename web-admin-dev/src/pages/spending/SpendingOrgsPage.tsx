/**
 * Розпорядники громади за місяць і договори обраного розпорядника.
 *
 * Деталі відкриваються на цій же сторінці, а не окремим маршрутом: це той
 * самий період і той самий список, тож перехід на новий екран змушував би
 * вибирати місяць удруге.
 * @module web-admin-dev/src/pages/spending/SpendingOrgsPage
 */

import { useMemo, useState } from "react";
import { SpendingOrgDetail } from "./SpendingOrgDetail";
import { SpendingOrgTable } from "./SpendingOrgTable";
import { SpendingPeriodControls, SpendingTopbar } from "./SpendingTopbar";
import { formatDate, formatPeriod, formatStamp, periodsOf } from "./format";
import { useSpending } from "./useSpending";

export function SpendingOrgsPage() {
  const { overview, loading, error, refreshing, reload, selectPeriod, refresh } = useSpending();
  const [selected, setSelected] = useState<string | null>(null);

  const periods = useMemo(() => periodsOf(overview?.sync ?? []), [overview]);
  const selectedOrg = overview?.orgs.find((org) => org.edrpou === selected) ?? null;

  return (
    <>
      <SpendingTopbar title="Розпорядники" back>
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
        ) : !overview || overview.period === null ? (
          <div className="empty-state">
            <span className="empty-state-text">
              За цей період даних немає. Кроки збору — у розділі «Стан збору».
            </span>
          </div>
        ) : (
          <>
            <div className="spend-meta">
              <span className="spend-meta-item">
                Період: <strong>{formatPeriod(overview.period)}</strong>
              </span>
              <span className="spend-meta-item">
                {formatDate(overview.from)} — {formatDate(overview.to)}
              </span>
              <span className="spend-meta-item">зібрано: {formatStamp(overview.capturedAt)}</span>
            </div>

            <p className="spend-note">
              «Сплати» й «Надходження» — дві сторони тих самих платежів, тому їх не додають: коли
              платник і отримувач обидва з громади, сума порахувалась би двічі.
            </p>

            <SpendingOrgTable orgs={overview.orgs} selected={selected} onSelect={setSelected} />

            {selectedOrg ? (
              <SpendingOrgDetail org={selectedOrg} period={overview.period} />
            ) : (
              <p className="spend-list-note">
                Обери розпорядника в таблиці — нижче з'являться його договори й платежі.
              </p>
            )}
          </>
        )}
      </section>
    </>
  );
}
