/**
 * Що видно в таблиці користувачів: пошук, проєкт і порядок — чисті функції.
 *
 * @module web-admin-dev/src/pages/users/users-view
 */

import type { UserRow } from "../../shared/api/users.api";
import type { SortDir, SortField } from "../../features/users/store";
import { formatName, tenantKeyOf } from "./user-row";

interface ViewOptions {
  search: string;
  /** Ключ проєкту; `null` — усі люди. */
  tenantFilter: string | null;
  sortField: SortField;
  sortDir: SortDir;
}

/** Рядки в тому порядку, у якому їх малює таблиця. */
export function filteredUsers(items: readonly UserRow[], options: ViewOptions): UserRow[] {
  const q = options.search.trim().toLowerCase();
  let list = [...items];

  if (options.tenantFilter) {
    list = list.filter((user) => tenantKeyOf(user) === options.tenantFilter);
  }
  if (q) {
    list = list.filter((user) => {
      const name = formatName(user).toLowerCase();
      const uname = (user.username ?? "").toLowerCase();
      return name.includes(q) || uname.includes(q) || String(user.user_id).includes(q);
    });
  }

  return list.sort((a, b) => {
    let va: string | number;
    let vb: string | number;
    if (options.sortField === "first_name") {
      va = formatName(a);
      vb = formatName(b);
    } else if (options.sortField === "username") {
      va = a.username ?? "";
      vb = b.username ?? "";
    } else if (options.sortField === "tenant_key") {
      va = tenantKeyOf(a);
      vb = tenantKeyOf(b);
    } else {
      va = (a[options.sortField] ?? "") as string | number;
      vb = (b[options.sortField] ?? "") as string | number;
    }
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return options.sortDir === "asc" ? -1 : 1;
    if (va > vb) return options.sortDir === "asc" ? 1 : -1;
    return 0;
  });
}
