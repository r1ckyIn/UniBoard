import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

// ── Response types (inline until openapi-typescript generates them) ─────────
export interface AssignmentROI {
  assessment_name: string;
  weight: number;
  difficulty: number;
  difficulty_source: string;
  roi_score: number;
  recommendation: string;
  score: number | null;
  max_score: number | null;
  due_date: string | null;
}

export interface CourseROIResponse {
  course_id: string;
  course_code: string;
  course_name: string;
  assignments: AssignmentROI[];
  has_ai_estimates: boolean;
}

interface SuccessResponse<T> {
  data: T;
  meta: { request_id: string; timestamp: string };
}

// ── Query key factory ───────────────────────────────────────────────────────
export const roiKeys = {
  all: ["roi"] as const,
  course: (courseId: string) => [...roiKeys.all, courseId] as const,
};

// ── queryOptions factory ────────────────────────────────────────────────────
export const roiOptions = {
  course: (courseId: string) =>
    queryOptions({
      queryKey: roiKeys.course(courseId),
      queryFn: () =>
        api
          .get(`courses/${courseId}/roi`)
          .json<SuccessResponse<CourseROIResponse>>(),
      staleTime: 10 * 60 * 1000, // ROI data is slow-changing
      enabled: !!courseId,
    }),
};

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useRoi(courseId: string) {
  return useQuery(roiOptions.course(courseId));
}
