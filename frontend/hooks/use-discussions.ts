import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type DiscussionsResponse =
  paths["/courses/{id}/discussions"]["get"]["responses"]["200"]["content"]["application/json"];

type DiscussionFilter = "high_value" | "endorsed" | "staff" | "all";

// ── Query key factory ───────────────────────────────────────────────────────
export const discussionKeys = {
  all: ["discussions"] as const,
  byCourse: (courseId: string, filter?: DiscussionFilter) =>
    [...discussionKeys.all, courseId, filter] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const discussionOptions = {
  byCourse: (
    courseId: string,
    filter?: DiscussionFilter,
    cursor?: string,
    limit?: number,
  ) =>
    queryOptions({
      queryKey: discussionKeys.byCourse(courseId, filter),
      queryFn: () => {
        const searchParams: Record<string, string | number> = {};
        if (filter) searchParams.filter = filter;
        if (cursor) searchParams.cursor = cursor;
        if (limit) searchParams.limit = limit;

        return Object.keys(searchParams).length > 0
          ? api
              .get(`courses/${courseId}/discussions`, { searchParams })
              .json<DiscussionsResponse>()
          : api
              .get(`courses/${courseId}/discussions`)
              .json<DiscussionsResponse>();
      },
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useCourseDiscussions(
  courseId: string,
  filter?: DiscussionFilter,
) {
  return useQuery(discussionOptions.byCourse(courseId, filter));
}
