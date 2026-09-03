import { useMemo, useState, useEffect, useCallback } from "react";
import {
  useScenariosStore,
  type ScenariosSortField,
  type ScenarioFilter,
  type ScenarioGroupMode,
} from "../../features/scenarios/store";
import { ScenarioCardModal } from "../scenarios/ScenarioCardModal";
import { deleteScenario } from "../../shared/api/scenarios.api";
import { icons, type IconName } from "@wwwuabot/shared";

const ico = (name: IconName, size = 18) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

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

/** Визначити тип сценарію для фільтрації. */
function scenarioType(s: { rich_message: string | null; page_data?: string | null }): "photo" | "rich" | "page" {
  if (Boolean(s.page_data) && s.page_data !== "null") return "page";
  if (s.rich_message === "true" || s.rich_message === "1") return "rich";
  return "photo";
}

/** Витягти префікс з codeword (все до першого `_` або весь рядок). */
function extractPrefix(codeword: string): string {
  const idx = codeword.indexOf("_");
  return idx > 0 ? codeword.slice(0, idx) : codeword;
}

// ─── Filter chips config ────────────────────────────────────────────

interface FilterChip {
  key: ScenarioFilter;
  label: string;
  icon?: IconName;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: "all", label: "Усі" },
  { key: "photo", label: "Photo", icon: "image" },
  { key: "rich", label: "Rich", icon: "sparkles" },
  { key: "page", label: "Page", icon: "globe" },
];

// ─── Group mode config ──────────────────────────────────────────────

interface GroupModeOption {
  key: ScenarioGroupMode;
  label: string;
  icon: IconName;
}

const GROUP_MODES: GroupModeOption[] = [
  { key: "none", label: "Без групування", icon: "clipboard" },
  { key: "type", label: "За типом", icon: "blocks" },
  { key: "prefix", label: "За префіксом", icon: "clipboard" },
];

// ─── Main Component ─────────────────────────────────────────────────

