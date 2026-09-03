/**
 * ScenariosAdminPage — сторінка управління сценаріями-адмін (таблиця scenarios-admin).
 *
 * Використовує той самий ScenariosV2Table та ScenarioCardModal,
 * але з параметром table="admin" для API-викликів.
 *
 * Новий підхід створення: після введення codeword
 * одразу відкривається конструктор сторінки (порожня сторінка).
 */

import { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScenariosStore } from "../../features/scenarios/store";
import { saveScenarioFields } from "../../shared/api/scenarios.api";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "../scenarios-v2/ScenariosV2Table";

export function ScenariosAdminPage() {
  const { items, status, errorMsg, load, setTable } = useScenariosStore();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setTable("admin");
    void load();
  }, [setTable, load]);

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
          }),
        },
        "admin",
      );
      // Відкриваємо конструктор сторінки одразу
      navigate(`/page-builder/${cw}`);
    } catch (e) {
      alert(`Помилка створення: ${(e as Error).message}`);
      setCreating(false);
    }
  }, [navigate]);

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Сценарії — адмін</h1>
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
    </>
  );
}
