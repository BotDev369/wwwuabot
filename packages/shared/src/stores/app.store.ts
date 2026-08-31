import { create } from "zustand";

export interface AppState {
  /** Лівий sidebar — відкритий/закритий */
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;

  /** Контекстний (правий) sidebar */
  contextualSidebarOpen: boolean;
  setContextualSidebarOpen: (
    open: boolean | ((prev: boolean) => boolean),
  ) => void;

  /** Назва поточного сценарію для відображення в header */
  scenarioName: string | null;
  setScenarioName: (name: string | null) => void;

  /** Чи показувати кнопку контекстного меню */
  showContextualMenu: boolean;
  setShowContextualMenu: (show: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen:
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 769px)").matches,
  setSidebarOpen: (open) =>
    set((state) => ({
      sidebarOpen:
        typeof open === "function" ? open(state.sidebarOpen) : open,
    })),

  contextualSidebarOpen: false,
  setContextualSidebarOpen: (open) =>
    set((state) => ({
      contextualSidebarOpen:
        typeof open === "function"
          ? open(state.contextualSidebarOpen)
          : open,
    })),

  scenarioName: null,
  setScenarioName: (name) => set({ scenarioName: name }),

  showContextualMenu: false,
  setShowContextualMenu: (show) => set({ showContextualMenu: show }),
}));
