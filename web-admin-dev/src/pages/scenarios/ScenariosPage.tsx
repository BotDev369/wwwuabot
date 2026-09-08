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
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

interface TableTab {
  key: ScenarioTable;
  label: string;
  icon: IconName;
  description: string;
}

const TABLE_TABS: TableTab[] = [
  { key: "portal", label: "Портал", icon: "globe", description: "Веб-сторінки для користувачів" },
  { key: "admin", label: "Адмін", icon: "scenarios-admin", description: "Сценарії для бота та адмінки" },
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

  const handleTabSwitch = useCallback((newTable: ScenarioTable) => {
    if (newTable === table) return;
    setTable(newTable);
    void load(true);
  }, [table, setTable, load]);

  const handleCreate = useCallback(async () => {
    const codeword = window.prompt("Вкажіть кодове слово:");
    if (!codeword || !codeword.trim()) return;
    const cw = codeword.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");

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

  const activeTab = TABLE_TABS.find((t) => t.key === table) ?? TABLE_TABS[0];

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Сценарії</h1>
          {items.length > 0 && (
            <span className="scn-count">{items.length}</span>
          )}
        </div>
        <div className="topbar-right">
          <button
            className="wb-btn wb-btn-primary"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Створення…" : "+ Новий"}
          </button>
        </div>
      </PageTopbar>

      {/* Table toggle — Portal / Admin */}
      <div style={{
        display: "flex",
        gap: 4,
        padding: "0 16px",
        marginBottom: 12,
      }}>
        {TABLE_TABS.map((tab) => {
          const isActive = table === tab.key;
          const count = tab.key === "portal"
            ? items.length // Will be accurate after load
            : items.length;
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
                borderRadius: 8,
                border: `1px solid ${isActive ? "var(--accent, #6366f1)" : "var(--border)"}`,
                background: isActive ? "var(--accent, #6366f1)" : "transparent",
                color: isActive ? "#fff" : "var(--text-secondary)",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {ico(tab.icon, 16)}
              {tab.label}
              {isActive && status !== "loading" && (
                <span style={{
                  fontSize: 11,
                  opacity: 0.8,
                  background: "rgba(255,255,255,0.2)",
                  padding: "1px 6px",
                  borderRadius: 10,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <span style={{
          fontSize: 12,
          color: "var(--text-muted)",
          alignSelf: "center",
          marginLeft: 8,
        }}>
          {activeTab.description}
        </span>
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
