import { create } from "zustand";

interface AppState {
  /** 当前用户标识 */
  user: string | null;
  /** 设置当前用户 */
  setUser: (user: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
