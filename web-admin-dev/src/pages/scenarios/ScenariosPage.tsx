/**
 * ScenariosPage — список сценаріїв (єдина таблиця `scenarios`).
 *
 * Доти тут був перемикач Portal/Admin: адмінка мала дві таблиці, і кожна
 * вкладка читала свою. `scenarios-admin` виявилась тестовою копією — контент із
 * неї не показувався **нікому** поза самою адмінкою, — тож вкладку разом із
 * таблицею видалено 13.09.2026, і сторінка лишилась одна.
 */

import { useEffect, useCallback, useState } from "react";
import { useScenariosStore } from "../../features/scenarios/store";
import { saveScenarioFields } from "../../shared/api/scenarios.api";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "../scenarios-v2/ScenariosV2Table";
import { ScenarioCardModal } from "./ScenarioCardModal";
import { useDialog } from "@wwwuabot/ui/dialog";

export function ScenariosPage() {
  const { items, status, errorMsg, load } = useScenariosStore();
  const [creating, setCreating] = useState(false);
  const [openedCodeword, setOpenedCodeword] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const dialog = useDialog();

  const handleCreate = useCallback(async () => {
    const slug = await dialog.prompt("Вкажіть Слаг:", { title: "Новий сценарій" });
    if (!slug || !slug.trim()) return;
    const cw = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");

    setCreating(true);
    try {
      await saveScenarioFields(cw, {
        title: cw,
        page_data: JSON.stringify({
          version: 1,
          zones: { sidebar: [], header: [], main: [], footer: [] },
          visibleZones: [],
        }),
      });
      // Open the scenario card with constructor immediately
      setOpenedCodeword(cw);
    } catch (e) {
      await dialog.alert(`Помилка створення: ${(e as Error).message}`, { tone: "danger" });
    } finally {
      setCreating(false);
    }
  }, [dialog]);

  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">Сценарії</h1>
          {items.length > 0 && <span className="scn-count">{items.length}</span>}
        </div>
        <div className="wb-topbar-right">
          <button className="wb-btn wb-btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Створення…" : "+ Новий"}
          </button>
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
          slug={openedCodeword}
          initialSubTab="constructor"
          onClose={() => setOpenedCodeword(null)}
          onSaved={() => void load(true)}
        />
      )}
    </>
  );
}
