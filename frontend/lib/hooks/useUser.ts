"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type {
  UserResponse,
  UserUpdateRequest,
  TokenConfigResponse,
  TokenConfigRequest,
} from "../api/types";

/**
 * Fetch the current authenticated user.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["users", "me"],
    queryFn: () => unwrap<UserResponse>(api.get(ENDPOINTS.users.me)),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update the current user profile.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UserUpdateRequest) => {
      return unwrap<UserResponse>(
        api.patch(ENDPOINTS.users.me, { json: payload })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}

/**
 * Configure a platform token (Canvas / Ed).
 */
export function useSetToken(platform: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TokenConfigRequest) => {
      return unwrap<TokenConfigResponse>(
        api.put(ENDPOINTS.users.token(platform), { json: payload })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    },
  });
}
