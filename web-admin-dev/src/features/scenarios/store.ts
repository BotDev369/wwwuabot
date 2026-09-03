import { create } from "zustand";
import { listScenarios, type ScenarioListRow, type ScenarioTable } from "../../shared/api/scenarios.api";

export type ScenariosStatus = "idle" | "loading" | "refreshing" | "error";
export type ScenariosSortField = "codeword" | "rich_message" | "updated_at";
export type SortDir = "asc" | "desc";

/** Тип фільтрації за типом сценарію. */
export type ScenarioFilter = "all" | "photo" | "rich" | "page";

/** Режим групування. */
export type ScenarioGroupMode = "none" | "type" | "prefix";

interface ScenariosStore {
  items: ScenarioListRow[];
  etag: string | null;
  status: ScenariosStatus;
  errorMsg: string | null;
  sortField: ScenariosSortField;
  sortDir: SortDir;
  /** Тип таблиці: "admin" = scenarios-admin, "portal" = scenarios */
  table: ScenarioTable;
  /** Активний фільтр. */
  filter: ScenarioFilter;
  /** Режим групування. */
  groupBy: ScenarioGroupMode;
  setTable: (table: ScenarioTable) => void;
  setSort: (field: ScenariosSortField) => void;
  setFilter: (filter: ScenarioFilter) => void;
  setGroupBy: (mode: ScenarioGroupMode) => void;
  load: (force?: boolean) => Promise<void>;
}

export const useScenariosStore = create<ScenariosStore>((set, get) => ({
  items: [],
  etag: null,
  status: "idle",
  errorMsg: null,
  sortField: "codeword",
  sortDir: "asc",
  table: "admin",
  filter: "all",
  groupBy: "none",

  setTable: (table) => {
    set({ table, items: [], etag: null });
  },

  setSort: (field) => {
    const { sortField, sortDir } = get();
    if (sortField === field) {
      set({ sortDir: sortDir === "asc" ? "desc" : "asc" });
    } else {
      set({ sortField: field, sortDir: "asc" });
    }
  },

  setFilter: (filter) => set({ filter }),
  setGroupBy: (groupBy) => set({ groupBy }),

  load: async (force = false) => {
    const { items, etag, table } = get();
    const hasCache = items.length > 0;
    const useEtag = !force && hasCache ? etag : null;
    set({ status: hasCache && !force ? "refreshing" : "loading", errorMsg: null });
    try {
      const res = await listScenarios(useEtag, table);
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
