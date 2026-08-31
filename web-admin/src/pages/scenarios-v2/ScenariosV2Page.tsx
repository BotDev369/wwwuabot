import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useScenariosStore } from "../../features/scenarios/store";
import { saveScenarioFields } from "../../shared/api/scenarios.api";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "./ScenariosV2Table";

export function ScenariosV2Page() {
  const { items, status, errorMsg, load } = useScenariosStore();
  const navigate = useNavigate();

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(async () => {
    const codeword = window.prompt("Введіть codeword для нового сценарію:");
    if (!codeword || !codeword.trim()) return;
    const cw = codeword.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    try {
      await saveScenarioFields(cw, {
        title: cw,
        page_data: JSON.stringify({
          version: 1,
          zones: { sidebar: [], header: [], main: [], footer: [] },
        }),
      });
      await load(true);
      navigate(`/page-admin/${encodeURIComponent(cw)}`);
    } catch (e) {
      alert(`Помилка створення: ${(e as Error).message}`);
    }
  }, [load, navigate]);

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Сценарії v.2</h1>
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
