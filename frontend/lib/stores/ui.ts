import { create } from "zustand";

interface UIStore {
  /** Whether the mouse is currently hovering over the sidebar. */
  sidebarHovered: boolean;
  setSidebarHovered: (v: boolean) => void;

  /** Active locale for the application. */
  locale: "en" | "zh";
  setLocale: (l: "en" | "zh") => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarHovered: false,
  setSidebarHovered: (v) => set({ sidebarHovered: v }),

  locale: "en",
  setLocale: (l) => set({ locale: l }),
}));
