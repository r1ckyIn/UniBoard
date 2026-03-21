import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type DeadlinesResponse =
  paths["/deadlines"]["get"]["responses"]["200"]["content"]["application/json"];
type UpcomingResponse =
  paths["/deadlines/upcoming"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const deadlineKeys = {
  all: ["deadlines"] as const,
  lists: () => [...deadlineKeys.all, "list"] as const,
  list: (filters?: { from?: string; to?: string; course_id?: string }) =>
    [...deadlineKeys.lists(), filters] as const,
  upcoming: () => [...deadlineKeys.all, "upcoming"] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const deadlineOptions = {
  list: (filters?: { from?: string; to?: string; course_id?: string }) =>
    queryOptions({
      queryKey: deadlineKeys.list(filters),
      queryFn: () => {
        const searchParams: Record<string, string> = {};
        if (filters?.from) searchParams.from = filters.from;
        if (filters?.to) searchParams.to = filters.to;
        if (filters?.course_id) searchParams.course_id = filters.course_id;

        return Object.keys(searchParams).length > 0
          ? api
              .get("deadlines", { searchParams })
              .json<DeadlinesResponse>()
          : api.get("deadlines").json<DeadlinesResponse>();
      },
    }),
  upcoming: () =>
    queryOptions({
      queryKey: deadlineKeys.upcoming(),
      queryFn: () =>
        api.get("deadlines/upcoming").json<UpcomingResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useDeadlines(filters?: {
  from?: string;
  to?: string;
  course_id?: string;
}) {
  return useQuery(deadlineOptions.list(filters));
}

export function useUpcomingDeadlines() {
  return useQuery(deadlineOptions.upcoming());
}
