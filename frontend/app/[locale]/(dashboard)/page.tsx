// Dashboard RSC entry point — Phase 38 reference implementation of the
// server-prefetch + HydrationBoundary pattern.
//
// Responsibilities:
//   1. Read locale, enable next-intl SSR translations.
//   2. Auth-gate + prefetch orchestration via createPrefetchedPage HOF
//      (see frontend/lib/rsc/create-prefetched-page.tsx).
//   3. Collapse the legacy /deadlines/upcoming -> /courses/{nearest} serial
//      waterfall (D-A4, PERF-02) using a single blocking fetch bridged
//      by Promise.all to independent prefetches.
//   4. Feed every prefetch's failure path through wrapSentry so Sentry gets
//      the phase-38 tag convention (P01 establishes; P02 reuses).
//
// Waterfall contract (static analysis in dashboard-prefetch.test.ts verifies
// the grep-level invariant):
//   - Exactly one blocking upcoming-deadlines lookup.
//   - Independent prefetches (courses / gpa / study-rec) fire immediately.
//   - Nearest-course detail is added to Promise.allSettled rather than
//     awaited serially.
import { setRequestLocale } from "next-intl/server";

import DashboardPage from "@/components/dashboard/DashboardPage";
import {
  createPrefetchedPage,
  wrapSentry,
} from "@/lib/rsc/create-prefetched-page";
import { getServerApiClient } from "@/lib/rsc/server-query-fn";
import { courseOptions } from "@/hooks/use-courses";
import { deadlineOptions } from "@/hooks/use-deadlines";
import { gpaOptions } from "@/hooks/use-gpa";
import { studyRecOptions } from "@/hooks/use-study-recommendations";
import type { paths } from "@/lib/api/types.gen";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

// Response-shape aliases mirror the per-hook convention so `.json<T>()` and
// `getQueryData<T>()` stay structurally identical to the client-side types.
type CoursesResponse =
  paths["/courses"]["get"]["responses"]["200"]["content"]["application/json"];
type CourseDetailResponse =
  paths["/courses/{id}"]["get"]["responses"]["200"]["content"]["application/json"];
type DeadlinesUpcomingResponse =
  paths["/deadlines/upcoming"]["get"]["responses"]["200"]["content"]["application/json"];
type GpaReportResponse =
  paths["/gpa"]["get"]["responses"]["200"]["content"]["application/json"];
type StudyRecResponse =
  paths["/ai/study-recommendations"]["get"]["responses"]["200"]["content"]["application/json"];

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: <DashboardPage />,
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);

      // Wave A: fire non-dependent prefetches immediately (parallel).
      // NOTE: .catch(wrapSentry(...)) is defense-in-depth here — TanStack's
      // prefetchQuery always resolves, so the QueryCache onError subscriber
      // wired in createPrefetchedPage is the primary failure channel. The
      // .catch() is retained per plan acceptance criteria and fires only if
      // the prefetch promise itself is rejected by outer code (it isn't in
      // v5, but we keep the belt-and-braces invariant for forward-compat).
      const independentPrefetches: Promise<unknown>[] = [
        queryClient
          .prefetchQuery({
            ...courseOptions.list(),
            queryFn: () => api.get("courses").json<CoursesResponse>(),
          })
          .catch(wrapSentry("courses", userId)),
        queryClient
          .prefetchQuery({
            ...gpaOptions.report(),
            queryFn: () => api.get("gpa").json<GpaReportResponse>(),
          })
          .catch(wrapSentry("gpa", userId)),
        queryClient
          .prefetchQuery({
            ...studyRecOptions.latest(),
            queryFn: () =>
              api.get("ai/study-recommendations").json<StudyRecResponse>(),
          })
          .catch(wrapSentry("study-rec", userId)),
      ];

      // Wave B: await /deadlines/upcoming ONCE (needed to discover the
      // nearest-course code). fetchQuery rejects on error so wrapSentry
      // fires here for real.
      let nearestCourseId: string | null = null;
      try {
        const upcoming = await queryClient.fetchQuery({
          ...deadlineOptions.upcoming(),
          queryFn: () =>
            api.get("deadlines/upcoming").json<DeadlinesUpcomingResponse>(),
        });

        const nearestCode = upcoming.data
          .filter((d) => d.days_remaining >= 0)[0]?.course_code;

        if (nearestCode) {
          // Wait for the in-flight courses prefetch — map code -> id without
          // a second round trip (D-A4 waterfall collapse).
          await Promise.all(independentPrefetches);
          const coursesCache = queryClient.getQueryData<CoursesResponse>(
            courseOptions.list().queryKey,
          );
          nearestCourseId =
            coursesCache?.data.find((c) => c.code === nearestCode)?.id ?? null;
        }
      } catch (error) {
        wrapSentry("deadlines-upcoming", userId)(error);
      }

      // Wave C: conditional nearest-course detail prefetch, settled in
      // parallel with any remaining independent prefetches.
      const finalPrefetches: Promise<unknown>[] = [...independentPrefetches];
      if (nearestCourseId) {
        const courseId = nearestCourseId;
        finalPrefetches.push(
          queryClient
            .prefetchQuery({
              ...courseOptions.detail(courseId),
              queryFn: () =>
                api.get(`courses/${courseId}`).json<CourseDetailResponse>(),
            })
            .catch(wrapSentry("course-detail", userId, { courseId })),
        );
      }
      await Promise.allSettled(finalPrefetches);
    },
  });
}
