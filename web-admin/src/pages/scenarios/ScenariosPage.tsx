import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScenariosStore } from "../../features/scenarios/store";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenarioCardModal } from "./ScenarioCardModal";
import { ScenarioEditModal } from "./ScenarioEditModal";
import { deleteScenario } from "../../shared/api/scenarios.api";

// updated_at з D1 має формат "2026-07-14 13:53:51" (UTC).
function relativeTime(value: string): string {
  const date = new Date(value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return value;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн тому`;
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short" }).format(date);
}

export function ScenariosPage() {
  const { items, status, errorMsg, load } = useScenariosStore();
  const [query, setQuery] = useState("");
  const [selectedCodeword, setSelectedCodeword] = useState<string | null>(null);
  const [menuCodeword, setMenuCodeword] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"card" | "edit" | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void load();
  }, [load]);

  // Пошук — клієнтський і миттєвий (подарунок від Б+В: список уже в store).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => row.codeword.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Сценарії</h1>
          {items.length > 0 && (
            <span className="scn-count">
              {filtered.length} / {items.length}
            </span>
          )}
        </div>
        <div className="topbar-right">
          <button className="btn btn--primary" onClick={() => navigate("/scenarios/new")}>
            ＋ Новий
          </button>
          <input
            type="text"
            className="scn-search"
            placeholder="Пошук за codeword…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </PageTopbar>

      <div className="scn-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження сценаріїв…</p>
          </div>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Не вдалося завантажити: {errorMsg}</p>
            <button className="btn btn--secondary" onClick={() => void load(true)}>
              Спробувати ще
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p className="empty-state-text">
              {items.length === 0
                ? "У базі ще немає сценаріїв."
                : `Нічого не знайдено за «${query}».`}
            </p>
          </div>
        ) : (
          <div className="scn-table-wrap">
            <table className="scn-table">
              <thead>
                <tr>
                  <th className="scn-th-menu">☰</th>
                  <th className="scn-th-cw">codeword</th>
                  <th className="scn-th-type">тип</th>
                  <th className="scn-th-updated">оновлено</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const isRich = row.rich_message === "true" || row.rich_message === "1";
                  return (                      <tr
                      key={row.codeword}
                      className={`scn-row${selectedRow === row.codeword ? " scn-row--selected" : ""}`}
                      onClick={() => {
                        setSelectedRow(selectedRow === row.codeword ? null : row.codeword);
                      }}
                    >
                      <td className="scn-td-menu">
                        <button
                          className="usr-menu-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuCodeword(menuCodeword === row.codeword ? null : row.codeword);
                          }}
                        >
                          ☰
                        </button>
                      </td>
                      <td className="scn-cw">{row.codeword}</td>
                      <td>
                        <span className={`scn-badge${isRich ? " scn-badge--rich" : ""}`}>
                          {isRich ? "Rich" : "Photo"}
                        </span>
                      </td>
                      <td className="scn-updated" title={row.updated_at}>
                        {relativeTime(row.updated_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {status === "refreshing" && <div className="scn-refreshing">оновлення…</div>}
          </div>
        )}
      </div>

      {/* Menu modal */}
      {menuCodeword && (
        <div className="modal-overlay" onClick={() => setMenuCodeword(null)}>
          <div className="usr-row-menu" onClick={(e) => e.stopPropagation()}>
            <div className="usr-row-menu-header">
              <span className="usr-row-menu-title">📋 {menuCodeword}</span>
              <button className="modal-close" onClick={() => setMenuCodeword(null)}>✕</button>
            </div>
            <div className="usr-row-menu-items">
              <button
                className="usr-row-menu-item"
                onClick={() => { setSelectedCodeword(menuCodeword); setModalMode("card"); setMenuCodeword(null); }}
              >
                👁️ Переглянути
              </button>
              <button
                className="usr-row-menu-item"
                onClick={() => { setSelectedCodeword(menuCodeword); setModalMode("edit"); setMenuCodeword(null); }}
              >
                ✏️ Змінити
              </button>
              <div className="usr-row-menu-divider" />
              <button
                className="usr-row-menu-item usr-row-menu-item--danger"
                onClick={() => { setConfirmDelete(menuCodeword); setMenuCodeword(null); }}
              >
                🗑️ Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="usr-row-menu" onClick={(e) => e.stopPropagation()}>
            <div className="usr-row-menu-header">
              <span className="usr-row-menu-title">⚠️ Видалити сценарій?</span>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}>✕</button>
            </div>
            <p style={{ padding: "12px 16px 0", color: "var(--text-secondary)", fontSize: 13 }}>
              Видалити «{confirmDelete}»? Цю дію неможливо скасувати.
            </p>
            <div className="usr-row-menu-items" style={{ paddingTop: 12 }}>
              <button
                className="usr-row-menu-item usr-row-menu-item--danger"
                onClick={async () => {
                  try {
                    await deleteScenario(confirmDelete);
                    setConfirmDelete(null);
                    await load(true);
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                🗑️ Так, видалити
              </button>
              <button
                className="usr-row-menu-item"
                onClick={() => setConfirmDelete(null)}
              >
                ✕ Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card modal */}
      {selectedCodeword && modalMode === "card" && (
        <ScenarioCardModal
          codeword={selectedCodeword}
          onClose={() => { setSelectedCodeword(null); setModalMode(null); }}
          onEdit={() => setModalMode("edit")}
        />
      )}

      {/* Edit modal */}
      {selectedCodeword && modalMode === "edit" && (
        <ScenarioEditModal
          codeword={selectedCodeword}
          onClose={() => { setSelectedCodeword(null); setModalMode(null); }}
          onSaved={() => void load(true)}
        />
      )}
    </>
  );
}
