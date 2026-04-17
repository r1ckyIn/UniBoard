/**
 * TanStack Query hook for AIFEAT-01 daily study recommendations.
 *
 * Reads the cached row from GET /ai/study-recommendations — no realtime LLM call
 * per D-A2. The backend APScheduler job runs at 07:00 AEST daily and populates
 * the row; first-day new users receive `data === null` and the UI falls back
 * gracefully via defaultEncouragementProvider + Top-3 ROI (D-D1).
 */
import { queryOptions, useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

type StudyRecResponse =
  paths["/ai/study-recommendations"]["get"]["responses"]["200"]["content"]["application/json"];

export const studyRecKeys = {
  all: ["studyRecommendations"] as const,
  latest: () => [...studyRecKeys.all, "latest"] as const,
};

export const studyRecOptions = {
  latest: () =>
    queryOptions({
      queryKey: studyRecKeys.latest(),
      queryFn: () =>
        api.get("ai/study-recommendations").json<StudyRecResponse>(),
    }),
};

export function useStudyRecommendation() {
  return useQuery(studyRecOptions.latest());
}
