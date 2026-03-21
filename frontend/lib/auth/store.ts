import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  tokenConfigured: boolean;
  setAuth: (
    tokens: { access: string; refresh: string },
    user: AuthUser,
  ) => void;
  setTokenConfigured: (configured: boolean) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      tokenConfigured: false,

      setAuth: (tokens, user) =>
        set({
          accessToken: tokens.access,
          refreshToken: tokens.refresh,
          user,
          isAuthenticated: true,
        }),

      setTokenConfigured: (configured) =>
        set({ tokenConfigured: configured }),

      clearAuth: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          tokenConfigured: false,
        }),
    }),
    { name: "uniboard-auth" },
  ),
);
