import { useEffect } from "react";
import { useUsersStore } from "../../features/users/store";
import { PageTopbar } from "../../layout/PageTopbar";
import { UsersTable } from "./UsersTable";
import { UserBulkBar } from "./UserBulkBar";
import { UserMessageModal } from "./UserMessageModal";
import { useState } from "react";

export function UsersPage() {
  const { items, status, errorMsg, load, search, setSearch } = useUsersStore();
  const [messageUserId, setMessageUserId] = useState<number | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageTopbar>
        <div className="topbar-left">
          <h1 className="topbar-title">Користувачі</h1>
          {items.length > 0 && (
            <span className="scn-count">{items.length}</span>
          )}
        </div>
        <div className="topbar-right">
          <input
            type="text"
            className="scn-search"
            placeholder="Пошук за ім'ям або username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </PageTopbar>

      <UserBulkBar />

      <div className="scn-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження користувачів…</p>
          </div>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Не вдалося завантажити: {errorMsg}</p>
            <button className="btn btn--secondary" onClick={() => void load()}>
              Спробувати ще
            </button>
          </div>
        ) : (
          <UsersTable onMessage={setMessageUserId} />
        )}
      </div>

      {messageUserId !== null && (
        <UserMessageModal userId={messageUserId} onClose={() => setMessageUserId(null)} />
      )}
    </>
  );
}
