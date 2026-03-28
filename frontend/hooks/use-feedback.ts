import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface FeedbackPayload {
  threadId: string;
  feedbackType: "thumbs_up" | "thumbs_down";
}

/**
 * Mutation hook for submitting thread feedback (thumbs up/down).
 * Proxies through Next.js Route Handler to Python backend.
 */
export function useFeedback() {
  return useMutation({
    mutationFn: async ({ threadId, feedbackType }: FeedbackPayload) =>
      api
        .post(`threads/${threadId}/feedback`, {
          json: { feedback_type: feedbackType },
        })
        .json(),
  });
}
