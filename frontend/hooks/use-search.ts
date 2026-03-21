import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type SearchResponse =
  paths["/search"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const searchKeys = {
  all: ["search"] as const,
  query: (
    q: string,
    scope?: "materials" | "discussions" | "all",
    courseId?: string,
  ) => [...searchKeys.all, q, scope, courseId] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const searchOptions = {
  query: (
    q: string,
    scope?: "materials" | "discussions" | "all",
    courseId?: string,
    limit?: number,
  ) =>
    queryOptions({
      queryKey: searchKeys.query(q, scope, courseId),
      queryFn: () => {
        const searchParams: Record<string, string | number> = { q };
        if (scope) searchParams.scope = scope;
        if (courseId) searchParams.course_id = courseId;
        if (limit) searchParams.limit = limit;

        return api
          .get("search", { searchParams })
          .json<SearchResponse>();
      },
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useSearch(
  q: string,
  options?: {
    scope?: "materials" | "discussions" | "all";
    courseId?: string;
    limit?: number;
  },
) {
  return useQuery({
    ...searchOptions.query(q, options?.scope, options?.courseId, options?.limit),
    enabled: q.length >= 2,
  });
}
