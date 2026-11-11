/**
 * Сторінка стану збору: кроки, помилки й довідка джерела.
 *
 * Окрема сторінка, а не панель унизу даних: питання «чому тут порожньо» задають
 * саме тоді, коли даних немає, і відповідь не має бути під таблицею, якої теж
 * немає.
 * @module web-admin-dev/src/pages/spending/SpendingSyncPage
 */

import { useMemo } from "react";
import { SpendingPeriodControls, SpendingTopbar } from "./SpendingTopbar";
import { SpendingSyncPanel } from "./SpendingSyncPanel";
import { periodsOf } from "./format";
import { useSpending } from "./useSpending";

export function SpendingSyncPage() {
  const { overview, loading, error, refreshing, reload, selectPeriod, refresh } = useSpending();
  const periods = useMemo(() => periodsOf(overview?.sync ?? []), [overview]);

  return (
    <>
      <SpendingTopbar title="Стан збору" back>
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
        ) : (
          <SpendingSyncPanel
            rows={overview?.sync ?? []}
            lastLoad={overview?.lastLoad ?? null}
            orgs={overview?.orgs ?? []}
          />
        )}
      </section>
    </>
  );
}
