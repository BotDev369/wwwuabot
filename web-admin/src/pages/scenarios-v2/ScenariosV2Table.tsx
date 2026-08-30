import { useMemo, useState, useEffect, useCallback } from "react";
import { useScenariosStore, type ScenariosSortField } from "../../features/scenarios/store";
import { ScenarioCardModal } from "../scenarios/ScenarioCardModal";
import { ScenarioEditModal } from "../scenarios/ScenarioEditModal";
import { deleteScenario } from "../../shared/api/scenarios.api";

function relativeTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн тому`;
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function ScenariosV2Table() {
  const { items, sortField, sortDir, setSort } = useScenariosStore();

  const [query, setQuery] = useState("");
  const [menuCodeword, setMenuCodeword] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [cardCodeword, setCardCodeword] = useState<string | null>(null);
  const [editCodeword, setEditCodeword] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const closeAll = useCallback(() => {
    setMenuCodeword(null);
    setCardCodeword(null);
    setEditCodeword(null);
    setConfirmDelete(null);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    if (menuCodeword || cardCodeword || editCodeword || confirmDelete) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [menuCodeword, cardCodeword, editCodeword, confirmDelete, closeAll]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter((s) => s.codeword.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      let va: string = "";
      let vb: string = "";
      if (sortField === "codeword") {
        va = a.codeword;
        vb = b.codeword;
      } else if (sortField === "rich_message") {
        va = a.rich_message ?? "";
        vb = b.rich_message ?? "";
      } else if (sortField === "updated_at") {
        va = a.updated_at ?? "";
        vb = b.updated_at ?? "";
      }
      va = va.toLowerCase();
      vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, query, sortField, sortDir]);

  function thSort(field: ScenariosSortField, label: string, left?: number) {
    const arrow = sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    const stickyClass = left !== undefined ? " usr-th-sticky" : "";
    const style = left !== undefined ? { left } : undefined;
    return (
      <th
        className={`usr-th-sortable${stickyClass}`}
        style={style}
        onClick={() => setSort(field)}
        title={`Сортувати за ${label}`}
      >
        {label}
        {arrow && <span className="usr-th-arrow">{arrow}</span>}
      </th>
    );
  }

  const menuScenario = menuCodeword ? items.find((s) => s.codeword === menuCodeword) : null;

  // Navigate to page builder
  const navigateToPageBuilder = (cw: string) => {
    window.location.href = `/page-builder/${cw}`;
  };

  return (
    <>
      <div className="usr-table-wrap">
        <div className="usr-search-row">
          <input
            type="text"
            className="scn-search"
            placeholder="Пошук за codeword…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <table className="usr-table">
          <thead>
            <tr>
              <th className="usr-th-menu usr-th-sticky"></th>
              {thSort("codeword", "Codeword", 0)}
              {thSort("rich_message", "Тип")}
              {thSort("updated_at", "Оновлено")}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="usr-empty">
                  {items.length === 0
                    ? "У базі ще немає сценаріїв."
                    : `Нічого не знайдено за «${query}».`}
                </td>
              </tr>
            ) : (
              filtered.map((s) => {
                const isRich = s.rich_message === "true" || s.rich_message === "1";
                const isSelected = selectedRow === s.codeword;
                return (
                  <tr
                    key={s.codeword}
                    className={`usr-row${isSelected ? " usr-row--selected" : ""}`}
                    onClick={() => setSelectedRow(isSelected ? null : s.codeword)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="usr-td-menu usr-td-sticky" style={{ left: 0 }}>
                      <button
                        className="usr-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuCodeword(s.codeword);
                        }}
                        title="Дії"
                      >
                        ☰
                      </button>
                    </td>
                    <td className="usr-td-name usr-td-sticky" style={{ left: 0 }}>
                      {s.codeword}
                    </td>
                    <td>
                      <span className={`scn-badge${isRich ? " scn-badge--rich" : ""}`}>
                        {isRich ? "Rich" : "Photo"}
                      </span>
                      {s.page_data && (
                        <span className="scn-badge" style={{ marginLeft: 4, background: "var(--color-info, #3b82f6)", color: "white" }}>
                          Page
                        </span>
                      )}
                    </td>
                    <td className="usr-td-date" title={s.updated_at}>
                      {relativeTime(s.updated_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action modal menu */}
      {menuScenario && !cardCodeword && !editCodeword && !confirmDelete && (
        <div className="usr-modal-overlay" onClick={closeAll}>
          <div className="usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="usr-modal-header">
              <span className="usr-modal-title">
                📋 {menuScenario.codeword}
              </span>
              <button className="usr-modal-close" onClick={closeAll}>✕</button>
            </div>
            <div className="usr-modal-body usr-modal-menu">
              <button
                className="usr-modal-menu-item"
                onClick={() => { setMenuCodeword(null); setCardCodeword(menuScenario.codeword); }}
              >
                👁️ Переглянути
              </button>
              <button
                className="usr-modal-menu-item"
                onClick={() => { setMenuCodeword(null); setEditCodeword(menuScenario.codeword); }}
              >
                ✏️ Змінити
              </button>
              <button
                className="usr-modal-menu-item"
                onClick={() => { setMenuCodeword(null); navigateToPageBuilder(menuScenario.codeword); }}
              >
                🏗️ Page Builder
              </button>
              <div className="usr-modal-divider" />
              <button
                className="usr-modal-menu-item usr-modal-menu-item--danger"
                onClick={() => { setMenuCodeword(null); setConfirmDelete(menuScenario.codeword); }}
              >
                🗑️ Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="usr-modal-overlay" onClick={closeAll}>
          <div className="usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="usr-modal-header">
              <span className="usr-modal-title">⚠️ Видалити сценарій?</span>
              <button className="usr-modal-close" onClick={closeAll}>✕</button>
            </div>
            <div className="usr-modal-body">
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                Видалити «{confirmDelete}»? Цю дію неможливо скасувати.
              </p>
            </div>
            <div className="usr-modal-body usr-modal-menu" style={{ paddingTop: 8 }}>
              <button
                className="usr-modal-menu-item usr-modal-menu-item--danger"
                onClick={async () => {
                  try {
                    await deleteScenario(confirmDelete);
                    closeAll();
                    await useScenariosStore.getState().load(true);
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                🗑️ Так, видалити
              </button>
              <button className="usr-modal-menu-item" onClick={closeAll}>
                ✕ Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario card (view) */}
      {cardCodeword !== null && (
        <ScenarioCardModal
          codeword={cardCodeword}
          onClose={closeAll}
          onEdit={(cw) => { setCardCodeword(null); setEditCodeword(cw ?? null); }}
        />
      )}

      {/* Scenario edit */}
      {editCodeword !== null && (
        <ScenarioEditModal
          codeword={editCodeword}
          onClose={closeAll}
          onSaved={() => void useScenariosStore.getState().load(true)}
        />
      )}

    </>
  );
}
