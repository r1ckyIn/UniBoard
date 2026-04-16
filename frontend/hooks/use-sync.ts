import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";
import { courseKeys } from "./use-courses";

// ── Response type aliases ───────────────────────────────────────────────────
type SyncStatusResponse =
  paths["/sync/status"]["get"]["responses"]["200"]["content"]["application/json"];
type SyncTriggerResponse =
  paths["/sync/trigger"]["post"]["responses"]["202"]["content"]["application/json"];

// ── Request body type alias ─────────────────────────────────────────────────
// Extended locally to add `platforms` field (backend accepts it for the
// onboarding "Retry failed only" UX in plan 33-07; openapi.yaml will be
// regenerated in a future plan to bring this into the generated types).
type SyncTriggerBodyBase =
  paths["/sync/trigger"]["post"]["requestBody"]["content"]["application/json"];
export type SyncTriggerBody = SyncTriggerBodyBase & {
  platforms?: Array<"canvas" | "ed">;
};

// ── Query key factory ───────────────────────────────────────────────────────
export const syncKeys = {
  all: ["sync"] as const,
  status: () => [...syncKeys.all, "status"] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const syncOptions = {
  status: () =>
    queryOptions({
      queryKey: syncKeys.status(),
      queryFn: () =>
        api.get("sync/status").json<SyncStatusResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useSyncStatus() {
  return useQuery(syncOptions.status());
}

export function useSyncTrigger() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: SyncTriggerBody) =>
      api
        .post("sync/trigger", { json: body })
        .json<SyncTriggerResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: syncKeys.all });
      queryClient.invalidateQueries({ queryKey: courseKeys.all });
    },
  });
}
