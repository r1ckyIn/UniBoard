import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";
import { useAuthStore } from "@/lib/auth/store";

// ── Response type aliases ───────────────────────────────────────────────────
type LoginResponse =
  paths["/auth/login"]["post"]["responses"]["200"]["content"]["application/json"];
type RegisterResponse =
  paths["/auth/register"]["post"]["responses"]["201"]["content"]["application/json"];
type RefreshResponse =
  paths["/auth/refresh"]["post"]["responses"]["200"]["content"]["application/json"];

// ── Request body type aliases ───────────────────────────────────────────────
type LoginBody =
  paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"];
type RegisterBody =
  paths["/auth/register"]["post"]["requestBody"]["content"]["application/json"];
type RefreshBody =
  paths["/auth/refresh"]["post"]["requestBody"]["content"]["application/json"];
type LogoutBody =
  paths["/auth/logout"]["post"]["requestBody"]["content"]["application/json"];

// ── Mutations ───────────────────────────────────────────────────────────────

export function useLogin() {
  return useMutation({
    mutationFn: (body: LoginBody) =>
      api.post("auth/login", { json: body }).json<LoginResponse>(),
    onSuccess: (data) => {
      const { access_token, refresh_token, user } = data.data;
      useAuthStore.getState().setAuth(
        { access: access_token, refresh: refresh_token },
        {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
        },
      );
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (body: RegisterBody) =>
      api.post("auth/register", { json: body }).json<RegisterResponse>(),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: LogoutBody) =>
      api.post("auth/logout", { json: body }).json<void>(),
    onSuccess: () => {
      useAuthStore.getState().clearAuth();
      queryClient.clear();
    },
  });
}

export function useRefreshToken() {
  return useMutation({
    mutationFn: (body: RefreshBody) =>
      api.post("auth/refresh", { json: body }).json<RefreshResponse>(),
    onSuccess: (data) => {
      const { access_token, refresh_token } = data.data;
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        useAuthStore
          .getState()
          .setAuth(
            { access: access_token, refresh: refresh_token },
            currentUser,
          );
      }
    },
  });
}
