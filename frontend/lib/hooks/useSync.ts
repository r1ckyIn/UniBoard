"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type { SyncStatusResponse, SyncTriggerResponse } from "../api/types";

/**
 * Poll sync status every 30 seconds.
 */
export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync", "status"],
    queryFn: () => unwrap<SyncStatusResponse>(api.get(ENDPOINTS.sync.status)),
    staleTime: 30 * 1000,
    refetchInterval: 30_000,
  });
}

/**
 * Trigger a manual sync.
 */
export function useTriggerSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      unwrap<SyncTriggerResponse>(api.post(ENDPOINTS.sync.trigger)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sync", "status"] });
    },
  });
}
