/**
 * ScenariosPage — єдина сторінка сценаріїв з перемикачем Portal/Admin.
 *
 * Замінює два окремих маршрути (/scenarios та /scenarios-admin)
 * на один з табами зверху.
 */

import { useEffect, useCallback, useState } from "react";
import { useScenariosStore } from "../../features/scenarios/store";
import { saveScenarioFields, type ScenarioTable } from "../../shared/api/scenarios.api";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "../scenarios-v2/ScenariosV2Table";
import { ScenarioCardModal } from "./ScenarioCardModal";
import { icons, type IconName } from "@wwwuabot/shared";

const ico = (name: IconName, size = 16) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    {icons[name]}
  </span>
);

interface TableTab {
  key: ScenarioTable;
  label: string;
  icon: IconName;
}

const TABLE_TABS: TableTab[] = [
  { key: "portal", label: "Портал", icon: "globe" },
  { key: "admin", label: "Адмін", icon: "scenarios-admin" },
];

export function ScenariosPage() {
  const { items, status, errorMsg, load, setTable, table } = useScenariosStore();
  const [creating, setCreating] = useState(false);
  const [openedCodeword, setOpenedCodeword] = useState<string | null>(null);

  // Initialize to portal on first mount
  useEffect(() => {
    setTable("portal");
    void load();
  }, [setTable, load]);

  const handleTabSwitch = useCallback(
    (newTable: ScenarioTable) => {
      if (newTable === table) return;
      setTable(newTable);
      void load(true);
    },
    [table, setTable, load],
  );

  const handleCreate = useCallback(async () => {
    const codeword = window.prompt("Вкажіть кодове слово:");
    if (!codeword || !codeword.trim()) return;
    const cw = codeword
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");

    setCreating(true);
    try {
      await saveScenarioFields(
        cw,
        {
          title: cw,
          page_data: JSON.stringify({
            version: 1,
            zones: { sidebar: [], header: [], main: [], footer: [] },
            visibleZones: [],
          }),
        },
        table,
      );
      // Open the scenario card with constructor immediately
      setOpenedCodeword(cw);
    } catch (e) {
      alert(`Помилка створення: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }, [table]);

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Сценарії</h1>
          {items.length > 0 && <span className="scn-count">{items.length}</span>}
        </div>
        <div className="topbar-right">
          <button className="wb-btn wb-btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Створення…" : "+ Новий"}
          </button>
        </div>
      </PageTopbar>

      {/* Table toggle — Portal / Admin */}
      <div
        style={{
          padding: "0 16px",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            gap: 0,
            background: "var(--bg-1, #f1f5f9)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid var(--border)",
          }}
        >
          {TABLE_TABS.map((tab) => {
            const isActive = table === tab.key;
            const count = items.length;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabSwitch(tab.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  borderRadius: 7,
                  border: "none",
                  background: isActive ? "var(--bg-home, var(--bg-0))" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: isActive ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {ico(tab.icon, 15)}
                {tab.label}
                {isActive && status !== "loading" && (
                  <span
                    style={{
                      fontSize: 11,
                      background: "var(--accent, #6366f1)",
                      color: "#fff",
                      padding: "1px 6px",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scn-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження сценаріїв…</p>
          </div>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Не вдалося завантажити: {errorMsg}</p>
            <button className="wb-btn wb-btn-secondary" onClick={() => void load(true)}>
              Спробувати ще
            </button>
          </div>
        ) : (
          <ScenariosV2Table />
        )}
      </div>

      {/* Scenario card modal — opens after creation */}
      {openedCodeword && (
        <ScenarioCardModal
          codeword={openedCodeword}
          table={table}
          initialSubTab="constructor"
          onClose={() => setOpenedCodeword(null)}
          onSaved={() => void load(true)}
        />
      )}
    </>
  );
}
