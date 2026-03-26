import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";
import { useAuthStore } from "@/lib/auth/store";
import { createClient } from "@/lib/supabase/client";

// ── Response type aliases ───────────────────────────────────────────────────
type UserResponse =
  paths["/users/me"]["get"]["responses"]["200"]["content"]["application/json"];
type UpdateUserResponse =
  paths["/users/me"]["patch"]["responses"]["200"]["content"]["application/json"];
type ConfigureTokenResponse =
  paths["/users/me/tokens/{platform}"]["put"]["responses"]["200"]["content"]["application/json"];
type VerifyTokenResponse =
  paths["/users/me/tokens/{platform}/verify"]["post"]["responses"]["200"]["content"]["application/json"];
type ExportDataResponse =
  paths["/users/me/export"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Request body type aliases ───────────────────────────────────────────────
type UpdateUserBody =
  paths["/users/me"]["patch"]["requestBody"]["content"]["application/json"];
type ConfigureTokenBody =
  paths["/users/me/tokens/{platform}"]["put"]["requestBody"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const userKeys = {
  all: ["users"] as const,
  me: () => [...userKeys.all, "me"] as const,
  tokens: () => [...userKeys.all, "tokens"] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const userOptions = {
  me: () =>
    queryOptions({
      queryKey: userKeys.me(),
      queryFn: () => api.get("users/me").json<UserResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useCurrentUser() {
  return useQuery(userOptions.me());
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateUserBody) =>
      api
        .patch("users/me", { json: body })
        .json<UpdateUserResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useConfigureToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      platform,
      body,
    }: {
      platform: "canvas" | "ed";
      body: ConfigureTokenBody;
    }) =>
      api
        .put(`users/me/tokens/${platform}`, { json: body })
        .json<ConfigureTokenResponse>(),
    onSuccess: (data) => {
      if (data.data.status === "active") {
        useAuthStore.getState().setTokenConfigured(true);
      }
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useVerifyToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platform }: { platform: "canvas" | "ed" }) =>
      api
        .post(`users/me/tokens/${platform}/verify`)
        .json<VerifyTokenResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useDeleteToken() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ platform }: { platform: "canvas" | "ed" }) =>
      api.delete(`users/me/tokens/${platform}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.me() });
    },
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await api.delete("users/me");
    },
    onSuccess: async () => {
      // Sign out from Supabase; onAuthStateChange clears zustand
      const supabase = createClient();
      await supabase.auth.signOut();
    },
  });
}

export function useExportData() {
  return useQuery({
    ...queryOptions({
      queryKey: [...userKeys.all, "export"] as const,
      queryFn: () =>
        api.get("users/me/export").json<ExportDataResponse>(),
    }),
    enabled: false, // Only fetch when explicitly triggered
  });
}
