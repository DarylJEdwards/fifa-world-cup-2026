import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { GroupCode, UserPreferences } from "../types";

interface PreferenceState extends UserPreferences {
  setSelectedGroup: (group: GroupCode) => void;
  toggleFavorite: (teamId: string) => void;
  setTheme: (theme: UserPreferences["theme"]) => void;
  setLayout: (layout: UserPreferences["layout"]) => void;
  setTimezone: (timezone: UserPreferences["timezone"]) => void;
  setRefreshSeconds: (seconds: number) => void;
  setReducedMotion: (value: boolean) => void;
  resetPreferences: () => void;
}

const defaultPreferences: UserPreferences = {
  selectedGroup: "A",
  favorites: ["mex", "can", "usa"],
  theme: "dark",
  layout: "cinematic",
  timezone: "local",
  refreshSeconds: 30,
  reducedMotion: false
};

export const usePreferences = create<PreferenceState>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
      toggleFavorite: (teamId) =>
        set((state) => ({
          favorites: state.favorites.includes(teamId)
            ? state.favorites.filter((favorite) => favorite !== teamId)
            : [...state.favorites, teamId]
        })),
      setTheme: (theme) => set({ theme }),
      setLayout: (layout) => set({ layout }),
      setTimezone: (timezone) => set({ timezone }),
      setRefreshSeconds: (seconds) => set({ refreshSeconds: clampRefreshSeconds(seconds) }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      resetPreferences: () => set({ ...defaultPreferences, favorites: [...defaultPreferences.favorites] })
    }),
    {
      name: "wc26-command-center-preferences",
      storage: createJSONStorage(() => globalThis.localStorage)
    }
  )
);

function clampRefreshSeconds(value: number): number {
  if (!Number.isFinite(value)) return defaultPreferences.refreshSeconds;
  return Math.min(300, Math.max(10, Math.round(value)));
}
