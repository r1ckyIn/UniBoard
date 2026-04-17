/**
 * TanStack Mutation hook for AIFEAT-03 multi-course path planner.
 *
 * POST /gpa/multi-course-path with { target_wam, remaining_credit_points }
 * — receives closed-form Decimal math + optional 30-50 word AI advisory.
 * On AI failure the backend returns advisory_text=null (D-D1 silent fallback);
 * the math portion always flows through.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { gpaKeys } from "@/hooks/use-gpa";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

type MultiCoursePathBody =
  paths["/gpa/multi-course-path"]["post"]["requestBody"]["content"]["application/json"];

type MultiCoursePathResponse =
  paths["/gpa/multi-course-path"]["post"]["responses"]["200"]["content"]["application/json"];

export function useMultiCoursePath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: MultiCoursePathBody) =>
      api
        .post("gpa/multi-course-path", { json: body })
        .json<MultiCoursePathResponse>(),
    onSuccess: () => {
      // Invalidate GPA cache so summary card re-fetches if target changes
      queryClient.invalidateQueries({ queryKey: gpaKeys.all });
    },
  });
}
