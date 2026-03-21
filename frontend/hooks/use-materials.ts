import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

// ── Response type aliases ───────────────────────────────────────────────────
type MaterialsResponse =
  paths["/courses/{id}/materials"]["get"]["responses"]["200"]["content"]["application/json"];

// ── Query key factory ───────────────────────────────────────────────────────
export const materialKeys = {
  all: ["materials"] as const,
  byCourse: (courseId: string, source?: "canvas" | "ed") =>
    [...materialKeys.all, courseId, source] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const materialOptions = {
  byCourse: (courseId: string, source?: "canvas" | "ed") =>
    queryOptions({
      queryKey: materialKeys.byCourse(courseId, source),
      queryFn: () =>
        source
          ? api
              .get(`courses/${courseId}/materials`, {
                searchParams: { source },
              })
              .json<MaterialsResponse>()
          : api
              .get(`courses/${courseId}/materials`)
              .json<MaterialsResponse>(),
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useCourseMaterials(
  courseId: string,
  source?: "canvas" | "ed",
) {
  return useQuery(materialOptions.byCourse(courseId, source));
}
