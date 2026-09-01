/**
 * ScenariosAdminPage — сторінка управління сценаріями-адмін (таблиця scenarios-admin).
 *
 * Використовує той самий ScenariosV2Table та ScenarioCardModal,
 * але з параметром table="admin" для API-викликів.
 */

import { useEffect, useCallback } from "react";
import { useScenariosStore } from "../../features/scenarios/store";
import { saveScenarioFields } from "../../shared/api/scenarios.api";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "../scenarios-v2/ScenariosV2Table";

export function ScenariosAdminPage() {
  const { items, status, errorMsg, load, setTable } = useScenariosStore();

  useEffect(() => {
    setTable("admin");
    void load();
  }, [setTable, load]);

  const handleCreate = useCallback(async () => {
    const codeword = window.prompt("Введіть codeword для нового сценарію:");
    if (!codeword || !codeword.trim()) return;
    const cw = codeword.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
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
      await load(true);
    } catch (e) {
      alert(`Помилка створення: ${(e as Error).message}`);
    }
  }, [load]);

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
          <button className="btn btn--primary" onClick={handleCreate}>
            + Новий
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
            <button className="btn btn--secondary" onClick={() => void load(true)}>
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
