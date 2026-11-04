/**
 * Є-data: хаб можливостей, а не одна таблиця на все.
 *
 * Кожна картка веде на власну сторінку. Картка без сторінки позначена
 * «скоро»: порожній клік гірший за видиму обіцянку. «Сплати» й
 * «надходження» тут не додаються.
 * @module web-admin-dev/src/pages/spending/SpendingHubPage
 */

import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { SpendingTopbar } from "./SpendingTopbar";
import { formatCompactMoney, formatCount, formatPeriod, periodsOf } from "./format";
import { useSpending } from "./useSpending";
import { SPENDING_CAPABILITIES } from "./capabilities";

export function SpendingHubPage() {
  const { overview, loading, error, reload, selectPeriod } = useSpending();
  const periods = useMemo(() => periodsOf(overview?.sync ?? []), [overview]);

  const totals = useMemo(() => {
    const orgs = overview?.orgs ?? [];
    return {
      payments: orgs.reduce(
        (sum, org) => ({
          count: sum.count + org.payments.count,
          amount: sum.amount + org.payments.amount,
        }),
        { count: 0, amount: 0 },
      ),
      receipts: orgs.reduce(
        (sum, org) => ({
          count: sum.count + org.receipts.count,
          amount: sum.amount + org.receipts.amount,
        }),
        { count: 0, amount: 0 },
      ),
      documents: orgs.reduce((sum, org) => sum + org.documents.count, 0),
    };
  }, [overview]);

  return (
    <>
      <SpendingTopbar title="Є-data">
        {overview?.period && (
          <select
            className="spend-select"
            aria-label="Період"
            value={overview.period}
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

        <header className="spend-hero">
          <span className="spend-hero-kicker">Етап 1 · тестова громада Буча</span>
          <h2 className="spend-hero-title">Видатки громади з Є-data</h2>
          <p className="spend-hero-text">
            Що громада витратила, кому й на що — з даних, які органи місцевого самоврядування
            оприлюднюють на data.gov.ua. Збір іде щодня; наступні кроки — закупівлі, бюджет і вся
            Україна.
          </p>
        </header>

        {loading ? (
          <div className="empty-state">
            <span className="empty-state-text">Завантаження...</span>
          </div>
        ) : !overview || overview.period === null ? (
          <div className="spend-panel">
            <h3 className="spend-detail-title">Зібраних даних ще немає</h3>
            <p className="spend-list-note">
              Колектор пише перший місяць за розкладом, а ця сторінка показує лише те, що вже лежить
              у базі. Кроки збору й помилки джерела — у розділі «Стан збору».
            </p>
            <Link className="wb-btn wb-btn-primary wb-btn-sm spend-inline-link" to="/spending/sync">
              Стан збору
            </Link>
          </div>
        ) : (
          <div className="spend-kpis">
            <div className="spend-kpi">
              <span className="spend-kpi-label">Розпорядники</span>
              <span className="spend-kpi-value">{formatCount(overview.orgs.length)}</span>
              <span className="spend-kpi-hint">у зборі за місяць</span>
            </div>
            <div className="spend-kpi">
              <span className="spend-kpi-label">Сплачено</span>
              <span className="spend-kpi-value">{formatCompactMoney(totals.payments.amount)}</span>
              <span className="spend-kpi-hint">{formatCount(totals.payments.count)} платежів</span>
            </div>
            <div className="spend-kpi">
              <span className="spend-kpi-label">Надійшло</span>
              <span className="spend-kpi-value">{formatCompactMoney(totals.receipts.amount)}</span>
              <span className="spend-kpi-hint">{formatCount(totals.receipts.count)} платежів</span>
            </div>
            <div className="spend-kpi">
              <span className="spend-kpi-label">Договори</span>
              <span className="spend-kpi-value">{formatCount(totals.documents)}</span>
              <span className="spend-kpi-hint">за місяць</span>
            </div>
          </div>
        )}

        <h3 className="spend-section-title">Можливості</h3>
        <div className="spend-cards">
          {SPENDING_CAPABILITIES.map((card) =>
            card.soon || !card.to ? (
              <div key={card.key} className="spend-card spend-card-soon" aria-disabled="true">
                <span className="spend-card-icon">
                  <Icon name={card.icon} size={18} />
                </span>
                <span className="spend-card-title">{card.title}</span>
                <span className="spend-card-text">{card.summary}</span>
                <span className="spend-card-foot">
                  <span className="wb-badge wb-badge-neutral">скоро</span>
                </span>
              </div>
            ) : (
              <Link
                key={card.key}
                className="spend-card"
                to={overview?.period ? `${card.to}?period=${overview.period}` : card.to}
              >
                <span className="spend-card-icon">
                  <Icon name={card.icon} size={18} />
                </span>
                <span className="spend-card-title">{card.title}</span>
                <span className="spend-card-text">{card.summary}</span>
                <span className="spend-card-foot spend-card-open">
                  Відкрити
                  <Icon name="chevron-right" size={14} />
                </span>
              </Link>
            ),
          )}
        </div>

        <p className="spend-list-note">
          «Сплати» й «Надходження» — дві сторони тих самих платежів, тому вони не додаються в одну
          суму. «Не оприлюднено» означає, що джерело нічого не віддало, а не що видатків не було.
        </p>
      </section>
    </>
  );
}