export function ScenariosV2Table() {
  const { items, sortField, sortDir, setSort, filter, setFilter, groupBy, setGroupBy } = useScenariosStore();

  const [query, setQuery] = useState("");
  const [menuCodeword, setMenuCodeword] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [cardCodeword, setCardCodeword] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const closeAll = useCallback(() => {
    setMenuCodeword(null);
    setCardCodeword(null);
    setConfirmDelete(null);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    if (menuCodeword || cardCodeword || confirmDelete) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [menuCodeword, cardCodeword, confirmDelete, closeAll]);

  // ── Apply filter + search + sort ──
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;

    // Filter by type
    if (filter !== "all") {
      list = list.filter((s) => scenarioType(s) === filter);
    }

    // Search by codeword
    if (q) {
      list = list.filter((s) => s.codeword.toLowerCase().includes(q));
    }

    // Sort
    list = [...list].sort((a, b) => {
      let va = "";
      let vb = "";
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
  }, [items, query, sortField, sortDir, filter]);

  // ── Group items ──
  const groups = useMemo(() => {
    if (groupBy === "none") return null;

    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const key = groupBy === "type" ? scenarioType(s) : extractPrefix(s.codeword);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }

    // Sort groups alphabetically
    const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [filtered, groupBy]);

  // ── Stats ──
  const stats = useMemo(() => {
    const total = items.length;
    const showing = filtered.length;
    const photoCount = items.filter((s) => scenarioType(s) === "photo").length;
    const richCount = items.filter((s) => scenarioType(s) === "rich").length;
    const pageCount = items.filter((s) => scenarioType(s) === "page").length;
    return { total, showing, photoCount, richCount, pageCount };
  }, [items, filtered]);

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

  return (
    <>
      <div className="usr-table-wrap">
        {/* ── Toolbar: Search + Filters + Grouping ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {/* Row 1: Search + Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              className="scn-search"
              placeholder="Пошук за codeword…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ flex: 1, minWidth: 180 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {filter !== "all" || query
                ? `${stats.showing} з ${stats.total}`
                : `${stats.total} сценаріїв`}
            </span>
          </div>

          {/* Row 2: Filter chips + Group selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* Filter chips */}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {FILTER_CHIPS.map((chip) => {
                const count =
                  chip.key === "all" ? stats.total
                    : chip.key === "photo" ? stats.photoCount
                    : chip.key === "rich" ? stats.richCount
                    : stats.pageCount;
                const isActive = filter === chip.key;
                return (
                  <button
                    key={chip.key}
                    onClick={() => setFilter(chip.key)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: isActive ? 600 : 400,
                      borderRadius: 12,
                      border: `1px solid ${isActive ? "var(--accent, #6366f1)" : "var(--border)"}`,
                      background: isActive ? "var(--accent, #6366f1)" : "transparent",
                      color: isActive ? "#fff" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {chip.icon && ico(chip.icon, 14)}
                    {chip.label}
                    <span style={{
                      fontSize: 10,
                      opacity: 0.8,
                      marginLeft: 2,
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

            {/* Group selector */}
            <div style={{ display: "flex", gap: 4 }}>
              {GROUP_MODES.map((mode) => {
                const isActive = groupBy === mode.key;
                return (
                  <button
                    key={mode.key}
                    onClick={() => setGroupBy(mode.key)}
                    title={mode.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      fontSize: 12,
                      borderRadius: 8,
                      border: `1px solid ${isActive ? "var(--accent, #6366f1)" : "var(--border)"}`,
                      background: isActive ? "var(--accent, #6366f1)" : "transparent",
                      color: isActive ? "#fff" : "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {ico(mode.icon, 14)}
                    <span className="scn-hide-mobile">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Table ── */}
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
            ) : groups ? (
              // Grouped view
              groups.map(([groupKey, groupItems]) => (
                <GroupSection
                  key={groupKey}
                  groupKey={groupKey}
                  groupMode={groupBy}
                  items={groupItems}
                  selectedRow={selectedRow}
                  onSelect={setSelectedRow}
                  onMenu={setMenuCodeword}
                />
              ))
            ) : (
              // Flat view
              filtered.map((s) => (
                <ScenarioRow
                  key={s.codeword}
                  scenario={s}
                  isSelected={selectedRow === s.codeword}
                  onSelect={() => setSelectedRow(selectedRow === s.codeword ? null : s.codeword)}
                  onMenu={() => setMenuCodeword(s.codeword)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action modal menu */}
      {menuScenario && !cardCodeword && !confirmDelete && (
        <div className="wb-modal-overlay" onClick={closeAll}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <span className="wb-modal-title">
                {ico("clipboard")} {menuScenario.codeword}
              </span>
              <button className="wb-close-btn" onClick={closeAll}>{icons["close"]}</button>
            </div>
            <div className="wb-modal-body wb-modal-menu">
              <button
                className="wb-modal-menu-item"
                onClick={() => { setMenuCodeword(null); setCardCodeword(menuScenario.codeword); }}
              >
                {ico("clipboard")} Картка сценарію
              </button>
              <div className="wb-modal-divider" />
              <button
                className="wb-modal-menu-item wb-modal-menu-item--danger"
                onClick={() => { setMenuCodeword(null); setConfirmDelete(menuScenario.codeword); }}
              >
                {ico("trash")} Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="wb-modal-overlay" onClick={closeAll}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <span className="wb-modal-title">{ico("warning")} Видалити сценарій?</span>
              <button className="wb-close-btn" onClick={closeAll}>{icons["close"]}</button>
            </div>
            <div className="wb-modal-body">
              <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>
                Видалити «{confirmDelete}»? Цю дію неможливо скасувати.
              </p>
            </div>
            <div className="wb-modal-body wb-modal-menu" style={{ paddingTop: 8 }}>
              <button
                className="wb-modal-menu-item wb-modal-menu-item--danger"
                onClick={async () => {
                  try {
                    await deleteScenario(confirmDelete, useScenariosStore.getState().table);
                    closeAll();
                    await useScenariosStore.getState().load(true);
                  } catch (e) {
                    alert((e as Error).message);
                  }
                }}
              >
                {ico("trash")} Так, видалити
              </button>
              <button className="wb-modal-menu-item" onClick={closeAll}>
                {ico("close")} Скасувати
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scenario card (unified modal) */}
      {cardCodeword !== null && (
        <ScenarioCardModal
          codeword={cardCodeword}
          table={useScenariosStore.getState().table}
          onClose={closeAll}
          onSaved={() => void useScenariosStore.getState().load(true)}
        />
      )}
    </>
  );
}

// ─── Group Section ──────────────────────────────────────────────────

interface GroupSectionProps {
  groupKey: string;
  groupMode: ScenarioGroupMode;
  items: Array<{ codeword: string; rich_message: string | null; page_data?: string | null; updated_at: string }>;
  selectedRow: string | null;
  onSelect: (codeword: string) => void;
  onMenu: (codeword: string) => void;
}

function GroupSection({ groupKey, groupMode, items, selectedRow, onSelect, onMenu }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const label = groupMode === "type"
    ? groupKey === "photo" ? "Photo (класичні)" : groupKey === "rich" ? "Rich (річ-повідомлення)" : "Page (веб-сторінки)"
    : groupKey;

  const icon: IconName = groupMode === "type"
    ? groupKey === "photo" ? "image" : groupKey === "rich" ? "sparkles" : "globe"
    : "clipboard";

  return (
    <>
      {/* Group header */}
      <tr
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: "pointer" }}
      >
        <td
          colSpan={4}
          style={{
            padding: "8px 12px",
            fontWeight: 600,
            fontSize: 13,
            background: "var(--bg-secondary, #f1f5f9)",
            borderBottom: "1px solid var(--border)",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
              {collapsed ? "▸" : "▾"}
            </span>
            {ico(icon, 16)}
            <span style={{ textTransform: "capitalize" }}>{label}</span>
            <span style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              background: "var(--bg-tertiary)",
              padding: "1px 6px",
              borderRadius: 10,
            }}>
              {items.length}
            </span>
          </div>
        </td>
      </tr>
      {/* Group items */}
      {!collapsed && items.map((s) => (
        <ScenarioRow
          key={s.codeword}
          scenario={s}
          isSelected={selectedRow === s.codeword}
          onSelect={() => onSelect(s.codeword)}
          onMenu={() => onMenu(s.codeword)}
        />
      ))}
    </>
  );
}

// ─── Scenario Row (extracted for reuse) ─────────────────────────────

interface ScenarioRowProps {
  scenario: { codeword: string; rich_message: string | null; page_data?: string | null; updated_at: string };
  isSelected: boolean;
  onSelect: () => void;
  onMenu: () => void;
}

function ScenarioRow({ scenario, isSelected, onSelect, onMenu }: ScenarioRowProps) {
  const isRich = scenario.rich_message === "true" || scenario.rich_message === "1";
  const hasPage = Boolean(scenario.page_data) && scenario.page_data !== "null";

  return (
    <tr
      className={`usr-row${isSelected ? " usr-row--selected" : ""}`}
      onClick={onSelect}
      style={{ cursor: "pointer" }}
    >
      <td className="usr-td-menu usr-td-sticky" style={{ left: 0 }}>
        <button
          className="usr-menu-btn"
          onClick={(e) => { e.stopPropagation(); onMenu(); }}
          title="Дії"
        >
          ☰
        </button>
      </td>
      <td className="usr-td-name usr-td-sticky" style={{ left: 0 }}>
        {scenario.codeword}
      </td>
      <td>
        <span className={`scn-badge${isRich ? " scn-badge--rich" : ""}`}>
          {isRich ? "Rich" : "Photo"}
        </span>
        {hasPage && (
          <span className="scn-badge" style={{ marginLeft: 4, background: "var(--color-info, #3b82f6)", color: "white" }}>
            Page
          </span>
        )}
      </td>
      <td className="usr-td-date" title={scenario.updated_at}>
        {relativeTime(scenario.updated_at)}
      </td>
    </tr>
  );
}
