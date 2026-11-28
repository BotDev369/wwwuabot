import { useMemo, useState, useEffect, useCallback } from "react";
import { useUsersStore, type SortField } from "../../features/users/store";
import type { UserRow } from "../../shared/api/users.api";
import { UserCardModal } from "./UserCardModal";
import { UserChatModal } from "./UserChatModal";
import { UserEditModal } from "./UserEditModal";
import projectLabels from "../tenant/project-labels.json";
import { UserProjectCell } from "./UserProjectCell";
import { formatName, relativeTime } from "./user-row";
import { filteredUsers } from "./users-view";
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

/** Палітра ролі: роль — це позначка, а не заливка рядка. */
function roleTone(role: string): React.CSSProperties {
  const tone: Record<string, React.CSSProperties> = {
    admin: { marginLeft: 4, background: "#fef3c7", color: "#92400e" },
    vip: { marginLeft: 4, background: "#ede9fe", color: "#5b21b6" },
  };
  return tone[role] ?? { marginLeft: 4, background: "#e0e7ff", color: "#3730a3" };
}

interface Props {
  onMessage: (userId: number) => void;
}

export function UsersTable({ onMessage }: Props) {
  const dialog = useDialog();
  const {
    items,
    sortField,
    sortDir,
    search,
    tenantFilter,
    setSort,
    selectedIds,
    toggleSelect,
    selectAll,
  } = useUsersStore();

  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [cardUserId, setCardUserId] = useState<number | null>(null);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [chatUserId, setChatUserId] = useState<number | null>(null);

  const openMenu = useCallback((id: number) => {
    setMenuOpen(id);
    setCardUserId(null);
    setEditUserId(null);
    setChatUserId(null);
  }, []);
  const closeAll = useCallback(() => {
    setMenuOpen(null);
    setCardUserId(null);
    setEditUserId(null);
    setChatUserId(null);
  }, []);

  // Close modal on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeAll();
    }
    if (menuOpen !== null || cardUserId !== null || editUserId !== null || chatUserId !== null) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [menuOpen, cardUserId, editUserId, chatUserId, closeAll]);

  const filtered = useMemo(
    () => filteredUsers(items, { search, tenantFilter, sortField, sortDir }),
    [items, search, tenantFilter, sortField, sortDir],
  );

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
  const chatUser = chatUserId !== null ? items.find((u) => u.user_id === chatUserId) : null;

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
      key: "tenant_key",
      header: sortHeader("tenant_key", projectLabels.label),
      className: "wb-cell-nowrap",
      width: 160,
      render: (u) => <UserProjectCell user={u} />,
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
              : tenantFilter && search.trim() === ""
                ? projectLabels.emptyProject
                : `Нічого не знайдено за «${search}».`
          }
          rowClassName={(u) => (u.is_blocked === 1 ? "wb-row-blocked" : "")}
          minWidth={820}
        />
      </div>

      {/* Action modal menu */}
      {menuUser && !cardUserId && !editUserId && chatUserId === null && (
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
                  setChatUserId(menuUser.user_id);
                }}
              >
                {ico("message-square")} Переписка
              </button>
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
          onChat={(id) => {
            setCardUserId(null);
            setChatUserId(id);
          }}
        />
      )}

      {/* Переписка з ботом: зі стрічки — назад у картку, тим самим кліком */}
      {chatUserId !== null && cardUserId === null && (
        <UserChatModal
          userId={chatUserId}
          title={chatUser ? formatName(chatUser) : undefined}
          onClose={closeAll}
          onOpenCard={(id) => {
            setChatUserId(null);
            setCardUserId(id);
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
