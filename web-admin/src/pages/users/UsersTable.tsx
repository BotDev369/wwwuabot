import { useMemo, useState, useRef, useEffect } from "react";
import { useUsersStore, type SortField } from "../../features/users/store";
import { UserRowMenu } from "./UserRowMenu";
import type { UserRow } from "../../shared/api/users.api";

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
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen !== null) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [menuOpen]);

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

  function thSort(field: SortField, label: string) {
    const arrow = sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : "";
    return (
      <th
        className="usr-th-sortable"
        onClick={() => setSort(field)}
        title={`Сортувати за ${label}`}
      >
        {label}
        {arrow && <span className="usr-th-arrow">{arrow}</span>}
      </th>
    );
  }

  return (
    <div className="usr-table-wrap">
      <table className="usr-table">
        <thead>
          <tr>
            <th className="usr-th-menu"></th>
            <th className="usr-th-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => selectAll(allIds)}
                title="Вибрати всі"
              />
            </th>
            {thSort("first_name", "Ім'я")}
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
              return (
                <tr key={u.user_id} className={`usr-row${blocked ? " usr-row--blocked" : ""}`}>
                  <td className="usr-td-menu">
                    <div className="usr-menu-anchor" ref={menuOpen === u.user_id ? menuRef : undefined}>
                      <button
                        className="usr-menu-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(menuOpen === u.user_id ? null : u.user_id);
                        }}
                        title="Дії"
                      >
                        ☰
                      </button>
                      {menuOpen === u.user_id && (
                        <UserRowMenu
                          user={u}
                          onMessage={() => {
                            setMenuOpen(null);
                            onMessage(u.user_id);
                          }}
                          onClose={() => setMenuOpen(null)}
                        />
                      )}
                    </div>
                  </td>
                  <td className="usr-td-check">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.user_id)}
                      onChange={() => toggleSelect(u.user_id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="usr-td-name">{formatName(u)}</td>
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
  );
}
