/**
 * «Повідомлення» — звернення, написані зі сторінки відмови.
 *
 * Екран починається там, де для адміністратора починається робота: що людини
 * написали, хто це і коли. Рядок відкривається на правку, новий запис
 * додається з панелі (звернення, що прийшло поза платформою) — решта дій
 * наступним кроком (§8 відкрита робота).
 *
 * Фільтр пошуку — на клієнті, як у «Користувачах»: список звернень невеликий,
 * а друга копія фільтра на сервері була б другим місцем правила.
 *
 * @module web-admin-dev/src/pages/messages/AccessRequestsPage
 */

import { useEffect, useMemo, useState } from "react";
import { useAccessRequests } from "../../features/access-requests/store";
import { accessRequestAuthor } from "@wwwuabot/shared/access-requests";
import { PageTopbar } from "../../layout/PageTopbar";
import { RequestList } from "./RequestList";
import { RequestModal } from "./RequestModal";
import { RequestCreateModal } from "./RequestCreateModal";

export function AccessRequestsPage() {
  const { items, status, errorMsg, load, search, setSearch } = useAccessRequests();
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        accessRequestAuthor(item).toLowerCase().includes(q) ||
        item.text.toLowerCase().includes(q) ||
        String(item.user_id).includes(q),
    );
  }, [items, search]);

  const open = openId === null ? null : (items.find((item) => item.id === openId) ?? null);

  return (
    <>
      <PageTopbar>
        <div className="wb-topbar-left">
          <h1 className="wb-topbar-title">Повідомлення</h1>
          {items.length > 0 && <span className="scn-count">{items.length}</span>}
        </div>
        <div className="wb-topbar-right">
          <input
            type="text"
            className="scn-search"
            placeholder="Пошук за ім'ям або текстом…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="wb-btn wb-btn-primary" onClick={() => setCreating(true)}>
            Записати
          </button>
        </div>
      </PageTopbar>

      <div className="scn-body">
        {status === "loading" ? (
          <div className="empty-state">
            <p className="empty-state-text">Завантаження повідомлень…</p>
          </div>
        ) : status === "error" ? (
          <div className="empty-state">
            <p className="empty-state-text">Не вдалося завантажити: {errorMsg}</p>
            <button className="wb-btn wb-btn-secondary" onClick={() => void load()}>
              Спробувати ще
            </button>
          </div>
        ) : (
          <RequestList
            items={filtered}
            emptyText={
              items.length === 0
                ? "Повідомлень ще немає — вони з'являться тут, щойно людина напише зі сторінки відмови."
                : `Нічого не знайдено за «${search}».`
            }
            onOpen={setOpenId}
          />
        )}
      </div>

      {open && <RequestModal item={open} onClose={() => setOpenId(null)} />}
      {creating && <RequestCreateModal onClose={() => setCreating(false)} />}
    </>
  );
}
