// Higher-order Server Component wrapper that:
//   1. Auth-gates via supabase.auth.getSession() (T-38-03). Null session ->
//      returns an empty HydrationBoundary so the client can handle redirects.
//   2. Delegates prefetch orchestration to a caller-provided `run` function,
//      passing a fresh QueryClient, the access token, and the user id.
//   3. Wires a QueryCache onError subscriber that forwards every failed
//      prefetch to Sentry with the phase-38 tag convention. This is load-
//      bearing (see DEVIATION below) because prefetchQuery resolves even on
//      error — a per-call .catch() would never fire.
//   4. Wraps the dehydrated cache in <HydrationBoundary>, yielding children
//      that will rehydrate on the client with real data pre-populated.
//   5. Silently degrades on unexpected outer failures (D-B4): if `run` throws
//      synchronously, we tag the event as rsc_prefetch_outer and still render
//      children with whatever cache made it into queryClient.
//
// DEVIATION from RESEARCH Code Example 2 (Rule 1 bug fix): TanStack's
// queryClient.prefetchQuery() ALWAYS resolves — the research's
// `.prefetchQuery(...).catch(wrapSentry(...))` never fires for prefetch
// errors. We instead wire Sentry via QueryCache `onError` which fires
// reliably for every failed query (prefetch or useQuery). The wrapSentry
// helper remains exported for explicit fetchQuery call sites (which DO
// reject on error — see Dashboard page.tsx waterfall branch).
//
// This phase establishes the Sentry tag convention
// { phase: "38", operation: "rsc_prefetch", query: <label> } — downstream
// plans (P02) reuse this helper verbatim.
import type { ReactNode } from "react";
import {
  dehydrate,
  HydrationBoundary,
  type Query,
  type QueryClient,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

const PHASE_TAG = "38";

export type PrefetchContext = {
  queryClient: QueryClient;
  accessToken: string;
  userId: string;
};

/**
 * Derive a short human-readable label from a query key, e.g.
 *   ["courses", "list", undefined]           -> "courses"
 *   ["deadlines", "upcoming"]                -> "deadlines"
 *   ["courses", "detail", "crs_001"]         -> "courses"
 *   ["ai", "study-recommendations", "latest"] -> "ai"
 * Used as the `query` tag on Sentry events so aggregations group by domain.
 */
function deriveQueryLabel(queryKey: readonly unknown[]): string {
  const first = queryKey[0];
  return typeof first === "string" && first.length > 0 ? first : "unknown";
}

export async function createPrefetchedPage({
  children,
  run,
}: {
  children: ReactNode;
  // Caller decides what to prefetch. Has access to queryClient for both
  // fetchQuery (await, use return value) and prefetchQuery (fire-and-populate).
  // Should return nothing; side effects on queryClient are the contract.
  run?: (ctx: PrefetchContext) => Promise<void>;
}): Promise<ReactNode> {
  const queryClient = getServerQueryClient();

  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user || !session.access_token) {
    // [Phase 38.1 follow-up — TEMPORARY DIAGNOSTIC BREADCRUMB]
    // Production UAT 2026-04-22 reports full-page skeleton flash on the
    // URL-entry page (first page loaded via hard refresh or direct URL).
    // Hypothesis: this null-session branch fires on hard-refresh RSC, the
    // HOF returns an empty dehydrate, client QueryClient stays cold, every
    // useQuery renders isLoading=true -> full-page skeleton.
    //
    // This breadcrumb logs the condition so Sentry can confirm or refute.
    // REMOVE once root cause is identified (either confirmed via frequent
    // null_session events on URL-entry paths, or refuted via silence).
    // Diagnostic wrapped in try/catch so it can never break the HOF.
    try {
      const hdrs = await headers();
      const pathHint =
        hdrs.get("x-invoke-path") ||
        hdrs.get("next-url") ||
        hdrs.get("referer") ||
        "unknown";
      Sentry.captureMessage("rsc_prefetch_null_session", {
        level: "warning",
        tags: {
          phase: PHASE_TAG,
          operation: "rsc_prefetch_null_session",
          has_session_user: String(!!session?.user),
          has_access_token: String(!!session?.access_token),
        },
        extra: {
          pathHint,
          userIdPresent: !!session?.user?.id,
        },
      });
    } catch {
      // Diagnostic must never break the HOF — swallow errors silently.
    }

    // Unauthed -> empty dehydrate. Client DashboardGuard handles redirect.
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        {children}
      </HydrationBoundary>
    );
  }

  const userId = session.user.id;

  // Wire per-query error capture AFTER we know userId. D-B4 silent degrade —
  // one failing prefetch must not block others; Sentry is the observability
  // channel. Consumers that want extra context (e.g. course_id on a detail
  // prefetch) can use wrapSentry on a fetchQuery .catch().
  const queryCache = queryClient.getQueryCache();
  queryCache.config.onError = (
    error: Error,
    query: Query<unknown, unknown, unknown>,
  ) => {
    Sentry.captureException(error, {
      tags: {
        phase: PHASE_TAG,
        operation: "rsc_prefetch",
        query: deriveQueryLabel(query.queryKey),
      },
      extra: {
        userId,
        queryKey: JSON.stringify(query.queryKey),
      },
    });
  };

  if (run) {
    try {
      await run({
        queryClient,
        accessToken: session.access_token,
        userId,
      });
    } catch (error) {
      // Catch-all for the entire prefetch block. Individual queries are
      // already covered by the QueryCache onError above — this branch handles
      // only truly unexpected failures (e.g. getSession throws after initial
      // success, or a run-side control-flow error).
      Sentry.captureException(error, {
        tags: { phase: PHASE_TAG, operation: "rsc_prefetch_outer" },
        extra: { userId },
      });
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}

// Reusable Sentry handler factory for per-query .catch() blocks.
// Call site pattern:
//   queryClient.prefetchQuery({...}).catch(wrapSentry("courses", userId))
// P02 imports this verbatim — do not change the tag shape without a
// coordinated migration.
export function wrapSentry(
  queryLabel: string,
  userId: string,
  extra?: Record<string, unknown>,
): (error: unknown) => void {
  return (error: unknown) => {
    Sentry.captureException(error, {
      tags: {
        phase: PHASE_TAG,
        operation: "rsc_prefetch",
        query: queryLabel,
      },
      extra: { userId, ...extra },
    });
  };
}
