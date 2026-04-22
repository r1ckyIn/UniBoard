// Deadlines RSC entry point — Phase 38 Plan 02 Task 2.
//
// 2-query parallel: D-B2 Deadlines critical path = `/deadlines` (all) for the
// timeline view + `/courses` for the course color / filter chip mapping.
//
// QueryKey parity note: the client component (DeadlinesPage.tsx) uses
// `useDeadlines()` with NO filters, which maps to `deadlineOptions.list()` =
// queryKey `["deadlines", "list", undefined]`. Prefetching via
// `deadlineOptions.list()` here matches that key exactly so hydration hits.
// (Plan text suggested `deadlineOptions.upcoming()`, but parity with the
// consumer is the binding constraint per PATTERNS.md correction #1 /
// silent-degrade invariant — mismatched keys are cache misses.)
//
// Both prefetches fire in parallel via Promise.allSettled — D-B4 silent
// graceful degrade: if one rejects, the other still hydrates.
import { setRequestLocale } from "next-intl/server";

import DeadlinesPage from "@/components/deadlines/DeadlinesPage";
import {
  createPrefetchedPage,
  wrapSentry,
} from "@/lib/rsc/create-prefetched-page";
import { getServerApiClient } from "@/lib/rsc/server-query-fn";
import { courseOptions } from "@/hooks/use-courses";
import { deadlineOptions } from "@/hooks/use-deadlines";
import type { paths } from "@/lib/api/types.gen";

type Props = { params: Promise<{ locale: string }> };

type CoursesResponse =
  paths["/courses"]["get"]["responses"]["200"]["content"]["application/json"];
type DeadlinesResponse =
  paths["/deadlines"]["get"]["responses"]["200"]["content"]["application/json"];

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: <DeadlinesPage />,
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);
      await Promise.allSettled([
        queryClient
          .prefetchQuery({
            ...courseOptions.list(),
            queryFn: () => api.get("courses").json<CoursesResponse>(),
          })
          .catch(wrapSentry("courses", userId)),
        queryClient
          .prefetchQuery({
            ...deadlineOptions.list(),
            queryFn: () => api.get("deadlines").json<DeadlinesResponse>(),
          })
          .catch(wrapSentry("deadlines-list", userId)),
      ]);
    },
  });
}
