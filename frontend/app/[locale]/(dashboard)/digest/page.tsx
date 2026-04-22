// Digest RSC entry point — Phase 38 Plan 02 Task 4 + Phase 38.1 Plan 02
// parity closure.
//
// Two-query parallel: DigestPage consumes useDigestLatest() AND
// useDigestHistory() (DigestPage.tsx:66-67) with NO args. Hard-refresh of
// /zh-CN/digest previously only prefetched /digest/latest — the history
// useQuery fired cold -> isLoading=true -> SkeletonCard flash in
// DigestHistoryCard. Promise.allSettled isolates failures so one rejection
// doesn't poison the other (never Promise.all per CONTEXT §Design
// constraints / D-B4).
//
// Inner <Suspense> preserved for any async DigestPage subcomponents.
import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";

import DigestPage from "@/components/digest/DigestPage";
import {
  createPrefetchedPage,
  wrapSentry,
} from "@/lib/rsc/create-prefetched-page";
import { getServerApiClient } from "@/lib/rsc/server-query-fn";
import { digestOptions } from "@/hooks/use-digest";
import type { paths } from "@/lib/api/types.gen";

type Props = { params: Promise<{ locale: string }> };

type DigestLatestResponse =
  paths["/digest/latest"]["get"]["responses"]["200"]["content"]["application/json"];
type DigestHistoryResponse =
  paths["/digest/history"]["get"]["responses"]["200"]["content"]["application/json"];

export default async function DigestRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: (
      <Suspense>
        <DigestPage />
      </Suspense>
    ),
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);
      await Promise.allSettled([
        queryClient
          .prefetchQuery({
            ...digestOptions.latest(),
            queryFn: () =>
              api.get("digest/latest").json<DigestLatestResponse>(),
          })
          .catch(wrapSentry("digest-latest", userId)),
        queryClient
          .prefetchQuery({
            // No args — queryKey ["digest", "history", undefined] must
            // match DigestPage.tsx:67 useDigestHistory() no-arg call.
            ...digestOptions.history(),
            queryFn: () =>
              api.get("digest/history").json<DigestHistoryResponse>(),
          })
          .catch(wrapSentry("digest-history", userId)),
      ]);
    },
  });
}
