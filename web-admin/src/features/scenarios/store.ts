import { create } from "zustand";
import { listScenarios, type ScenarioListRow } from "../../shared/api/scenarios.api";

export type ScenariosStatus = "idle" | "loading" | "refreshing" | "error";
export type ScenariosSortField = "codeword" | "rich_message" | "updated_at";
export type SortDir = "asc" | "desc";

interface ScenariosStore {
  items: ScenarioListRow[];
  etag: string | null;
  status: ScenariosStatus;
  errorMsg: string | null;
  sortField: ScenariosSortField;
  sortDir: SortDir;
  setSort: (field: ScenariosSortField) => void;
  load: (force?: boolean) => Promise<void>;
}

export const useScenariosStore = create<ScenariosStore>((set, get) => ({
  items: [],
  etag: null,
  status: "idle",
  errorMsg: null,
  sortField: "codeword",
  sortDir: "asc",

  setSort: (field) => {
    const { sortField, sortDir } = get();
    if (sortField === field) {
      set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      set({ sortField: field, sortDir: "asc" });
    }
  },

  load: async (force = false) => {
    const { items, etag } = get();
    const hasCache = items.length > 0;
    // Є кеш і не force → миттєво показуємо кеш і фоново дотягуємо з ETag.
    const useEtag = !force && hasCache ? etag : null;
    set({ status: hasCache && !force ? "refreshing" : "loading", errorMsg: null });
    try {
      const res = await listScenarios(useEtag);
      if (res.notModified) {
        set({ status: "idle" });
        return;
      }
      set({ items: res.items, etag: res.etag, status: "idle" });
    } catch (e) {
      set({ status: "error", errorMsg: (e as Error).message });
    }
  },
}));
