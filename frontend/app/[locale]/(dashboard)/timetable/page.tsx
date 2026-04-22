// Timetable RSC entry point — Phase 38 Plan 02 Task 5.
//
// QueryKey parity note (DEVIATION from plan text): Plan 02 §Task 5 suggests
// prefetching `timetableOptions.sessions(currentWeek)` with a server-side
// `computeCurrentWeek(new Date())`, and `deadlineOptions.upcoming()`. Reading
// TimetablePage.tsx reveals the consumer actually calls:
//   - useSemesterWeeks()                         -> timetableOptions.weeks()
//   - useTimetableSessions()  // NO week arg     -> timetableOptions.sessions(undefined)
//   - useDeadlines()          // NO filter       -> deadlineOptions.list()
//   - useCourses()                               -> courseOptions.list()
//   - useQueries on courseOptions.detail(c.id)   -> N × detail
// The client's `computeCurrentWeek(weeks)` runs AFTER /timetable/weeks
// resolves and only drives local state (weekPosition) — it does NOT alter the
// sessions query key. So a server-side `computeCurrentWeek` would be dead
// weight. Instead we hydrate exactly what the consumer reads so hydration
// hits — the binding constraint per PATTERNS.md correction #1 / D-B4.
//
// Critical path prefetched (all in Promise.allSettled — parallel, silent
// degrade per D-B4):
//   1. /timetable/sessions (all)       — powers TimetableGrid
//   2. /timetable/weeks                — powers week label + current-week calc
//   3. /deadlines                      — powers deadline overlay + right panel
//   4. /courses                        — powers course legend + detail fanout
//
// Inner <Suspense> preserved for any async TimetablePage subcomponents.
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import TimetablePage from "@/components/timetable/TimetablePage";
import {
  createPrefetchedPage,
  wrapSentry,
} from "@/lib/rsc/create-prefetched-page";
import { getServerApiClient } from "@/lib/rsc/server-query-fn";
import { courseOptions } from "@/hooks/use-courses";
import { deadlineOptions } from "@/hooks/use-deadlines";
import { timetableOptions } from "@/hooks/use-timetable";
import type { paths } from "@/lib/api/types.gen";

type Props = { params: Promise<{ locale: string }> };

type SessionsResponse =
  paths["/timetable/sessions"]["get"]["responses"]["200"]["content"]["application/json"];
type WeeksResponse =
  paths["/timetable/weeks"]["get"]["responses"]["200"]["content"]["application/json"];
type DeadlinesResponse =
  paths["/deadlines"]["get"]["responses"]["200"]["content"]["application/json"];
type CoursesResponse =
  paths["/courses"]["get"]["responses"]["200"]["content"]["application/json"];
type CourseDetailResponse =
  paths["/courses/{id}"]["get"]["responses"]["200"]["content"]["application/json"];

export default async function TimetableRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: (
      <Suspense>
        <TimetablePage />
      </Suspense>
    ),
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);

      // Step 1: await /courses to obtain the N courseIds for the N-fanout.
      // fetchQuery rejects on error so wrapSentry fires here for real.
      // Matches Predict's Step 1 shape and Dashboard's Wave B pattern.
      let courseIds: string[] = [];
      try {
        const coursesResp = await queryClient.fetchQuery({
          ...courseOptions.list(),
          queryFn: () => api.get("courses").json<CoursesResponse>(),
        });
        courseIds = coursesResp.data.map((c) => c.id);
      } catch (error) {
        wrapSentry("courses", userId)(error);
      }

      // Step 2: top-level independent prefetches + N × course detail fanout.
      // Sessions / weeks / deadlines-list fire in parallel with the N-fanout.
      // If Step 1 failed (courseIds === []), the N-fanout is empty but the
      // 3 top-level prefetches still fire (D-B4 silent graceful degrade).
      const prefetches: Promise<unknown>[] = [
        queryClient
          .prefetchQuery({
            ...timetableOptions.sessions(),
            queryFn: () =>
              api.get("timetable/sessions").json<SessionsResponse>(),
          })
          .catch(wrapSentry("timetable-sessions", userId)),
        queryClient
          .prefetchQuery({
            ...timetableOptions.weeks(),
            queryFn: () =>
              api.get("timetable/weeks").json<WeeksResponse>(),
          })
          .catch(wrapSentry("timetable-weeks", userId)),
        queryClient
          .prefetchQuery({
            ...deadlineOptions.list(),
            queryFn: () => api.get("deadlines").json<DeadlinesResponse>(),
          })
          .catch(wrapSentry("deadlines-list", userId)),
        ...courseIds.map((id) =>
          queryClient
            .prefetchQuery({
              ...courseOptions.detail(id),
              queryFn: () =>
                api.get(`courses/${id}`).json<CourseDetailResponse>(),
            })
            .catch(wrapSentry("course-detail", userId, { courseId: id })),
        ),
      ];
      await Promise.allSettled(prefetches);
    },
  });
}
