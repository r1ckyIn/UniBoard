import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type DigestLatestResponse =
  paths["/digest/latest"]["get"]["responses"]["200"]["content"]["application/json"];
type DigestHistoryResponse =
  paths["/digest/history"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const digestKeys = {
  all: ["digest"] as const,
  latest: () => [...digestKeys.all, "latest"] as const,
  history: (cursor?: string) =>
    [...digestKeys.all, "history", cursor] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const digestOptions = {
  latest: () =>
    queryOptions({
      queryKey: digestKeys.latest(),
      queryFn: () =>
        api.get("digest/latest").json<DigestLatestResponse>(),
    }),
  history: (cursor?: string, limit?: number) =>
    queryOptions({
      queryKey: digestKeys.history(cursor),
      queryFn: () => {
        const searchParams: Record<string, string | number> = {};
        if (cursor) searchParams.cursor = cursor;
        if (limit) searchParams.limit = limit;

        return Object.keys(searchParams).length > 0
          ? api
              .get("digest/history", { searchParams })
              .json<DigestHistoryResponse>()
          : api.get("digest/history").json<DigestHistoryResponse>();
      },
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useDigestLatest() {
  return useQuery(digestOptions.latest());
}

export function useDigestHistory(cursor?: string, limit?: number) {
  return useQuery(digestOptions.history(cursor, limit));
}
