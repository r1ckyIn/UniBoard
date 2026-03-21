import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type GradesResponse =
  paths["/courses/{id}/grades"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const gradeKeys = {
  all: ["grades"] as const,
  byCourse: (courseId: string) => [...gradeKeys.all, courseId] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const gradeOptions = {
  byCourse: (courseId: string) =>
    queryOptions({
      queryKey: gradeKeys.byCourse(courseId),
      queryFn: () =>
        api.get(`courses/${courseId}/grades`).json<GradesResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useCourseGrades(courseId: string) {
  return useQuery(gradeOptions.byCourse(courseId));
}
