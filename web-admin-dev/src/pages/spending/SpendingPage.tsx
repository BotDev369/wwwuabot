/**
 * Є-data в адмінці: повна картина того, що приніс збір.
 *
 * Сторінка лише рендерить (AGENTS.md §3): стан — `useSpending`, підписи —
 * `format`. **Порожній період — стан, а не нулі:** поки прогону не було, екран
 * каже «не збирали» й показує кроки, бо нуль тут — «не оприлюднено» (§5).
 * @module web-admin-dev/src/pages/spending/SpendingPage
 */

import { useMemo, useState } from "react";
import { Icon } from "@wwwuabot/shared";
import { PageTopbar } from "../../layout/PageTopbar";
import { SpendingOrgDetail } from "./SpendingOrgDetail";
import { SpendingOrgTable } from "./SpendingOrgTable";
import { SpendingSyncPanel } from "./SpendingSyncPanel";
import { formatDate, formatPeriod, formatStamp, periodsOf } from "./format";
import { useSpending } from "./useSpending";

export function SpendingPage() {
  const { overview, loading, error, reload, selectPeriod } = useSpending();
  const [selected, setSelected] = useState<string | null>(null);

  const periods = useMemo(() => periodsOf(overview?.sync ?? []), [overview]);
  const selectedOrg = overview?.orgs.find((org) => org.edrpou === selected) ?? null;

  return (
    <>
      <PageTopbar>
        <h1 className="wb-topbar-title">Є-data</h1>
        <div className="wb-topbar-right">
          {periods.length > 1 && (
            <select
              className="spend-select"
              aria-label="Період"
              value={overview?.period ?? ""}
              onChange={(event) => void selectPeriod(event.target.value)}
            >
              {periods.map((period) => (
                <option key={period} value={period}>
                  {formatPeriod(period)}
                </option>
              ))}
            </select>
          )}
          <button className="wb-btn wb-btn-ghost wb-btn-sm" onClick={() => void reload()}>
            <Icon name="refresh" size={14} />
            Оновити
          </button>
        </div>
      </PageTopbar>

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
          <>
            <div className="empty-state">
              <span className="empty-state-text">
                Зібраних даних ще немає. Колектор пише перший місяць за розкладом, а ця сторінка
                показує лише те, що вже лежить у базі — чекати його тут не потрібно.
              </span>
            </div>
            <SpendingSyncPanel
              rows={overview?.sync ?? []}
              lastLoad={overview?.lastLoad ?? null}
              orgs={overview?.orgs ?? []}
            />
          </>
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
              <span className="spend-meta-item">
                джерело заявило дані: {formatStamp(overview.lastLoad?.fetchedAt ?? null)}
              </span>
            </div>

            <p className="spend-note">
              «Сплати» й «Надходження» — дві сторони тих самих платежів, тому їх не додають: коли
              платник і отримувач обидва з громади, сума порахувалась би двічі. «Не оприлюднено»
              означає, що джерело нічого не віддало, а не що видатків не було.
            </p>

            <SpendingOrgTable orgs={overview.orgs} selected={selected} onSelect={setSelected} />

            {selectedOrg ? (
              <SpendingOrgDetail org={selectedOrg} period={overview.period} />
            ) : (
              <p className="spend-list-note">
                Обери розпорядника в таблиці — нижче з'являться його договори й платежі.
              </p>
            )}

            <SpendingSyncPanel
              rows={overview.sync}
              lastLoad={overview.lastLoad}
              orgs={overview.orgs}
            />
          </>
        )}
      </section>
    </>
  );
}
