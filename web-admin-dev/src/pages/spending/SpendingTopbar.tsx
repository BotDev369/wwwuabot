/**
 * Шапка сторінок Є-data: назад до хабу, назва, місяць, дата збору й «Оновити».
 *
 * Дія над даними періоду стоїть при періоді, а не при таблиці. Адреси карток і
 * підсторінок — у `app/router.tsx`, тут лише вигляд.
 * @module web-admin-dev/src/pages/spending/SpendingTopbar
 */

import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@wwwuabot/shared";
import { PageTopbar } from "../../layout/PageTopbar";
import { formatPeriod, formatStamp } from "./format";

interface SpendingTopbarProps {
  readonly title: string;
  /** Підсторінки ведуть назад у хаб; сам хаб посилання не має. */
  readonly back?: boolean;
  readonly children?: ReactNode;
}

export function SpendingTopbar({ title, back = false, children }: SpendingTopbarProps) {
  // Назад — із вибраним місяцем: інакше хаб відкривався б на останньому й
  // вибір доводилось би робити вдруге.
  const [params] = useSearchParams();
  const search = params.toString();

  return (
    <PageTopbar>
      {/* Назад і назва — один лівий блок: інакше `space-between` шапки
          ставив заголовок по центру, а на хабі він стоїть ліворуч. */}
      <div className="wb-topbar-left">
        {back && (
          <Link
            to={search ? `/spending?${search}` : "/spending"}
            className="spend-back"
            aria-label="До Є-data"
          >
            <Icon name="arrow-left" size={16} />
          </Link>
        )}
        <h1 className="wb-topbar-title">{title}</h1>
      </div>
      <div className="wb-topbar-right">{children}</div>
    </PageTopbar>
  );
}

interface SpendingPeriodControlsProps {
  readonly periods: readonly string[];
  readonly period: string | null;
  readonly onSelect: (period: string) => void;
  readonly onRefresh: () => void;
  readonly refreshing: boolean;
  /** Коли цей місяць востаннє збирали; `null` — ще жодного разу. */
  readonly capturedAt?: string | null;
}

export function SpendingPeriodControls({
  periods,
  period,
  onSelect,
  onRefresh,
  refreshing,
  capturedAt = null,
}: SpendingPeriodControlsProps) {
  return (
    <>
      {periods.length > 1 && (
        <select
          className="spend-select"
          aria-label="Період"
          value={period ?? ""}
          onChange={(event) => onSelect(event.target.value)}
        >
          {periods.map((item) => (
            <option key={item} value={item}>
              {formatPeriod(item)}
            </option>
          ))}
        </select>
      )}
      <span className="spend-meta-item">зібрано: {capturedAt ? formatStamp(capturedAt) : "—"}</span>
      <button
        className="wb-btn wb-btn-ghost wb-btn-sm"
        disabled={refreshing || !period}
        onClick={onRefresh}
      >
        <Icon name="refresh" size={14} />
        {refreshing ? "Завантаження…" : "Оновити"}
      </button>
    </>
  );
}
