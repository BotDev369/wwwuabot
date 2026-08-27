import { useEffect } from "react";
import { useScenariosStore } from "../../features/scenarios/store";
import { PageTopbar } from "../../layout/PageTopbar";
import { ScenariosV2Table } from "./ScenariosV2Table";

export function ScenariosV2Page() {
  const { items, status, errorMsg, load } = useScenariosStore();

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Сценарії v.2</h1>
          {items.length > 0 && (
            <span className="scn-count">{items.length}</span>
          )}
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
