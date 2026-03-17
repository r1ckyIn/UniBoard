import { useQuery, useMutation } from "@tanstack/react-query";
import { api, unwrap } from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import type {
  QARequest,
  QAResponse,
  UnitReviewResponse,
  AIHighValuePostResponse,
} from "../api/types";

/**
 * Mutation for asking an AI question about course materials.
 * Returns cited answer with method indicator (direct/RAG).
 */
export function useAskQuestion(courseId: string) {
  return useMutation({
    mutationFn: (req: QARequest) =>
      unwrap<QAResponse>(
        api.post(ENDPOINTS.ai.qa(courseId), { json: req })
      ),
  });
}

/**
 * Fetch AI-generated unit review for a course.
 * Cached for 1 hour since reviews don't change frequently.
 */
export function useCourseReview(courseId: string) {
  return useQuery({
    queryKey: ["courseReview", courseId],
    queryFn: () =>
      unwrap<UnitReviewResponse>(
        api.get(ENDPOINTS.ai.review(courseId))
      ),
    staleTime: 3600_000,
    enabled: !!courseId,
  });
}

/**
 * Fetch AI-scored high-value Ed Discussion posts for a course.
 * Includes AI evaluation, GPA relevance, and category analysis.
 */
export function useAIHighValuePosts(courseId: string) {
  return useQuery({
    queryKey: ["aiPosts", courseId],
    queryFn: () =>
      unwrap<AIHighValuePostResponse[]>(
        api.get(ENDPOINTS.intelligence.aiPosts(courseId))
      ),
    staleTime: 300_000,
    enabled: !!courseId,
  });
}
