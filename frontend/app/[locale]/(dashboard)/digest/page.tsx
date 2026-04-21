// Digest RSC entry point — Phase 38 Plan 02 Task 4.
//
// Single-query: D-B2 Digest critical path = `/digest/latest` only.
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

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

type DigestLatestResponse =
  paths["/digest/latest"]["get"]["responses"]["200"]["content"]["application/json"];

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
      await queryClient
        .prefetchQuery({
          ...digestOptions.latest(),
          queryFn: () =>
            api.get("digest/latest").json<DigestLatestResponse>(),
        })
        .catch(wrapSentry("digest-latest", userId));
    },
  });
}
