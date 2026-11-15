/**
 * Шапка «Стола» — спільний `PageTopbar`: назва, кількість тем, пошук і
 * створення. Пошук живе в батьку, бо він же фільтрує запит до сервера.
 *
 * @module web-admin-dev/src/pages/desk/DeskTopbar
 */

import { PageTopbar } from "../../layout/PageTopbar";
import labels from "./desk-labels.json";

interface DeskTopbarProps {
  total: number;
  query: string;
  onQuery: (value: string) => void;
  onCreate: () => void;
  /** На телефоні відкрита тема ховає шапку: екран належить їй. */
  hidden: boolean;
}

export function DeskTopbar({ total, query, onQuery, onCreate, hidden }: DeskTopbarProps) {
  return (
    <PageTopbar className={`desk-topbar${hidden ? " desk-topbar--hidden" : ""}`}>
      <div className="wb-topbar-left">
        <h1 className="wb-topbar-title">{labels.title}</h1>
        <span className="wb-count">{total}</span>
      </div>
      <div className="wb-topbar-right">
        <input
          className="wb-input wb-search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder={labels.search}
          aria-label={labels.search}
        />
        <button type="button" className="wb-btn wb-btn-primary" onClick={onCreate}>
          {labels.newThread}
        </button>
      </div>
    </PageTopbar>
  );
}
