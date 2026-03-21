import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type CoursesResponse =
  paths["/courses"]["get"]["responses"]["200"]["content"]["application/json"];
type CourseDetailResponse =
  paths["/courses/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const courseKeys = {
  all: ["courses"] as const,
  lists: () => [...courseKeys.all, "list"] as const,
  list: (semester?: string) => [...courseKeys.lists(), semester] as const,
  details: () => [...courseKeys.all, "detail"] as const,
  detail: (id: string) => [...courseKeys.details(), id] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const courseOptions = {
  list: (semester?: string) =>
    queryOptions({
      queryKey: courseKeys.list(semester),
      queryFn: () =>
        semester
          ? api
              .get("courses", { searchParams: { semester } })
              .json<CoursesResponse>()
          : api.get("courses").json<CoursesResponse>(),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: courseKeys.detail(id),
      queryFn: () => api.get(`courses/${id}`).json<CourseDetailResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useCourses(semester?: string) {
  return useQuery(courseOptions.list(semester));
}

export function useCourseDetail(id: string) {
  return useQuery(courseOptions.detail(id));
}
