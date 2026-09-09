/**
 * ScenariosV2Table — покращена таблиця сценаріїв з фільтрами, групуванням та модалкою.
 */

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  useScenariosStore,
  type ScenariosSortField,
  type ScenarioFilter,
  type ScenarioGroupMode,
} from "../../features/scenarios/store";
import { ScenarioCardModal } from "../scenarios/ScenarioCardModal";
import { icons, type IconName } from "@wwwuabot/shared";
import { scenarioType, extractPrefix } from "./helpers";
import { ScenarioRow } from "./ScenarioRow";
import { GroupSection } from "./GroupSection";

const ico = (name: IconName, size = 18) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

// ─── Filter chips config ────────────────────────────────────────────

interface FilterChip { key: ScenarioFilter; label: string; icon?: IconName; }
const FILTER_CHIPS: FilterChip[] = [
  { key: "all", label: "Усі" },
  { key: "photo", label: "Photo", icon: "image" },
  { key: "rich", label: "Rich", icon: "sparkles" },
  { key: "page", label: "Page", icon: "globe" },
];

// ─── Group mode config ──────────────────────────────────────────────

interface GroupModeOption { key: ScenarioGroupMode; label: string; icon: IconName; }
const GROUP_MODES: GroupModeOption[] = [
  { key: "none", label: "Без групування", icon: "clipboard" },
  { key: "type", label: "За типом", icon: "blocks" },
  { key: "prefix", label: "За префіксом", icon: "clipboard" },
];

// ─── Main Component ─────────────────────────────────────────────────

export function ScenariosV2Table() {
  const { items, sortField, sortDir, setSort, filter, setFilter, groupBy, setGroupBy } = useScenariosStore();

  const [query, setQuery] = useState("");
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [cardCodeword, setCardCodeword] = useState<string | null>(null);
  const closeAll = useCallback(() => { setCardCodeword(null); }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === "Escape") closeAll(); }
    if (cardCodeword) { document.addEventListener("keydown", handleKey); return () => document.removeEventListener("keydown", handleKey); }
  }, [cardCodeword, closeAll]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (filter !== "all") list = list.filter((s) => scenarioType(s) === filter);
    if (q) list = list.filter((s) => s.codeword.toLowerCase().includes(q) || ((s.title as string) ?? "").toLowerCase().includes(q));
    list = [...list].sort((a, b) => {
      let va = "", vb = "";
      if (sortField === "codeword") { va = a.codeword; vb = b.codeword; }
      else if (sortField === "rich_message") { va = a.rich_message ?? ""; vb = b.rich_message ?? ""; }
      else if (sortField === "updated_at") { va = a.updated_at ?? ""; vb = b.updated_at ?? ""; }
      va = va.toLowerCase(); vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, query, sortField, sortDir, filter]);

  const groups = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, typeof filtered>();
    for (const s of filtered) {
      const key = groupBy === "type" ? scenarioType(s) : extractPrefix(s.codeword);
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, groupBy]);

  const stats = useMemo(() => {
    const total = items.length;
    const showing = filtered.length;
    const photoCount = items.filter((s) => scenarioType(s) === "photo").length;
    const richCount = items.filter((s) => scenarioType(s) === "rich").length;
    const pageCount = items.filter((s) => scenarioType(s) === "page").length;
    return { total, showing, photoCount, richCount, pageCount };
  }, [items, filtered]);

  function thSort(field: ScenariosSortField, label: string) {
    const arrow = sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return (
      <th className="usr-th-sortable" onClick={() => setSort(field)} title={`Сортувати за ${label}`}>
        {label}{arrow && <span className="usr-th-arrow">{arrow}</span>}
      </th>
    );
  }

  return (
    <>
      <div className="usr-table-wrap">
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input type="text" className="scn-search" placeholder="Пошук за codeword або назвою…"
              value={query} onChange={(e) => setQuery(e.target.value)} style={{ flex: 1, minWidth: 180 }}
            />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
              {filter !== "all" || query ? `${stats.showing} з ${stats.total}` : `${stats.total} сценаріїв`}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {FILTER_CHIPS.map((chip) => {
                const count = chip.key === "all" ? stats.total : chip.key === "photo" ? stats.photoCount : chip.key === "rich" ? stats.richCount : stats.pageCount;
                const isActive = filter === chip.key;
                return (
                  <button key={chip.key} onClick={() => setFilter(chip.key)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12, fontWeight: isActive ? 600 : 400, borderRadius: 12, border: `1px solid ${isActive ? "var(--accent, #6366f1)" : "var(--border)"}`, background: isActive ? "var(--accent, #6366f1)" : "transparent", color: isActive ? "#fff" : "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
                  >{chip.icon && ico(chip.icon, 14)} {chip.label} <span style={{ fontSize: 10, opacity: 0.8, marginLeft: 2 }}>{count}</span></button>
                );
              })}
            </div>
            <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />
            <div style={{ display: "flex", gap: 4 }}>
              {GROUP_MODES.map((mode) => {
                const isActive = groupBy === mode.key;
                return (
                  <button key={mode.key} onClick={() => setGroupBy(mode.key)} title={mode.label}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", fontSize: 12, borderRadius: 8, border: `1px solid ${isActive ? "var(--accent, #6366f1)" : "var(--border)"}`, background: isActive ? "var(--accent, #6366f1)" : "transparent", color: isActive ? "#fff" : "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s" }}
                  >{ico(mode.icon, 14)} <span className="scn-hide-mobile">{mode.label}</span></button>
                );
              })}
            </div>
          </div>
        </div>

        <table className="usr-table">
          <thead>
            <tr>
              {thSort("codeword", "Назва")}
              {thSort("rich_message", "Тип")}
              {thSort("updated_at", "Оновлено")}
              <th style={{ width: 80 }}>Дії</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="usr-empty">{items.length === 0 ? "У базі ще немає сценаріїв." : `Нічого не знайдено за «${query}».`}</td></tr>
            ) : groups ? (
              groups.map(([groupKey, groupItems]) => (
                <GroupSection key={groupKey} groupKey={groupKey} groupMode={groupBy} items={groupItems}
                  selectedRow={selectedRow} onSelect={setSelectedRow} onOpen={setCardCodeword}
                />
              ))
            ) : (
              filtered.map((s) => (
                <ScenarioRow key={s.codeword} scenario={s} isSelected={selectedRow === s.codeword}
                  onSelect={() => setSelectedRow(selectedRow === s.codeword ? null : s.codeword)}
                  onOpen={() => setCardCodeword(s.codeword)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {cardCodeword !== null && (
        <ScenarioCardModal codeword={cardCodeword} table={useScenariosStore.getState().table}
          onClose={closeAll} onSaved={() => void useScenariosStore.getState().load(true)}
        />
      )}
    </>
  );
}
