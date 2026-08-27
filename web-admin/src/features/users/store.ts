import { create } from "zustand";
import {
  listUsers,
  bulkAction as apiBulkAction,
  deleteUser as apiDeleteUser,
  blockUser as apiBlockUser,
  type UserRow,
} from "../../shared/api/users.api";

export type UsersStatus = "idle" | "loading" | "error";

export type SortField = "user_id" | "first_name" | "username" | "created_at";
export type SortDir = "asc" | "desc";

interface UsersStore {
  items: UserRow[];
  selectedIds: Set<number>;
  status: UsersStatus;
  errorMsg: string | null;
  sortField: SortField;
  sortDir: SortDir;
  search: string;
  load: () => Promise<void>;
  setSearch: (q: string) => void;
  setSort: (field: SortField) => void;
  toggleSelect: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearSelection: () => void;
  deleteOne: (id: number) => Promise<void>;
  blockOne: (id: number, blocked: boolean) => Promise<void>;
  bulk: (action: "delete" | "block" | "unblock") => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUsersStore = create<UsersStore>((set, get) => ({
  items: [],
  selectedIds: new Set(),
  status: "idle",
  errorMsg: null,
  sortField: "user_id",
  sortDir: "asc",
  search: "",

  load: async () => {
    set({ status: "loading", errorMsg: null });
    try {
      const items = await listUsers();
      set({ items, status: "idle" });
    } catch (e) {
      set({ status: "error", errorMsg: (e as Error).message });
    }
  },

  refresh: async () => {
    try {
      const items = await listUsers();
      set({ items, status: "idle" });
    } catch (e) {
      set({ status: "error", errorMsg: (e as Error).message });
    }
  },

  setSearch: (q) => set({ search: q }),

  setSort: (field) => {
    const { sortField, sortDir } = get();
    if (sortField === field) {
      set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      set({ sortField: field, sortDir: "asc" });
    }
  },

  toggleSelect: (id) => {
    const next = new Set(get().selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selectedIds: next });
  },

  selectAll: (ids) => {
    const { selectedIds } = get();
    if (selectedIds.size === ids.length) {
      set({ selectedIds: new Set() });
    } else {
      set({ selectedIds: new Set(ids) });
    }
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  deleteOne: async (id) => {
    await apiDeleteUser(id);
    set((s) => ({
      items: s.items.filter((u) => u.user_id !== id),
      selectedIds: (() => { const n = new Set(s.selectedIds); n.delete(id); return n; })(),
    }));
  },

  blockOne: async (id, blocked) => {
    await apiBlockUser(id, blocked);
    set((s) => ({
      items: s.items.map((u) => (u.user_id === id ? { ...u, is_blocked: blocked ? 1 : 0 } : u)),
    }));
  },

  bulk: async (action) => {
    const { selectedIds } = get();
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await apiBulkAction(action, ids);
    if (action === "delete") {
      set((s) => ({
        items: s.items.filter((u) => !selectedIds.has(u.user_id)),
        selectedIds: new Set(),
      }));
    } else {
      const val = action === "block" ? 1 : 0;
      set((s) => ({
        items: s.items.map((u) => (selectedIds.has(u.user_id) ? { ...u, is_blocked: val } : u)),
        selectedIds: new Set(),
      }));
    }
  },
}));
