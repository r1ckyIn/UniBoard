import { useMutation } from "@tanstack/react-query";

interface FeedbackPayload {
  threadId: string;
  feedbackType: "thumbs_up" | "thumbs_down";
}

/**
 * Mutation hook for submitting thread feedback (thumbs up/down).
 * Sends POST to /api/v1/threads/{threadId}/feedback which proxies to Python backend.
 */
export function useFeedback() {
  return useMutation({
    mutationFn: async ({ threadId, feedbackType }: FeedbackPayload) => {
      const response = await fetch(
        `/api/v1/threads/${threadId}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback_type: feedbackType }),
        },
      );
      if (!response.ok) throw new Error("Feedback submission failed");
      return response.json();
    },
  });
}
