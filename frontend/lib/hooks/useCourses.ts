import { useQuery } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type {
  CourseMaterialsResponse,
  HighValuePostResponse,
} from "../api/types";

/**
 * Fetch course materials (folders + items).
 * staleTime 24 hours since module content syncs daily.
 */
export function useCourseMaterials(courseId: string) {
  return useQuery({
    queryKey: ["materials", courseId],
    queryFn: () =>
      unwrap<CourseMaterialsResponse>(
        api.get(ENDPOINTS.materials.course(courseId))
      ),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: !!courseId,
  });
}

/**
 * Fetch high-value Ed Discussion posts for a course.
 * Includes endorsed answers and staff responses.
 */
export function useCourseDiscussions(courseId: string) {
  return useQuery({
    queryKey: ["discussions", courseId],
    queryFn: () =>
      unwrap<HighValuePostResponse[]>(
        api.get(ENDPOINTS.intelligence.discussions(courseId))
      ),
    staleTime: 60 * 60 * 1000,
    enabled: !!courseId,
  });
}
