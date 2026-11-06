import { useMemo, useState, useEffect, useCallback } from "react";
import { useUsersStore, type SortField } from "../../features/users/store";
import type { UserRow } from "../../shared/api/users.api";
import { UserCardModal } from "./UserCardModal";
import { UserEditModal } from "./UserEditModal";
import { icons } from "@wwwuabot/shared";
import { DataTable, type DataTableColumn } from "@wwwuabot/ui/table";
import { useDialog } from "@wwwuabot/ui/dialog";

const ico = (name: keyof typeof icons, extraStyle?: React.CSSProperties) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: 18,
      height: 18,
      flexShrink: 0,
      ...extraStyle,
    }}
  >
    {icons[name]}
  </span>
);

function formatName(u: UserRow): string {
  const parts = [u.first_name, u.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "—";
}

/** Палітра ролі: роль — це позначка, а не заливка рядка. */
function roleTone(role: string): React.CSSProperties {
  const tone: Record<string, React.CSSProperties> = {
    admin: { marginLeft: 4, background: "#fef3c7", color: "#92400e" },
    vip: { marginLeft: 4, background: "#ede9fe", color: "#5b21b6" },
  };
  return tone[role] ?? { marginLeft: 4, background: "#e0e7ff", color: "#3730a3" };
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
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

interface Props {
  onMessage: (userId: number) => void;
}

export function UsersTable({ onMessage }: Props) {
  const dialog = useDialog();
  const { items, sortField, sortDir, search, setSort, selectedIds, toggleSelect, selectAll } =
    useUsersStore();

  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [cardUserId, setCardUserId] = useState<number | null>(null);
  const [editUserId, setEditUserId] = useState<number | null>(null);

  const openMenu = useCallback((id: number) => {
    setMenuOpen(id);
    setCardUserId(null);
    setEditUserId(null);
  }, []);
  const closeAll = useCallback(() => {
    setMenuOpen(null);
    setCardUserId(null);
    setEditUserId(null);
  }, []);

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
      let va: string | number;
      let vb: string | number;
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

  function sortHeader(field: SortField, label: string) {
    const arrow = sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return (
      <span
        className="wb-th-sortable"
        onClick={() => setSort(field)}
        title={`Сортувати за ${label}`}
      >
        {label}
        {arrow && <span className="wb-sort-arrow">{arrow}</span>}
      </span>
    );
  }

  const menuUser = menuOpen !== null ? items.find((u) => u.user_id === menuOpen) : null;

  const columns: readonly DataTableColumn<UserRow>[] = [
    {
      key: "menu",
      header: "",
      className: "wb-col-tight wb-cell-center",
      pin: 0,
      width: 36,
      render: (u) => (
        <button
          className="wb-row-menu-btn"
          onClick={(event) => {
            event.stopPropagation();
            openMenu(u.user_id);
          }}
          title="Дії"
        >
          ☰
        </button>
      ),
    },
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          className="wb-check"
          checked={allSelected}
          onChange={() => selectAll(allIds)}
          onClick={(event) => event.stopPropagation()}
          title="Вибрати всі"
        />
      ),
      className: "wb-col-tight wb-cell-center",
      pin: 36,
      width: 36,
      render: (u) => (
        <input
          type="checkbox"
          className="wb-check"
          checked={selectedIds.has(u.user_id)}
          onChange={() => toggleSelect(u.user_id)}
          onClick={(event) => event.stopPropagation()}
        />
      ),
    },
    {
      key: "first_name",
      header: sortHeader("first_name", "Ім'я"),
      className: "wb-cell-name",
      pin: 72,
      width: 150,
      render: (u) => formatName(u),
    },
    {
      key: "username",
      header: sortHeader("username", "Username"),
      className: "wb-cell-mono wb-cell-nowrap",
      width: 130,
      render: (u) => (u.username ? `@${u.username}` : "—"),
    },
    {
      key: "user_id",
      header: sortHeader("user_id", "ID"),
      className: "wb-cell-mono wb-cell-nowrap",
      width: 80,
      render: (u) => u.user_id,
    },
    {
      key: "created_at",
      header: sortHeader("created_at", "Приєднання"),
      className: "wb-cell-nowrap",
      width: 110,
      render: (u) => relativeTime(u.created_at),
    },
    {
      key: "status",
      header: "Статус",
      className: "wb-cell-nowrap",
      width: 150,
      render: (u) => (
        <>
          {u.is_blocked === 1 ? (
            <span className="wb-badge wb-badge--dense wb-badge-red">Заблоковано</span>
          ) : (
            <span className="wb-badge wb-badge--dense wb-badge-green">Активний</span>
          )}
          {u.role && u.role !== "user" && (
            <span className="wb-badge wb-badge--dense" style={roleTone(u.role)}>
              {u.role}
            </span>
          )}
          {u.tariff && u.tariff !== "free" && (
            <span
              className="wb-badge wb-badge--dense"
              style={{ marginLeft: 4, background: "#dcfce7", color: "#166534" }}
            >
              {u.tariff}
            </span>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <div className="wb-users-table">
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(u) => String(u.user_id)}
          selectedKey={selectedRow === null ? null : String(selectedRow)}
          onRowClick={(u) => setSelectedRow(selectedRow === u.user_id ? null : u.user_id)}
          empty={
            items.length === 0
              ? "У базі ще немає користувачів."
              : `Нічого не знайдено за «${search}».`
          }
          rowClassName={(u) => (u.is_blocked === 1 ? "wb-row-blocked" : "")}
          minWidth={820}
        />
      </div>

      {/* Action modal menu */}
      {menuUser && !cardUserId && !editUserId && (
        <div className="wb-modal-overlay" onClick={closeAll}>
          <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wb-modal-header">
              <span className="wb-modal-title">
                {formatName(menuUser)}
                {menuUser.username ? `  @${menuUser.username}` : ""}
              </span>
              <button className="wb-close-btn" onClick={closeAll}>
                {icons["close"]}
              </button>
            </div>
            <div className="wb-modal-body wb-modal-menu">
              <button
                className="wb-modal-menu-item"
                onClick={() => {
                  setMenuOpen(null);
                  setCardUserId(menuUser.user_id);
                }}
              >
                {ico("eye")} Переглянути
              </button>
              <button
                className="wb-modal-menu-item"
                onClick={() => {
                  setMenuOpen(null);
                  setEditUserId(menuUser.user_id);
                }}
              >
                {ico("edit")} Змінити
              </button>
              <div className="wb-modal-divider" />
              <button
                className="wb-modal-menu-item"
                onClick={() => {
                  setMenuOpen(null);
                  onMessage(menuUser.user_id);
                }}
              >
                {ico("mail")} Написати повідомлення
              </button>
              <button
                className="wb-modal-menu-item"
                onClick={async () => {
                  const { blockOne } = useUsersStore.getState();
                  await blockOne(menuUser.user_id, menuUser.is_blocked !== 1);
                  setMenuOpen(null);
                }}
              >
                {menuUser.is_blocked === 1 ? (
                  <>{ico("unlock")} Розблокувати</>
                ) : (
                  <>{ico("lock")} Заблокувати</>
                )}
              </button>
              <div className="wb-modal-divider" />
              <button
                className="wb-modal-menu-item wb-modal-menu-item--danger"
                onClick={async () => {
                  const ok = await dialog.confirm(`Видалити користувача ${menuUser.user_id}?`, {
                    tone: "danger",
                    confirmText: "Видалити",
                  });
                  if (!ok) return;
                  const { deleteOne } = useUsersStore.getState();
                  await deleteOne(menuUser.user_id);
                  closeAll();
                }}
              >
                {ico("trash")} Видалити
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
          onEdit={(id) => {
            setCardUserId(null);
            setEditUserId(id);
          }}
          onMessage={(id) => {
            closeAll();
            onMessage(id);
          }}
        />
      )}

      {/* User edit */}
      {editUserId !== null && (
        <UserEditModal
          userId={editUserId}
          onClose={closeAll}
          onSaved={() => {
            void useUsersStore.getState().refresh();
          }}
        />
      )}
    </>
  );
}
