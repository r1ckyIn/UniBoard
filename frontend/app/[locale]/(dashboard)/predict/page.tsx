// Predict RSC entry point — Phase 38 Plan 02 Task 3 (N-fanout per D-B3).
//
// Architecture (D-B3 full N-fanout, cold-start tradeoff accepted):
//   Step 1: await /gpa (source of truth for the N course_ids the client
//           feeds into useQueries on detail + roi). We use gpaOptions.report
//           rather than courseOptions.list because PredictPage.tsx reads
//           `gpaReport.data.data.courses` — hydrating /gpa populates the same
//           state the client-side PredictPage consumes.
//   Step 2: fan out ALL N × /courses/{id} AND ALL N × /courses/{id}/roi in a
//           single Promise.allSettled. No cap, no batching (D-B3 locked).
//           Silent degrade (D-B4): any subset that rejects just falls back to
//           today's per-card SkeletonCard.
//
// Inner <Suspense> preserved for any async DigestPage-style subcomponents
// inside PredictPage. HOF provides the HydrationBoundary outer.
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import PredictPage from "@/components/predict/PredictPage";
import {
  createPrefetchedPage,
  wrapSentry,
} from "@/lib/rsc/create-prefetched-page";
import { getServerApiClient } from "@/lib/rsc/server-query-fn";
import { courseOptions } from "@/hooks/use-courses";
import { roiOptions, type CourseROIResponse } from "@/hooks/use-roi";
import { gpaOptions } from "@/hooks/use-gpa";
import { studyRecOptions } from "@/hooks/use-study-recommendations";
import { userOptions } from "@/hooks/use-user";
import type { paths } from "@/lib/api/types.gen";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

type GpaReportResponse =
  paths["/gpa"]["get"]["responses"]["200"]["content"]["application/json"];
type CourseDetailResponse =
  paths["/courses/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
// /courses/{id}/roi is not in types.gen (hook uses an inline response shape);
// mirror the hook's SuccessResponse<CourseROIResponse> envelope here so the
// server-side queryFn matches useRoi's return type byte-for-byte.
type CourseRoiResponse = {
  data: CourseROIResponse;
  meta: { request_id: string; timestamp: string };
};
type UserMeResponse =
  paths["/users/me"]["get"]["responses"]["200"]["content"]["application/json"];
type StudyRecResponse =
  paths["/ai/study-recommendations"]["get"]["responses"]["200"]["content"]["application/json"];

export default async function PredictRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: (
      <Suspense>
        <PredictPage />
      </Suspense>
    ),
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);

      // Step 1: await /gpa (N source of truth — matches PredictPage's
      // useGpaReport + gpaReport.data.data.courses consumer). fetchQuery
      // rejects on error, so wrapSentry fires here for real.
      let courseIds: string[] = [];
      try {
        const gpaReport = await queryClient.fetchQuery({
          ...gpaOptions.report(),
          queryFn: () => api.get("gpa").json<GpaReportResponse>(),
        });
        courseIds = gpaReport.data.courses.map((c) => c.course_id);
      } catch (error) {
        wrapSentry("gpa", userId)(error);
      }

      // Step 2a: top-level prefetches that do NOT depend on courseIds.
      // Hoisted outside the guard so they fire even when /gpa fails
      // (per PATTERNS.md §5 load-bearing fact #7 — useCurrentUser +
      // useStudyRecommendation are cross-page queries that must always
      // hydrate for Predict consumer parity).
      const topLevelPrefetches: Promise<unknown>[] = [
        queryClient
          .prefetchQuery({
            ...userOptions.me(),
            queryFn: () => api.get("users/me").json<UserMeResponse>(),
          })
          .catch(wrapSentry("users", userId)),
        queryClient
          .prefetchQuery({
            ...studyRecOptions.latest(),
            queryFn: () =>
              api.get("ai/study-recommendations").json<StudyRecResponse>(),
          })
          .catch(wrapSentry("study-rec", userId)),
      ];

      // Step 2b: full N-fanout — ALL N × detail + ALL N × roi in ONE
      // Promise.allSettled (D-B3). Do NOT cap, do NOT batch.
      if (courseIds.length > 0) {
        const fanoutPrefetches: Promise<unknown>[] = [
          ...courseIds.map((id) =>
            queryClient
              .prefetchQuery({
                ...courseOptions.detail(id),
                queryFn: () =>
                  api.get(`courses/${id}`).json<CourseDetailResponse>(),
              })
              .catch(wrapSentry("course-detail", userId, { courseId: id })),
          ),
          ...courseIds.map((id) =>
            queryClient
              .prefetchQuery({
                ...roiOptions.course(id),
                queryFn: () =>
                  api.get(`courses/${id}/roi`).json<CourseRoiResponse>(),
              })
              .catch(wrapSentry("roi", userId, { courseId: id })),
          ),
        ];
        await Promise.allSettled([...topLevelPrefetches, ...fanoutPrefetches]);
      } else {
        // /gpa failed or returned 0 courses — still hydrate the top-level
        // queries so useCurrentUser / useStudyRecommendation don't flash
        // skeletons (per PATTERNS.md §5 load-bearing fact #7).
        await Promise.allSettled(topLevelPrefetches);
      }
    },
  });
}
