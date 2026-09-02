import { useMemo, useState, useEffect, useCallback } from "react";
import { useUsersStore, type SortField } from "../../features/users/store";
import type { UserRow } from "../../shared/api/users.api";
import { UserCardModal } from "./UserCardModal";
import { UserEditModal } from "./UserEditModal";
import { icons } from "@wwwuabot/shared";

const ico = (name: keyof typeof icons, extraStyle?: React.CSSProperties) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: 18, height: 18, flexShrink: 0, ...extraStyle }}>
    {icons[name]}
  </span>
);

function formatName(u: UserRow): string {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

function relativeTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(date.getTime())) return value;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours} год тому`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "вчора";
  if (days < 7) return `${days} дн тому`;
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

interface Props {
  onMessage: (userId: number) => void;
}

export function UsersTable({ onMessage }: Props) {
  const { items, sortField, sortDir, search, setSort, selectedIds, toggleSelect, selectAll } =
    useUsersStore();

  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [cardUserId, setCardUserId] = useState<number | null>(null);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const openMenu = useCallback((id: number) => { setMenuOpen(id); setCardUserId(null); setEditUserId(null); }, []);
  const closeAll = useCallback(() => { setMenuOpen(null); setCardUserId(null); setEditUserId(null); }, []);

  // Close modal on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    if (menuOpen !== null || cardUserId !== null || editUserId !== null) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [menuOpen, cardUserId, editUserId, closeAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter((u) => {
        const name = formatName(u).toLowerCase();
        const uname = (u.username ?? "").toLowerCase();
        const id = String(u.user_id);
        return name.includes(q) || uname.includes(q) || id.includes(q);
      });
    }
    list = [...list].sort((a, b) => {
      let va: string | number = "";
      let vb: string | number = "";
      if (sortField === "first_name") {
        va = formatName(a);
        vb = formatName(b);
      } else if (sortField === "username") {
        va = (a.username ?? "") as string;
        vb = (b.username ?? "") as string;
      } else {
        va = (a[sortField] ?? "") as string | number;
        vb = (b[sortField] ?? "") as string | number;
      }
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [items, search, sortField, sortDir]);

  const allIds = filtered.map((u) => u.user_id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  function thSort(field: SortField, label: string, left?: number) {
    const arrow = sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    const stickyClass = left !== undefined ? " usr-th-sticky" : "";
    const style = left !== undefined ? { left } : undefined;
    return (
      <th
        className={`usr-th-sortable${stickyClass}`}
        style={style}
        onClick={() => setSort(field)}
        title={`Сортувати за ${label}`}
      >
        {label}
        {arrow && <span className="usr-th-arrow">{arrow}</span>}
      </th>
    );
  }

  const menuUser = menuOpen !== null ? items.find((u) => u.user_id === menuOpen) : null;

  return (
    <>
      <div className="usr-table-wrap">
        <table className="usr-table">
          <thead>
            <tr>
              <th className="usr-th-menu usr-th-sticky"></th>
              <th className="usr-th-check usr-th-sticky" style={{ left: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => selectAll(allIds)}
                  title="Вибрати всі"
                />
              </th>
              {thSort("first_name", "Ім'я", 72)}
              {thSort("username", "Username")}
              {thSort("user_id", "ID")}
              {thSort("created_at", "Приєднання")}
              <th className="usr-th-status">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="usr-empty">
                  {items.length === 0
                    ? "У базі ще немає користувачів."
                    : `Нічого не знайдено за «${search}».`}
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const blocked = u.is_blocked === 1;
                const isSelected = selectedRow === u.user_id;
                return (
                  <tr
                    key={u.user_id}
                    className={`usr-row${blocked ? " usr-row--blocked" : ""}${isSelected ? " usr-row--selected" : ""}`}
                    onClick={() => setSelectedRow(isSelected ? null : u.user_id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td className="usr-td-menu usr-td-sticky" style={{ left: 0 }}>
                      <button
                        className="usr-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMenu(u.user_id);
                        }}
                        title="Дії"
                      >
                        ☰
                      </button>
                    </td>
                    <td className="usr-td-check usr-td-sticky" style={{ left: 36 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.user_id)}
                        onChange={() => toggleSelect(u.user_id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td className="usr-td-name usr-td-sticky" style={{ left: 72 }}>
                      {formatName(u)}
                    </td>
                    <td className="usr-td-username">
                      {u.username ? `@${u.username}` : "—"}
                    </td>
                    <td className="usr-td-id">{u.user_id}</td>
                    <td className="usr-td-date" title={u.created_at ?? ""}>
                      {relativeTime(u.created_at)}
                    </td>
                    <td className="usr-td-status">
                      {blocked ? (
                        <span className="usr-badge usr-badge--blocked">Заблоковано</span>
                      ) : (
                        <span className="usr-badge usr-badge--active">Активний</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action modal menu */}
      {menuUser && !cardUserId && !editUserId && (
        <div className="usr-modal-overlay" onClick={closeAll}>
          <div className="usr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="usr-modal-header">
              <span className="usr-modal-title">
                {formatName(menuUser)}
                {menuUser.username ? `  @${menuUser.username}` : ""}
              </span>
              <button className="usr-modal-close" onClick={closeAll}>✕</button>
            </div>
            <div className="usr-modal-body usr-modal-menu">
              <button
                className="usr-modal-menu-item"
                onClick={() => { setMenuOpen(null); setCardUserId(menuUser.user_id); }}
              >
                {ico("eye")}{" "}Переглянути
              </button>
              <button
                className="usr-modal-menu-item"
                onClick={() => { setMenuOpen(null); setEditUserId(menuUser.user_id); }}
              >
                {ico("edit")}{" "}Змінити
              </button>
              <div className="usr-modal-divider" />
              <button
                className="usr-modal-menu-item"
                onClick={() => { setMenuOpen(null); onMessage(menuUser.user_id); }}
              >
                {ico("mail")}{" "}Написати повідомлення
              </button>
              <button
                className="usr-modal-menu-item"
                onClick={async () => {
                  const { blockOne } = useUsersStore.getState();
                  await blockOne(menuUser.user_id, menuUser.is_blocked !== 1);
                  setMenuOpen(null);
                }}
              >
                {menuUser.is_blocked === 1 ? <>{ico("unlock")}{" "}Розблокувати</> : <>{ico("lock")}{" "}Заблокувати</>}
              </button>
              <div className="usr-modal-divider" />
              <button
                className="usr-modal-menu-item usr-modal-menu-item--danger"
                onClick={async () => {
                  if (!confirm(`Видалити користувача ${menuUser.user_id}?`)) return;
                  const { deleteOne } = useUsersStore.getState();
                  await deleteOne(menuUser.user_id);
                  closeAll();
                }}
              >
                {ico("trash")}{" "}Видалити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User card (view) */}
      {cardUserId !== null && (
        <UserCardModal
          userId={cardUserId}
          onClose={closeAll}
          onEdit={(id) => { setCardUserId(null); setEditUserId(id); }}
          onMessage={(id) => { closeAll(); onMessage(id); }}
        />
      )}

      {/* User edit */}
      {editUserId !== null && (
        <UserEditModal
          userId={editUserId}
          onClose={closeAll}
          onSaved={closeAll}
        />
      )}
    </>
  );
}
