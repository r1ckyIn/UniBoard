"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type { LoginResponse, RegisterRequest, RegisterResponse } from "../api/types";
import { setTokens, clearTokens, getRefreshToken } from "../auth/tokens";

/**
 * Login mutation.
 * CRITICAL: The backend expects application/x-www-form-urlencoded
 * with field name "username" (not "email") per OAuth2PasswordRequestForm.
 */
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const body = new URLSearchParams();
      body.set("username", credentials.email);
      body.set("password", credentials.password);

      const response = await api.post(ENDPOINTS.auth.login, { body }).json<{
        data: LoginResponse;
        meta: { request_id: string; timestamp: string };
      }>();
      return response.data;
    },
    onSuccess: (data) => {
      setTokens(data.access_token, data.refresh_token);
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Register mutation (JSON body).
 */
export function useRegister() {
  return useMutation({
    mutationFn: async (payload: RegisterRequest) => {
      return unwrap<RegisterResponse>(
        api.post(ENDPOINTS.auth.register, { json: payload })
      );
    },
  });
}

/**
 * Logout -- clears stored tokens and all query caches.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      clearTokens();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Refresh access token using the stored refresh token.
 */
export function useRefreshToken() {
  return useMutation({
    mutationFn: async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token");

      const data = await unwrap<LoginResponse>(
        api.post(ENDPOINTS.auth.refresh, {
          json: { refresh_token: refreshToken },
        })
      );
      setTokens(data.access_token, data.refresh_token);
      return data;
    },
  });
}
