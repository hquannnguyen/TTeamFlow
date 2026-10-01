import { create } from 'zustand';

interface ActiveProjectState {
  activeProjectId: string | null;
  setActiveProjectId: (id: string) => void;
}

const STORAGE_KEY = 'tteamflow_active_project_id';

export const useActiveProjectStore = create<ActiveProjectState>((set) => ({
  activeProjectId: (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })(),
  setActiveProjectId: (id: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore localStorage quota or permission error
    }
    set({ activeProjectId: id });
  },
}));

