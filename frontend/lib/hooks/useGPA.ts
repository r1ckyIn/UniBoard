import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type {
  GPASummaryResponse,
  CourseDetailResponse,
  TrendResponse,
} from "../api/types";

/**
 * Fetch cumulative GPA summary with per-course breakdown.
 * staleTime matches the 15-minute grade sync frequency.
 */
export function useGPASummary() {
  return useQuery({
    queryKey: ["gpa", "summary"],
    queryFn: () =>
      unwrap<GPASummaryResponse>(api.get(ENDPOINTS.gpa.summary)),
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Fetch detailed course data including individual assessments.
 * Only fires when courseId is truthy (avoids fetching with empty string).
 */
export function useGPACourseDetail(courseId: string) {
  return useQuery({
    queryKey: ["gpa", "course", courseId],
    queryFn: () =>
      unwrap<CourseDetailResponse>(api.get(ENDPOINTS.gpa.course(courseId))),
    staleTime: 15 * 60 * 1000,
    enabled: !!courseId,
  });
}

/**
 * Fetch semester-over-semester WAM/GPA trend data.
 * staleTime 1 hour since historical data rarely changes.
 */
export function useGPATrend() {
  return useQuery({
    queryKey: ["gpa", "trend"],
    queryFn: () => unwrap<TrendResponse>(api.get(ENDPOINTS.gpa.trend)),
    staleTime: 60 * 60 * 1000,
  });
}
