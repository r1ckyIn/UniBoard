import {
  queryOptions,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type DeadlinesResponse =
  paths["/deadlines"]["get"]["responses"]["200"]["content"]["application/json"];
type UpcomingResponse =
  paths["/deadlines/upcoming"]["get"]["responses"]["200"]["content"]["application/json"];
type CourseDeadlinesResponse =
  paths["/courses/{id}/deadlines"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const deadlineKeys = {
  all: ["deadlines"] as const,
  lists: () => [...deadlineKeys.all, "list"] as const,
  list: (filters?: { from?: string; to?: string; course_id?: string }) =>
    [...deadlineKeys.lists(), filters] as const,
  upcoming: () => [...deadlineKeys.all, "upcoming"] as const,
  byCourse: (courseId: string) =>
    [...deadlineKeys.all, "course", courseId] as const,
  actions: () => [...deadlineKeys.all, "actions"] as const,
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
  byCourse: (courseId: string) =>
    queryOptions({
      queryKey: deadlineKeys.byCourse(courseId),
      queryFn: () =>
        api
          .get(`courses/${courseId}/deadlines`)
          .json<CourseDeadlinesResponse>(),
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

export function useCourseDeadlines(courseId: string) {
  return useQuery(deadlineOptions.byCourse(courseId));
}

// ── Mutation hooks ─────────────────────────────────────────────────────────

/** Create a deadline action (pin or delete). Per D-08. */
export function useCreateDeadlineAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { deadlineId: string; action: "pin" | "delete" }) =>
      api
        .post(`deadlines/${payload.deadlineId}/actions`, {
          json: { action: payload.action },
        })
        .json(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: deadlineKeys.all });
      const previous = queryClient.getQueryData(deadlineKeys.lists());
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(deadlineKeys.lists(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
    },
  });
}

/** Remove a deadline action (unpin or undelete). Per D-08. */
export function useRemoveDeadlineAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { deadlineId: string; action: "pin" | "delete" }) =>
      api
        .delete(`deadlines/${payload.deadlineId}/actions/${payload.action}`)
        .json(),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: deadlineKeys.all });
      const previous = queryClient.getQueryData(deadlineKeys.lists());
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(deadlineKeys.lists(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: deadlineKeys.all });
    },
  });
}
