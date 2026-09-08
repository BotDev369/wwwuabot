import { create } from "zustand";

export interface AppState {
  /** Назва поточного сценарію для відображення в header */
  scenarioName: string | null;
  setScenarioName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  scenarioName: null,
  setScenarioName: (name) => set({ scenarioName: name }),
}));
