// Courses RSC entry point — Phase 38 Plan 02 Task 1.
//
// Single-query baseline: D-B2 Courses critical path = `/courses` only.
// Grades summary is embedded in the same response consumed by useCourses.
//
// Pattern matches Dashboard (P01) verbatim:
//   - async RSC via createPrefetchedPage HOF (P01)
//   - wrapSentry .catch() defense-in-depth alongside QueryCache onError
//   - explicit `.json<T>()` type parameter (no bare `.json()`)
//   - response-shape alias rederived per-page from openapi paths
import { setRequestLocale } from "next-intl/server";

import CoursesPage from "@/components/courses/CoursesPage";
import {
  createPrefetchedPage,
  wrapSentry,
} from "@/lib/rsc/create-prefetched-page";
import { getServerApiClient } from "@/lib/rsc/server-query-fn";
import { courseOptions } from "@/hooks/use-courses";
import type { paths } from "@/lib/api/types.gen";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

type CoursesResponse =
  paths["/courses"]["get"]["responses"]["200"]["content"]["application/json"];

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: <CoursesPage />,
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);
      await queryClient
        .prefetchQuery({
          ...courseOptions.list(),
          queryFn: () => api.get("courses").json<CoursesResponse>(),
        })
        .catch(wrapSentry("courses", userId));
    },
  });
}
