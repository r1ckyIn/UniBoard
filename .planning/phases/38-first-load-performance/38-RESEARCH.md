# Phase 38: First-Load Performance (RSC Prefetch + HydrationBoundary) - Research

**Researched:** 2026-04-20
**Domain:** Next.js 15 Server Components + TanStack Query v5 SSR + Playwright visual regression + Railway cold-start observability
**Confidence:** HIGH (primary stack), MEDIUM (cold-start mitigation, Sentry RSC ergonomics)

## Summary

Phase 38 converts 6 `'use client'`-heavy pages to eager RSC-prefetched + hydrated pages using the canonical TanStack Query v5 App Router pattern: per-request `QueryClient` factory → `queryClient.prefetchQuery(queryOptions())` → `<HydrationBoundary state={dehydrate(queryClient)}>`. All the right primitives already exist in-repo — `queryOptions()` factories in 12 hook files, a working BFF proxy at `frontend/app/api/v1/*`, Supabase SSR server client at `frontend/lib/supabase/server.ts`, and `@tanstack/react-query 5.91.2` (verified current via `npm view`). The gap is stitching them together on the server side.

Two findings from the code audit differ from CONTEXT.md assumptions and the planner must address them:

1. **BFF proxy forwards `Authorization` header, not cookies.** The existing client (`lib/api/client.ts`) injects `Authorization: Bearer <JWT>` from the Zustand store; `lib/api/proxy.ts:37-38` only re-forwards that header to Railway. Server-side RSC prefetch has no Zustand store — it must obtain the JWT directly from `supabase.auth.getSession()` via the SSR client and inject it into the fetch call. Forwarding `headers()` (as CONTEXT.md §code_context suggests) will NOT pass the token through the proxy because the browser never set an `Authorization` header (it's injected per-request by the `ky` client-side hook). CONTEXT.md §D-A3 is correct on intent but the mechanism is "inject JWT", not "forward cookies".
2. **There is no `middleware.ts` at `frontend/` root.** `frontend/lib/supabase/proxy.ts` exports `updateSession` but zero files import it — grep verified. CONTEXT.md claims "middleware (`middleware.ts` via `updateSession`) already refreshes Supabase session on every request" but this is currently false. If Phase 38 relies on server-side session refresh, Wave 0 must add a real `middleware.ts`. However, `createServerClient()` in a Server Component will still work without it because `@supabase/ssr` auto-refreshes tokens on `getSession()` call — middleware is an optimisation, not a requirement, for this phase.

**Primary recommendation:** Implement the reference `getServerQueryClient()` + `createPrefetchedPage()` helper in P01 against the existing Dashboard, validate with a manual UAT pass on local dev + Vercel preview, then fan out via P02 to the remaining 5 pages using wave-parallel sub-tasks. Defer cold-start mitigation until P03 confirms p95 > 2s; default to GH Actions cron-ping over Railway always-on (free). Build Playwright screenshot-diff suite as P04 once all 6 pages are stable.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Session JWT retrieval for prefetch | Frontend Server (SSR) | — | `createServerClient()` reads Supabase cookies; only the server can see HttpOnly cookies |
| Data prefetch (Courses, Deadlines, etc.) | Frontend Server (SSR) | API / Backend | SSR fetches via BFF loopback → Railway API; same data path as CSR, different entry point |
| BFF proxy auth forwarding | Frontend Server (BFF) | API / Backend | `/api/v1/*` adds `Authorization` header, forwards to Railway; same code path for SSR loopback and CSR |
| Waterfall parallelisation (Dashboard) | Frontend Server (SSR) | — | `await /deadlines/upcoming` → `Promise.all(/courses/{code})`; pure frontend orchestration per D-A4 |
| Hydration boundary | Browser / Client | Frontend Server (SSR) | `dehydrate()` runs on server, `HydrationBoundary` unboxes on client — the bridge |
| Client data consumption | Browser / Client | — | `useQuery` (existing hooks) reads hydrated cache if warm, otherwise triggers fetch as today |
| Cold-start measurement | External (GH Actions + Playwright) | API / Backend | Cold-start is an infra property of Railway; measure externally, report to `.planning/phases/38-.../coldstart-report.md` |
| Cold-start warmup (conditional) | External (GH Actions cron) | API / Backend | Scheduled `curl /healthz` keeps Railway container warm; free tier-friendly per D-A5 |
| Visual regression (P04) | Playwright (External CI) | Frontend Server (SSR) | `page.clock.install()` freezes time; screenshot-diff on first paint |
| Failure observability | Frontend Server (SSR) | External (Sentry) | `Sentry.captureException()` from RSC async function; tag `phase=38, operation=rsc_prefetch` |

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Architecture — RSC → Backend Auth**
- **D-A1:** RSC prefetch calls the backend via the existing Next.js BFF proxy (`fetch('/api/v1/...')`) introduced in Phase 30. Same-origin loopback keeps one code path between SSR and CSR.
- **D-A2:** Server-side `QueryClient` factory lives in `frontend/lib/query/server.ts` (new), matches client defaults (`staleTime: 5min`, `retry: 1`), created per-request (not cached).
- **D-A3:** Auth gate — call `createServerClient()` from `frontend/lib/supabase/server.ts`; if `getUser()` is null, skip prefetch and let the page render with empty `dehydrate()`. Client-side auth guard still handles redirect.

**Dashboard Waterfall (Success #3)**
- **D-A4:** Solve via **frontend RSC `Promise.all`** parallelisation — NOT a backend schema change. Dashboard awaits `/deadlines/upcoming` once, then parallelises `/courses/{code}` fetches for the top-N courses using `Promise.all([...])`.

**Railway Cold-Start (Success #4)**
- **D-A5:** Measure first, mitigate if needed. P03 produces a Playwright-driven measurement script; N=10 runs after 15-min idle; records p50/p95 into `coldstart-report.md`. If p95 >2s, add GitHub Actions cron (10-min lightweight `/healthz` ping). Do NOT upgrade to Railway paid "always-on".

**Prefetch Scope**
- **D-B1:** Critical-path full prefetch (not hero-only, not streaming). Streaming via `<Suspense>` deferred to hypothetical Phase 38.1.
- **D-B2: Per-page critical path** (queries to prefetch on server):
  - **Dashboard** — `/courses`, `/deadlines/upcoming`, `/courses/{nearestCourseCode}` (Promise.all after deadlines), + Phase 34 study-rec hero query
  - **Courses** — `/courses` (with grades summary embedded)
  - **Deadlines** — `/deadlines/upcoming?mode=all` + `/courses`
  - **Predict** — `/courses` + ALL N × `/courses/{code}/detail` + ALL N × `/courses/{code}/roi` in parallel
  - **Digest** — `/digest/latest`
  - **Timetable** — `/timetable/sessions?week={current}` + `/deadlines/upcoming`
- **D-B3:** Predict N-fanout = full (N × 2 endpoints in parallel on server).
- **D-B4:** Silent graceful degrade on prefetch failure. `queryClient.prefetchQuery()` rejection → catch per-query, dehydrate what succeeded. Client `useQuery` refetches. Do NOT throw to `error.tsx`. Log via Sentry with `phase: 38, operation: rsc_prefetch`.

**Verification (Success #2)**
- **D-C1:** Dual verification — Playwright pixel-diff (P04) + manual UAT (Vercel preview walkthrough).
- **D-C2:** Pixel-diff (not DOM-only, not LCP metric).
- **D-C3:** All 6 pages.
- **D-C4 (Claude's Discretion — Playwright setup):**
  - Test account: `perf-test@uniboard.uk`, seeded 3-course + fixed deadline fixture via one-time SQL migration
  - Time freeze: Playwright 1.45+ `page.clock.install({ time: '2026-04-01T08:00:00+10:00' })`
  - Locale: `zh-CN` only (primary). `en` stays in manual UAT.
  - Diff tolerance: `maxDiffPixelRatio: 0.02`
  - Baseline storage: `frontend/tests/e2e/perf/__screenshots__/` (committed)
  - CI trigger: `pull_request.paths` includes `frontend/**`

**Plan Structure**
- **D-D1:** 4 plans:
  - **P01** — Infra + Dashboard reference implementation (one plan, one PR)
  - **P02** — Remaining 5 pages in one plan with 5 wave-parallel sub-tasks
  - **P03** — Railway cold-start measurement + conditional warmup cron
  - **P04** — Playwright screenshot-diff suite (all 6 pages + fixture seed SQL)
- **D-D2:** P02 = wave-parallel inside one plan.
- **D-D3:** Playwright spec = independent **P04** after functional landing.
- **D-D4:** No feature flag. Silent degrade means failure = today's behaviour.

### Claude's Discretion

- Playwright configuration details (viewport sizes, browser version, CI caching, fixture seed DDL) — fall within D-C4 scope, recommend sensible defaults.
- `getServerQueryClient()` and `createPrefetchedPage()` helper API shape — not locked; this research recommends the exact signatures in §Code Examples.
- Cold-start measurement implementation (Playwright-driven vs. bash `curl`) — leaning Playwright+jest-runner for CI compatibility, see §Pitfalls.
- Sentry tag schema beyond `phase=38, operation=rsc_prefetch` — add `query_key` and `user_id_hash` for debuggability.

### Deferred Ideas (OUT OF SCOPE)

- Backend aggregation of `assessment_weights` into `/deadlines/upcoming` — deferred; revisit if N+1 Promise.all becomes p95 bottleneck.
- Streaming with React Suspense boundaries per region — deferred to hypothetical Phase 38.1.
- Partial Prerendering (PPR) — experimental in Next 15; not production-ready for user-specific data.
- `en` locale Playwright coverage — manual UAT only.
- LCP / Core Web Vitals instrumentation — Vercel Analytics already provides RUM.
- Sentry Performance tracing on RSC prefetch spans — opportunistic add-on post-launch.
- Settings page — different data characteristics; 38.x follow-up candidate.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | First paint shows real data across 6 card-heavy pages on cached-auth revisit (no SkeletonCard flash) | §Pattern 1 RSC prefetch + §Pattern 2 HydrationBoundary; §Code Example 1-3 (server QueryClient, createPrefetchedPage HOF, dashboard page) |
| PERF-02 | Dashboard `/deadlines/upcoming → /courses/{nearest}` serial waterfall eliminated | §Pattern 3 Dashboard waterfall collapse via `Promise.all`; §Code Example 4 (waterfall fix shape) |
| PERF-03 | Railway cold-start p50/p95 characterised; warmup strategy in place if p95 > 2s | §Pattern 5 Cold-start measurement; §Code Example 6 (GH Actions cron); §Pitfall 5 (avoiding false-positive from dev-server warm path) |

## Project Constraints (from CLAUDE.md)

- Code comments must be **English only** (no bilingual, no Chinese). Applies to all new `.ts/.tsx` and scripts.
- Chinese for discussion; English for code + API contracts.
- `mypy --strict` (backend — not relevant to Phase 38 which is frontend-only).
- `tsc --noEmit` and `ESLint --max-warnings 0` must remain clean (CI gate via `.github/workflows/frontend-ci.yml`).
- TDD mode is active for Phase 38 — tests land in RED state first, implementation drives them to GREEN.
- pnpm 9+ (project uses 10.28.2).
- No direct `git commit -m` — use `/commit` skill or GSD's commit pipeline.
- PR cycle must include `/simplify` before merge (feedback stored in `~/.claude/projects/-Users-qinyuan-claude-r1ckyIn-GitHub-UniBoard/memory/`).
- Openapi.yaml is the single source of truth for `types.gen.d.ts` — regenerate via `pnpm generate:types`, never hand-edit.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tanstack/react-query` | `5.91.2` (installed) — latest `5.99.2` (verified via `npm view`, 2026-04) | Server cache + client hydration | **[VERIFIED: package.json]** Already used in 12 hooks via `queryOptions()`. No bump needed for Phase 38 — v5.91 has full `HydrationBoundary` + `dehydrate` APIs |
| `next` | `15.5.14` (installed) — latest `16.2.4` (verified via `npm view`) | App Router with async RSC + `async headers()/cookies()` | **[VERIFIED: package.json + npm view]** Phase 38 uses v15-specific `headers()` async + Route Segment Config `dynamic = 'force-dynamic'`. Stay on 15.x — Next.js 16 removed `dynamic` route segment config (regression for this phase) |
| `@supabase/ssr` | `0.9.0` (installed) | Cookie-based server auth | **[VERIFIED: package.json]** `createServerClient()` reads HttpOnly cookies in RSC; auto-refreshes. Already in use. |
| `@sentry/nextjs` | `10.47.0` (installed) — latest `10.49.0` | RSC error telemetry | **[VERIFIED: package.json + npm view]** `Sentry.captureException()` works from async Server Components (confirmed via Sentry docs); no extra setup needed beyond existing `instrumentation.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@playwright/test` | `1.59.1` (latest, verified `npm view`) — new install | Visual regression (P04) | `page.clock.install()` requires 1.45+ (per D-C4). Install in `frontend/` as devDep for P04 |
| `zustand` (for SSR state) | `5.0.12` (already installed) | N/A — DO NOT use on server | Client-only. Server RSC reads JWT from `supabase.auth.getSession()` directly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `HydrationBoundary` per-page | `HydrationBoundary` at root layout | Root-level would hydrate all pages' cache into every page — wasteful + cross-page cache leak risk. Per-page is TanStack's documented pattern. |
| `fetchQuery()` returning data | `prefetchQuery()` firing and not awaiting result for streaming | `prefetchQuery()` is the recommended pattern for SSR-with-hydration; `fetchQuery()` would block render. [CITED: tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr] |
| Direct Railway URL from RSC | BFF proxy loopback (`/api/v1/...`) | D-A1 locks BFF. Tradeoff: +1 hop (~5ms on Vercel), but same code path server/client + single point of auth forwarding. |
| Playwright screenshot-diff | Lighthouse LCP metric | User reads success #2 literally ("no skeleton visible to naked eye") — only pixel-diff catches this (D-C2 locked). LCP is good for trend but not "no skeleton" assertion. |
| GH Actions cron ping | Railway "always-on" paid tier | D-A5 prefers free. Cron ping every 10 min = 144 pings/day, under free GH Actions minutes budget. |

**Installation:**
```bash
# No new runtime deps — everything needed is installed
cd frontend

# P04 only: Playwright dev dep
pnpm add -D @playwright/test @playwright/experimental-ct-react
pnpm exec playwright install chromium --with-deps
```

**Version verification (completed 2026-04-20):**
- `@tanstack/react-query`: installed `5.91.2`, latest `5.99.2` — no upgrade needed
- `next`: installed `15.5.14`, latest `16.2.4` — **DO NOT upgrade** (Next.js 16 removed `dynamic` route segment config)
- `@sentry/nextjs`: installed `10.47.0`, latest `10.49.0` — minor gap, optional upgrade
- `@playwright/test`: not installed, latest `1.59.1` — install for P04

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Browser (Vercel-served Next.js)                    │
│                                                                      │
│   Request ──► page.tsx (RSC, async Server Component)                │
│                 │                                                    │
│                 ├─► getServerQueryClient() ──► new QueryClient()    │
│                 │   (per-request, NOT cached)                        │
│                 │                                                    │
│                 ├─► createClient() (@supabase/ssr)                  │
│                 │    └─► supabase.auth.getUser()                    │
│                 │         │                                          │
│                 │         ├─► null ──► skip prefetch                │
│                 │         │             (empty dehydrate)            │
│                 │         │                                          │
│                 │         └─► user present ──┐                      │
│                 │                            ▼                       │
│                 ├─► session = await getSession()                    │
│                 │   accessToken = session.access_token              │
│                 │                                                    │
│                 ├─► Promise.allSettled([                            │
│                 │      qc.prefetchQuery({ queryKey, queryFn })      │
│                 │      for each critical-path query                 │
│                 │    ])                                              │
│                 │       │                                            │
│                 │       └─► Each queryFn does:                      │
│                 │           fetch(                                  │
│                 │             `${origin}/api/v1/...`,               │
│                 │             { headers: {                          │
│                 │                 Authorization: `Bearer ${token}`  │
│                 │             } }                                    │
│                 │           )                                        │
│                 │              │                                    │
│                 │              ▼                                    │
│                 │       ┌───────────────────────────┐              │
│                 │       │ BFF proxy (route handler) │              │
│                 │       │ /api/v1/courses/route.ts  │              │
│                 │       │   proxyRequest(req)        │              │
│                 │       │   → forwards Authorization │              │
│                 │       │   to Railway backend       │              │
│                 │       └───────────────────────────┘              │
│                 │              │                                    │
│                 │              ▼                                    │
│                 │       Railway Python FastAPI                     │
│                 │       Supabase JWT validation                    │
│                 │       returns JSON                                │
│                 │              │                                    │
│                 │              ▼                                    │
│                 │       queryClient cache populated                 │
│                 │                                                    │
│                 ├─► return (                                        │
│                 │     <HydrationBoundary state={dehydrate(qc)}>    │
│                 │       <DashboardPage />  (client component)      │
│                 │     </HydrationBoundary>                          │
│                 │   )                                                │
│                 │                                                    │
│   Response ◄────┘                                                   │
│   (HTML + dehydrated cache embedded as <script>)                    │
│                                                                      │
│   Client-side:                                                      │
│   QueryProvider (useState(makeQueryClient))                         │
│    ├─► HydrationBoundary reads dehydrated state                    │
│    ├─► cache warm BEFORE first render                               │
│    └─► <DashboardPage> uses useQuery(courseOptions.list())         │
│        → returns cached data immediately → NO SkeletonCard flash   │
└─────────────────────────────────────────────────────────────────────┘

Failure path (D-B4 silent degrade):
  prefetchQuery rejects → Promise.allSettled isolates → Sentry captures
  → other queries still dehydrate → client useQuery refetches the
  missing one → SkeletonCard flashes for that one card only
  → NEVER throws to error.tsx
```

**Data flow characteristics:**
- Same data path (BFF → Railway) for SSR and CSR — no code duplication in `queryFn`
- Per-request `QueryClient` prevents cross-user data leakage (TanStack's documented NEVER-DO-THIS warning)
- Silent graceful degrade at query granularity, not page granularity
- No new external services; all hooks live in Next.js runtime on Vercel

### Component Responsibilities

| File | Role | New? |
|------|------|------|
| `frontend/lib/query/server.ts` | `getServerQueryClient()` factory + `makeQueryClient()` shared with client | **NEW** |
| `frontend/lib/query/client.tsx` | Client `QueryProvider` — use existing defaults in server factory | unchanged |
| `frontend/lib/rsc/createPrefetchedPage.ts` | Higher-order helper that gates on auth, runs `Promise.allSettled` on prefetch queries, returns `HydrationBoundary`-wrapped JSX | **NEW** |
| `frontend/lib/rsc/getSessionToken.ts` | Extracts JWT from `supabase.auth.getSession()` for server-side `Authorization` header injection | **NEW** |
| `frontend/app/[locale]/(dashboard)/page.tsx` | Dashboard RSC entry — use `createPrefetchedPage` with dashboard queries | rewritten |
| `frontend/app/[locale]/(dashboard)/courses/page.tsx` | Same pattern for Courses | rewritten |
| `frontend/app/[locale]/(dashboard)/deadlines/page.tsx` | Same pattern for Deadlines | rewritten |
| `frontend/app/[locale]/(dashboard)/predict/page.tsx` | Dashboard pattern + N-fanout `Promise.all([details..., rois...])` | rewritten |
| `frontend/app/[locale]/(dashboard)/digest/page.tsx` | Single-query prefetch | rewritten |
| `frontend/app/[locale]/(dashboard)/timetable/page.tsx` | 2-query prefetch with current week computation | rewritten |
| `frontend/hooks/use-*.ts` | `queryOptions()` factories — already in place for all 12 hooks; server reuses these | **no change** |
| `frontend/lib/api/client.ts` (ky) | Client-only — server uses a separate fetch shim in `queryFn` for server context | unchanged, but `queryOptions().queryFn` must work on both runtimes |
| `frontend/app/api/v1/*/route.ts` | BFF proxy handlers — forward `Authorization` header to Railway | **no change** |
| `frontend/tests/e2e/perf/*.spec.ts` | Playwright screenshot-diff suite for all 6 pages | **NEW (P04)** |
| `frontend/tests/e2e/perf/fixtures/*.sql` | Seed SQL for `perf-test@uniboard.uk` fixture | **NEW (P04)** |
| `.github/workflows/frontend-ci.yml` | Add `playwright test` step with `paths: frontend/**` | modified |
| `.github/workflows/railway-warmup.yml` | GH Actions cron — conditional on P03 measurement | **NEW if P03 says yes** |
| `.planning/phases/38-first-load-performance/coldstart-report.md` | Cold-start measurement output | **NEW (P03)** |

### Recommended Project Structure

```
frontend/
├── app/
│   └── [locale]/
│       └── (dashboard)/
│           ├── page.tsx                    # Dashboard RSC — prefetch + HydrationBoundary
│           ├── courses/page.tsx            # same pattern
│           ├── deadlines/page.tsx          # same pattern
│           ├── predict/page.tsx            # same pattern + N-fanout
│           ├── digest/page.tsx             # single-query
│           └── timetable/page.tsx          # 2-query + current-week
│
├── lib/
│   ├── query/
│   │   ├── client.tsx                      # existing, unchanged
│   │   └── server.ts                       # NEW: getServerQueryClient + makeQueryClient
│   ├── rsc/
│   │   ├── createPrefetchedPage.ts         # NEW: HOF for prefetch + HydrationBoundary
│   │   ├── getSessionToken.ts              # NEW: JWT extraction from supabase session
│   │   └── serverQueryFn.ts                # NEW: fetch shim for server-side queryFn (injects JWT)
│   ├── api/
│   │   ├── client.ts                       # existing ky client (CSR)
│   │   └── proxy.ts                        # existing BFF proxy (unchanged)
│   └── supabase/
│       ├── server.ts                       # existing createServerClient()
│       └── proxy.ts                        # updateSession (unused today — optional Wave 0 middleware add)
│
├── hooks/                                  # existing queryOptions() factories — no change
│   ├── use-courses.ts
│   ├── use-deadlines.ts
│   ├── use-digest.ts
│   ├── use-timetable.ts
│   ├── use-roi.ts
│   └── ...
│
└── tests/
    └── e2e/
        └── perf/
            ├── playwright.config.ts        # NEW (P04)
            ├── fixtures/
            │   └── seed-perf-test-user.sql # NEW (P04)
            ├── dashboard.spec.ts           # NEW (P04)
            ├── courses.spec.ts
            ├── deadlines.spec.ts
            ├── predict.spec.ts
            ├── digest.spec.ts
            ├── timetable.spec.ts
            └── __screenshots__/            # committed pixel-baseline images
```

### Pattern 1: Per-Request QueryClient Factory (server)

**What:** Single factory that returns a fresh `QueryClient` for each server request, shared with the client via module re-export for isomorphic access. **Per-request** is the non-negotiable invariant — TanStack documents it as `NEVER DO THIS: creating queryClient at file root level ... leaks any sensitive data`.

**When to use:** Every Server Component that prefetches. Never hoist or cache.

**Example:**
```typescript
// frontend/lib/query/server.ts
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
import { QueryClient, isServer } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 min (mirror client.tsx)
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

// Server: always fresh. Client: singleton via useState in QueryProvider.
// This function is only called on the server. Client path uses makeQueryClient
// directly inside useState() in client.tsx.
export function getServerQueryClient(): QueryClient {
  if (!isServer) {
    throw new Error(
      "getServerQueryClient() called on client — use useQueryClient() inside a component instead",
    );
  }
  return makeQueryClient();
}
```

### Pattern 2: Prefetch + HydrationBoundary Wrapper (HOF)

**What:** A Higher-Order helper that accepts a list of `queryOptions()` and returns a ready-to-render JSX tree. Encapsulates auth gating, per-query error isolation, Sentry reporting, and `HydrationBoundary` wrapping.

**When to use:** Every one of the 6 pages. Keep logic in the helper, keep page.tsx files declarative.

**Example:**
```typescript
// frontend/lib/rsc/createPrefetchedPage.ts
import type { ReactNode } from "react";
import {
  dehydrate,
  HydrationBoundary,
  type FetchQueryOptions,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

/**
 * Wraps a client component with server-side prefetched TanStack cache.
 * - Gates on Supabase auth.getUser() (D-A3)
 * - Runs prefetch via Promise.allSettled for per-query isolation (D-B4)
 * - Logs failures to Sentry with phase=38, operation=rsc_prefetch
 * - Renders HydrationBoundary around children
 */
export async function createPrefetchedPage({
  queries,
  children,
}: {
  // Callback receives an authenticated QueryClient and the session token.
  // Returns the list of prefetch promises to run in parallel.
  queries: (ctx: {
    accessToken: string;
    userId: string;
  }) => Array<FetchQueryOptions<unknown, Error, unknown, readonly unknown[]>>;
  children: ReactNode;
}): Promise<ReactNode> {
  const queryClient = getServerQueryClient();

  const supabase = await createSupabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // D-A3: null user → empty dehydrate, let client decide (redirect or skeleton)
  if (!session?.user || !session.access_token) {
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        {children}
      </HydrationBoundary>
    );
  }

  const prefetchOptions = queries({
    accessToken: session.access_token,
    userId: session.user.id,
  });

  // D-B4: silent degrade — one query failing must not block others
  const results = await Promise.allSettled(
    prefetchOptions.map((opts) => queryClient.prefetchQuery(opts)),
  );

  for (const [i, result] of results.entries()) {
    if (result.status === "rejected") {
      Sentry.captureException(result.reason, {
        tags: {
          phase: "38",
          operation: "rsc_prefetch",
        },
        extra: {
          queryKey: JSON.stringify(prefetchOptions[i]?.queryKey ?? null),
          userId: session.user.id,
        },
      });
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
```

### Pattern 3: Dashboard Waterfall Collapse via Promise.all (D-A4)

**What:** Dashboard must await `/deadlines/upcoming` first (need nearest course code), then parallelise per-course detail fetches. The naïve sequential version is the exact waterfall PERF-02 is set to eliminate.

**When to use:** Dashboard only. Other pages don't have this dependency shape.

**Example:**
```typescript
// Inside the createPrefetchedPage({ queries }) callback for Dashboard
import { courseOptions } from "@/hooks/use-courses";
import { deadlineOptions } from "@/hooks/use-deadlines";
import { studyRecOptions } from "@/hooks/use-study-recommendations";

// queries callback must accept accessToken; queryFn uses it via serverQueryFn shim.
queries: async ({ accessToken }) => {
  // Step 1: kick off queries that have no dependency
  const nonDependent = [
    courseOptions.list(),
    deadlineOptions.upcoming(),
    studyRecOptions.main(),
  ];

  // Step 2: fetch the upcoming deadlines ONCE (await to discover nearest course code)
  const upcoming = await queryClient.fetchQuery(deadlineOptions.upcoming());
  const nearestCourseCode =
    upcoming.data?.filter((d) => d.days_remaining >= 0)[0]?.course_code ??
    null;

  // Step 3: if we know the nearest course, prefetch its detail in parallel with non-dependent ones
  if (nearestCourseCode) {
    const coursesList = await queryClient.fetchQuery(courseOptions.list());
    const nearestCourseId =
      coursesList.data.find((c) => c.code === nearestCourseCode)?.id ?? null;

    if (nearestCourseId) {
      return [...nonDependent, courseOptions.detail(nearestCourseId)];
    }
  }
  return nonDependent;
};
```

**Note on sub-variant:** The `createPrefetchedPage` helper as drafted in Pattern 2 takes a *list* of queries. For Dashboard's dependency, extend the helper to accept an `async` callback that can call `fetchQuery` mid-stream. The planner should refine the helper API during P01 so the Dashboard case is elegant rather than special-cased. A reasonable alternative is to handle Dashboard's waterfall inside its page.tsx directly (bypass the helper for this one page) while keeping the other 5 pages on the HOF.

### Pattern 4: Predict Page Full N-Fanout (D-B3)

**What:** Predict needs `/courses`, then ALL N × `/courses/{code}/detail`, then ALL N × `/courses/{code}/roi` in parallel. Total = 1 + 2N prefetches.

**When to use:** Predict only.

**Example:**
```typescript
queries: async ({ accessToken }) => {
  const courses = await queryClient.fetchQuery(courseOptions.list());
  const courseIds = courses.data.map((c) => c.id);

  return [
    courseOptions.list(), // re-prefetch for dehydrate (already cached)
    ...courseIds.map((id) => courseOptions.detail(id)),
    ...courseIds.map((id) => roiOptions.course(id)),
  ];
};
```

Tradeoff accepted per D-B3: cold-start amplifies N × 2 requests. D-A5 addresses it.

### Pattern 5: Server-side fetch shim with JWT injection

**What:** `queryOptions().queryFn` today uses `ky` client which reads JWT from Zustand. That doesn't work on the server — Zustand is client-only. Solution: shared `serverQueryFn()` helper the hooks call when `isServer === true`.

**Actually, simpler approach:** Keep `queryFn` unchanged in hooks. Override at prefetch time via `queryFn` in the `FetchQueryOptions` passed to `prefetchQuery`. The `queryOptions()` factory return is spreadable.

**Recommended — dual-runtime queryFn:**
```typescript
// frontend/lib/rsc/serverQueryFn.ts
import ky from "ky";
import { headers as nextHeaders } from "next/headers";

/**
 * Build a ky-like client for server-side queryFn calls.
 * Injects Authorization manually (no Zustand on server) and resolves
 * same-origin URL from next/headers so fetch('/api/v1/...') works.
 */
export async function getServerApiClient(accessToken: string) {
  const h = await nextHeaders();
  const host = h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return ky.create({
    prefixUrl: `${origin}/api/v1`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    timeout: 15000,
  });
}
```

Then the `queries` callback in `createPrefetchedPage` can construct a server-specific `queryFn` that uses `getServerApiClient(accessToken)` and preserves the same `queryKey` as the hook's `queryOptions()`:

```typescript
// Inside createPrefetchedPage queries callback:
const serverApi = await getServerApiClient(accessToken);
return [
  {
    ...courseOptions.list(),
    queryFn: () => serverApi.get("courses").json(),
  },
  // ...
];
```

Because `queryKey` matches the client hook exactly, hydration transparently serves the client's first `useQuery` call.

### Anti-Patterns to Avoid

- **Hoisting `QueryClient` to module scope or `React.cache()`-wrapping it** → TanStack's documented "NEVER DO THIS". Cross-request data leak. [CITED: tanstack.com/query SSR guide]
- **Wrapping `HydrationBoundary` at `layout.tsx` instead of page.tsx** → hydrates all pages' cache into every route, wastes bandwidth, risks stale cross-page data. Per-page is the documented pattern.
- **Calling `queryClient.fetchQuery()` for data the RSC intends to render directly** → TanStack docs: "Server Components as a place to prefetch data, nothing more". Phase 38 uses `prefetchQuery` (fire-and-populate-cache) except for the Dashboard waterfall where `fetchQuery` is needed to branch. Keep `fetchQuery` scoped to control-flow decisions.
- **Forwarding browser `headers()` to BFF proxy** (as CONTEXT.md §code_context suggests) → The browser never sends `Authorization` header; it's injected by `ky` client-side. `headers()` forward would pass the Supabase cookie instead, but BFF expects Bearer token. **Use `getSessionToken()` from SSR client and inject Authorization manually.**
- **Throwing from a prefetch failure** → Breaks silent degrade (D-B4). Wrap every `prefetchQuery` in `Promise.allSettled`.
- **Using Next.js 16 (`next@^16`)** → removed `export const dynamic` (regression). Stay on `15.5.14`.
- **Skipping `export const dynamic = 'force-dynamic'` thinking cookies() opts in implicitly** → It does opt in implicitly (Next.js docs: "Using it [headers()] will opt a route into dynamic rendering"), but explicit is safer and more readable. Add it to all 6 pages.
- **Not calling `pnpm generate:types` when BFF proxy response shape shifts** → types.gen.d.ts drift → runtime data mismatch. Enforced by team memo.
- **Hand-rolling a "prefetch failed → show fallback" custom boundary** → `HydrationBoundary` + `useQuery` handles this natively. Don't reinvent.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-to-client cache hydration | Custom `JSON.stringify(cache)` → `<script id="cache">` → `window.__CACHE__` boot hook | `dehydrate(queryClient)` + `<HydrationBoundary>` from `@tanstack/react-query` | Handles pending/success/error states, `queryKey` matching, cache version bumps, Suspense integration automatically |
| Per-request QueryClient factory | `new QueryClient()` inside each page.tsx | `getServerQueryClient()` exported from `lib/query/server.ts` | Centralise defaults (staleTime, retry) — drift between client and server causes subtle "works on local, flashes in prod" bugs |
| Auth-gated prefetch | `try { ... } catch { redirect('/auth') }` inside each page.tsx | `supabase.auth.getSession()` in the `createPrefetchedPage` HOF + null-check early return | D-A3 lockdown — one place to change auth logic |
| Parallel error isolation | `try/catch` around every `await prefetchQuery()` in every page.tsx | `Promise.allSettled` in the HOF | One-line isolation for all pages, uniform Sentry reporting |
| Session JWT retrieval on server | Read Supabase cookie name manually, parse JWT | `supabase.auth.getSession()` via `@supabase/ssr` | Supabase lib handles token refresh, cookie parsing, signature verification |
| Cookie/header forwarding to BFF | Parse `request.headers` manually in a custom middleware | BFF proxy already forwards `Authorization` — inject it from session | Existing Phase 30 infrastructure, no changes needed |
| Visual regression framework | `png-js` + `pixelmatch` + custom runner | Playwright's built-in `toHaveScreenshot({ maxDiffPixelRatio })` | Handles viewport consistency, timing stabilisation (`page.clock`), per-OS baseline storage, CI artefacts |
| Cold-start warmup daemon | Custom always-on container or systemd timer | GH Actions scheduled workflow calling `curl $RAILWAY_URL/healthz` | Free, observable, disableable via repo commit |
| Cold-start measurement harness | Custom Node script with manual timestamp diffing | `@playwright/test` with `expect.poll` + `test.describe('cold-start', { tag: '@perf' })` + CSV reporter | Re-uses P04 infrastructure, CI-runnable, reproducible |
| Fixture data seed | Manual Supabase Studio clicks | Committed `seed-perf-test-user.sql` run via `supabase db push --linked` or `psql` | Reproducible across environments, version-controlled, peer-reviewable |

**Key insight:** Phase 38 is a *plumbing* phase — 95% of the primitives exist (TanStack queryOptions, Supabase SSR, BFF proxy, openapi-generated types, hooks with query keys). The work is wiring them into a new server-side entry point, not inventing new abstractions. The `createPrefetchedPage()` HOF exists specifically to keep the wiring DRY across 6 pages.

## Runtime State Inventory

Phase 38 is NOT a rename / refactor / migration phase — no stored state to audit. Skipping.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | Next.js build + CI | ✓ | 22.x (CI) | — |
| pnpm 10.28.2 | Package manager | ✓ | 10.28.2 | — |
| Next.js 15.5.14 | App Router async RSC | ✓ (installed) | 15.5.14 | — |
| `@tanstack/react-query 5.91.2` | Server QueryClient + HydrationBoundary | ✓ | 5.91.2 | — |
| `@supabase/ssr 0.9.0` | Server auth | ✓ | 0.9.0 | — |
| `@sentry/nextjs 10.47.0` | RSC error reporting | ✓ | 10.47.0 | — |
| Railway backend `/healthz` endpoint | P03 cold-start probe | **UNKNOWN — verify** | — | If absent: P03 adds a trivial healthz endpoint as Wave 0 task |
| Supabase CLI for fixture seed | P04 — `psql` or `supabase db push` | **UNKNOWN — verify** | — | Fallback: hand-run SQL via Supabase Studio one-time |
| Playwright + Chromium | P04 visual regression | ✗ (not installed) | — | Install as part of P04 Wave 0 |
| GitHub Actions with `schedule` trigger | Cold-start warmup cron (conditional on P03) | ✓ (repo is on GitHub) | — | — |
| `perf-test@uniboard.uk` Supabase account | P04 fixture account | **NEEDS CREATION** | — | Plan fixture seed + signup as a Wave 0 task of P04 |

**Missing dependencies with no fallback:**
- None — all gaps have a fallback or a Wave 0 task to close.

**Missing dependencies with fallback:**
- Playwright: install in P04 Wave 0.
- `perf-test@uniboard.uk` account: create via a committed SQL seed in P04 Wave 0.
- `/healthz` on Railway (if not already): add a simple route before P03 runs the measurement.

## Validation Architecture

> Nyquist validation enabled (`workflow.nyquist_validation` not set to false in `.planning/config.json`).

### Test Framework

| Property | Value |
|----------|-------|
| Unit framework | Vitest 4.1.0 (via `frontend/vitest.config.ts`) |
| Unit setup file | `frontend/src/test/setup.ts` |
| Unit config file | `frontend/vitest.config.ts` |
| E2E framework | Playwright — `@playwright/test 1.59.1` (new install for P04) |
| E2E config file | `frontend/tests/e2e/perf/playwright.config.ts` (NEW, P04) |
| Quick unit run | `cd frontend && pnpm test __tests__/query __tests__/rsc` (run only relevant suite) |
| Full unit run | `cd frontend && pnpm test` |
| Type check | `cd frontend && pnpm typecheck` |
| Lint | `cd frontend && pnpm lint` |
| E2E full | `cd frontend && pnpm exec playwright test tests/e2e/perf` |
| E2E update baselines | `cd frontend && pnpm exec playwright test tests/e2e/perf --update-snapshots` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PERF-01 | `getServerQueryClient()` returns a fresh QueryClient every call on server | unit | `pnpm test __tests__/query/server.test.ts -x` | ❌ Wave 0 |
| PERF-01 | `getServerQueryClient()` mirrors client default options (staleTime 5min, retry 1, refetchOnWindowFocus false) | unit | `pnpm test __tests__/query/server.test.ts -x` | ❌ Wave 0 |
| PERF-01 | `createPrefetchedPage` returns `HydrationBoundary` wrapping children when authed | unit | `pnpm test __tests__/rsc/createPrefetchedPage.test.tsx -x` | ❌ Wave 0 |
| PERF-01 | `createPrefetchedPage` returns empty-dehydrate when `getUser()` is null | unit | `pnpm test __tests__/rsc/createPrefetchedPage.test.tsx -x` | ❌ Wave 0 |
| PERF-01 | `createPrefetchedPage` isolates per-query rejection and reports to Sentry | unit | `pnpm test __tests__/rsc/createPrefetchedPage.test.tsx -x` | ❌ Wave 0 |
| PERF-01 | Each of the 6 pages uses `createPrefetchedPage` (or explicit prefetch + HydrationBoundary for dashboard) | static analysis | `grep -r 'HydrationBoundary' frontend/app/\[locale\]/\(dashboard\)/*/page.tsx \| wc -l` should be `>= 6` | ❌ P01/P02 |
| PERF-01 | On cached-auth revisit, first paint shows real data, no SkeletonCard visible | Playwright pixel-diff | `pnpm exec playwright test tests/e2e/perf/dashboard.spec.ts` | ❌ P04 |
| PERF-01 | Same for Courses, Deadlines, Predict, Digest, Timetable | Playwright pixel-diff | `pnpm exec playwright test tests/e2e/perf` | ❌ P04 |
| PERF-01 | Manual UAT on Vercel preview (en + zh-CN, all 6 pages) | manual-only | — (human walkthrough recorded in UAT.md) | — |
| PERF-02 | Dashboard's RSC waterfall collapsed — no sequential `await fetchQuery` chain longer than length 2 | RSC code audit | `grep -c 'await.*fetchQuery' frontend/app/\[locale\]/\(dashboard\)/page.tsx` should be `<= 2` | ❌ P01 |
| PERF-02 | Dashboard top-N course detail prefetches fire in parallel | unit | `pnpm test __tests__/rsc/dashboard-prefetch.test.ts -x` (assert `Promise.all` receives array of N items) | ❌ P01 |
| PERF-02 | Dashboard on first paint shows assessment donut for nearest course — no skeleton flash | Playwright pixel-diff | covered by PERF-01 dashboard.spec.ts | ❌ P04 |
| PERF-03 | `coldstart-report.md` exists with p50 + p95 for N=10 runs | artefact check | `ls .planning/phases/38-first-load-performance/coldstart-report.md` | ❌ P03 |
| PERF-03 | If p95 > 2s, `.github/workflows/railway-warmup.yml` exists with 10-min cron | conditional artefact check | `test -f .github/workflows/railway-warmup.yml` (if report says warmup needed) | ❌ P03 conditional |
| PERF-03 | Cold-start measurement script is re-runnable | manual | `pnpm exec playwright test tests/e2e/perf/coldstart.spec.ts` (tag `@cold`, skipped in regular CI) | ❌ P03 |
| Success #5 | `.planning/ROADMAP_BACKLOG.md` (or equivalent) has backlog 999.2 marked obsolete OR retained with documented residual case | artefact update | `grep -A3 '999.2' .planning/ROADMAP.md` should show post-Phase 38 decision | ❌ P01 or post-UAT |

### Sampling Rate

- **Per task commit (TDD RED-GREEN cycle):** `pnpm test __tests__/query __tests__/rsc -x` + `pnpm typecheck` + `pnpm lint`
- **Per wave merge:** `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
- **Per plan ship:** above + `pnpm exec playwright test tests/e2e/perf` (after P04 lands)
- **Phase gate:** full suite + Playwright full + manual UAT on Vercel preview green

### Wave 0 Gaps

- [ ] `frontend/__tests__/query/server.test.ts` — covers `makeQueryClient()` / `getServerQueryClient()` per-request isolation + defaults
- [ ] `frontend/__tests__/rsc/createPrefetchedPage.test.tsx` — covers auth gate, `Promise.allSettled` isolation, Sentry capture
- [ ] `frontend/__tests__/rsc/dashboard-prefetch.test.ts` — covers waterfall collapse (Dashboard-specific `Promise.all` call assertion)
- [ ] `frontend/tests/e2e/perf/playwright.config.ts` — P04 config (browser, baseURL, `fullyParallel`, `expect.toHaveScreenshot` defaults)
- [ ] `frontend/tests/e2e/perf/fixtures/seed-perf-test-user.sql` — Supabase-ready fixture for `perf-test@uniboard.uk`
- [ ] `frontend/tests/e2e/perf/helpers/auth.ts` — shared login helper + `page.clock.install` setup
- [ ] Framework install: `pnpm add -D @playwright/test` + `pnpm exec playwright install chromium --with-deps`
- [ ] Railway `/healthz` endpoint verification — add if missing (unknown, verify P03 Wave 0)

*(Since TDD mode is ACTIVE for Phase 38, Wave 0 lands all above test files in **RED** state with `xfail`/`it.todo`/`test.fixme` markers. Implementation waves flip them to GREEN.)*

## Security Domain

> `security_enforcement` not disabled in config — including.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth handles sign-in / JWT signing / rotation. Phase 38 only READS `auth.getSession()` — no auth flow changes |
| V3 Session Management | yes | `@supabase/ssr` manages session cookies (HttpOnly, Secure, SameSite=Lax in production). No hand-rolled session management |
| V4 Access Control | yes | Railway backend enforces per-user RLS via Supabase-signed JWT. BFF proxy forwards `Authorization` verbatim — trust model unchanged from Phase 30 |
| V5 Input Validation | partial | RSC prefetch only READS data (no user input to validate on this code path). Existing client-side validation via `zod` + `react-hook-form` continues |
| V6 Cryptography | no | No crypto primitives used in Phase 38 — token handling delegated to Supabase |

### Known Threat Patterns for Next.js 15 + TanStack Query SSR

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| **Cross-user cache leak via cached QueryClient** | Information Disclosure | Per-request QueryClient factory. TanStack's documented "NEVER DO THIS" avoids this — enforced by `isServer` branch in `getServerQueryClient()` |
| **Dehydrated cache embeds other user's data** | Information Disclosure | Same mitigation as above — per-request isolation is sufficient. Optionally add `shouldDehydrateQuery` filter for extra-sensitive queries (none currently) |
| **JWT leaked in server logs via fetch shim** | Information Disclosure | `getServerApiClient(accessToken)` must NEVER log the token. Use `Authorization: Bearer ***` redaction in any error path. Sentry already redacts `Authorization` headers by default. |
| **Open redirect from prefetch failure** | Tampering | D-B4 locks silent graceful degrade — no redirect. `error.tsx` is intentionally NOT triggered. |
| **BFF proxy SSRF from attacker-controlled URL** | Tampering | BFF proxy uses `backendPath` computed from route segment, NOT from request body. Already enforced in `lib/api/proxy.ts:33-34` — `base` is env-controlled `NEXT_PUBLIC_API_URL`, never user input |
| **Cookie exfiltration via XSS during hydration** | Information Disclosure | Supabase cookies are HttpOnly (not accessible to JS). Dehydrated cache is embedded as JSON in `<script type="application/json">`, not executable — React handles escape |
| **Cold-start DoS via attacker keeping service hot or forcing cold** | Denial of Service | GH Actions cron has fixed schedule (every 10 min), not attacker-controllable. Railway rate-limits requests independently. |

## Code Examples

Verified patterns from official sources + in-repo conventions.

### Code Example 1: Server QueryClient factory (`lib/query/server.ts`)

```typescript
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
// Adapted to mirror client defaults in frontend/lib/query/client.tsx
import { QueryClient, isServer } from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export function getServerQueryClient(): QueryClient {
  if (!isServer) {
    throw new Error(
      "getServerQueryClient() must only be called from a Server Component. " +
        "For client components, use useQueryClient() from @tanstack/react-query.",
    );
  }
  return makeQueryClient();
}
```

### Code Example 2: `createPrefetchedPage` HOF (`lib/rsc/createPrefetchedPage.tsx`)

```tsx
// Source: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
// Project additions: auth gating (D-A3), silent degrade (D-B4), Sentry reporting
import type { ReactNode } from "react";
import {
  dehydrate,
  HydrationBoundary,
  type QueryClient,
} from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { getServerQueryClient } from "@/lib/query/server";
import { createClient as createSupabaseServer } from "@/lib/supabase/server";

type PrefetchContext = {
  queryClient: QueryClient;
  accessToken: string;
  userId: string;
};

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
    // Unauthed → empty dehydrate, client handles redirect
    return (
      <HydrationBoundary state={dehydrate(queryClient)}>
        {children}
      </HydrationBoundary>
    );
  }

  if (run) {
    try {
      await run({
        queryClient,
        accessToken: session.access_token,
        userId: session.user.id,
      });
    } catch (error) {
      // Catch-all for the entire prefetch block. Individual queries should use
      // their own Promise.allSettled — this catch handles only truly
      // unexpected failures (e.g. getSession throws after initial success).
      Sentry.captureException(error, {
        tags: { phase: "38", operation: "rsc_prefetch_outer" },
        extra: { userId: session.user.id },
      });
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
```

### Code Example 3: Dashboard page.tsx with waterfall collapse

```tsx
// Source: Pattern 2 + Pattern 3 combined
// D-A4: Promise.all fan-out after awaiting /deadlines/upcoming
import { setRequestLocale } from "next-intl/server";
import * as Sentry from "@sentry/nextjs";
import DashboardPage from "@/components/dashboard/DashboardPage";
import { createPrefetchedPage } from "@/lib/rsc/createPrefetchedPage";
import { getServerApiClient } from "@/lib/rsc/serverQueryFn";
import { courseOptions } from "@/hooks/use-courses";
import { deadlineOptions } from "@/hooks/use-deadlines";
import { gpaOptions } from "@/hooks/use-gpa";
import { studyRecOptions } from "@/hooks/use-study-recommendations";

export const dynamic = "force-dynamic"; // reads cookies → implicit anyway, but explicit is clearer

type Props = { params: Promise<{ locale: string }> };

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return await createPrefetchedPage({
    children: <DashboardPage />,
    run: async ({ queryClient, accessToken, userId }) => {
      const api = await getServerApiClient(accessToken);

      // Wave A: fire non-dependent prefetches immediately
      const independentPrefetches = [
        queryClient
          .prefetchQuery({
            ...courseOptions.list(),
            queryFn: () => api.get("courses").json(),
          })
          .catch((e) =>
            Sentry.captureException(e, {
              tags: { phase: "38", operation: "rsc_prefetch", query: "courses" },
              extra: { userId },
            }),
          ),
        queryClient
          .prefetchQuery({
            ...gpaOptions.report(),
            queryFn: () => api.get("gpa/report").json(),
          })
          .catch((e) =>
            Sentry.captureException(e, {
              tags: { phase: "38", operation: "rsc_prefetch", query: "gpa" },
              extra: { userId },
            }),
          ),
        queryClient
          .prefetchQuery({
            ...studyRecOptions.main(),
            queryFn: () => api.get("ai/study-recommendations").json(),
          })
          .catch((e) =>
            Sentry.captureException(e, {
              tags: { phase: "38", operation: "rsc_prefetch", query: "study-rec" },
              extra: { userId },
            }),
          ),
      ];

      // Wave B: await upcoming deadlines to discover nearest course
      let nearestCourseId: string | null = null;
      try {
        const upcoming = await queryClient.fetchQuery({
          ...deadlineOptions.upcoming(),
          queryFn: () => api.get("deadlines/upcoming").json(),
        });
        const nearestCode = upcoming.data
          ?.filter((d: { days_remaining: number }) => d.days_remaining >= 0)[0]
          ?.course_code;

        if (nearestCode) {
          // Need courses list to map code → id. Wait for the courses list
          // prefetch (already in flight) to resolve — cheaper than a fresh fetch.
          await Promise.all(independentPrefetches);
          const coursesCache = queryClient.getQueryData<{
            data: Array<{ id: string; code: string }>;
          }>(courseOptions.list().queryKey);
          nearestCourseId =
            coursesCache?.data.find((c) => c.code === nearestCode)?.id ?? null;
        }
      } catch (e) {
        Sentry.captureException(e, {
          tags: { phase: "38", operation: "rsc_prefetch", query: "deadlines-upcoming" },
          extra: { userId },
        });
      }

      // Wave C: if nearest course identified, prefetch its detail in parallel
      // with any remaining independentPrefetches
      const finalPrefetches: Promise<unknown>[] = [...independentPrefetches];
      if (nearestCourseId) {
        finalPrefetches.push(
          queryClient
            .prefetchQuery({
              ...courseOptions.detail(nearestCourseId),
              queryFn: () =>
                api.get(`courses/${nearestCourseId}`).json(),
            })
            .catch((e) =>
              Sentry.captureException(e, {
                tags: { phase: "38", operation: "rsc_prefetch", query: "course-detail" },
                extra: { userId, courseId: nearestCourseId },
              }),
            ),
        );
      }
      await Promise.allSettled(finalPrefetches);
    },
  });
}
```

### Code Example 4: Predict page full N-fanout

```tsx
// Source: D-B3 full N-fanout pattern
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import * as Sentry from "@sentry/nextjs";
import PredictPage from "@/components/predict/PredictPage";
import { createPrefetchedPage } from "@/lib/rsc/createPrefetchedPage";
import { getServerApiClient } from "@/lib/rsc/serverQueryFn";
import { courseOptions } from "@/hooks/use-courses";
import { roiOptions } from "@/hooks/use-roi";
import { gpaOptions } from "@/hooks/use-gpa";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

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

      // Step 1: await /gpa/report (Predict page reads courses from it, not /courses)
      let courseIds: string[] = [];
      try {
        const gpaReport = await queryClient.fetchQuery({
          ...gpaOptions.report(),
          queryFn: () => api.get("gpa/report").json(),
        });
        courseIds = gpaReport.data.courses.map((c: { course_id: string }) => c.course_id);
      } catch (e) {
        Sentry.captureException(e, {
          tags: { phase: "38", operation: "rsc_prefetch", query: "gpa" },
          extra: { userId },
        });
      }

      // Step 2: full N-fanout — N × detail + N × roi in parallel (D-B3)
      if (courseIds.length > 0) {
        const prefetches = [
          ...courseIds.map((id) =>
            queryClient
              .prefetchQuery({
                ...courseOptions.detail(id),
                queryFn: () => api.get(`courses/${id}`).json(),
              })
              .catch((e) =>
                Sentry.captureException(e, {
                  tags: {
                    phase: "38",
                    operation: "rsc_prefetch",
                    query: "course-detail",
                  },
                  extra: { userId, courseId: id },
                }),
              ),
          ),
          ...courseIds.map((id) =>
            queryClient
              .prefetchQuery({
                ...roiOptions.course(id),
                queryFn: () => api.get(`courses/${id}/roi`).json(),
              })
              .catch((e) =>
                Sentry.captureException(e, {
                  tags: {
                    phase: "38",
                    operation: "rsc_prefetch",
                    query: "roi",
                  },
                  extra: { userId, courseId: id },
                }),
              ),
          ),
        ];
        await Promise.allSettled(prefetches);
      }
    },
  });
}
```

### Code Example 5: Playwright spec with `page.clock`

```typescript
// Source: https://playwright.dev/docs/clock
// Adapted for UniBoard Phase 38 P04 — pixel-diff on first paint
import { test, expect } from "@playwright/test";
import { loginAsPerfTestUser } from "./helpers/auth";

test.describe("Dashboard — first paint no skeleton flash", () => {
  test.use({ locale: "zh-CN" });

  test.beforeEach(async ({ page }) => {
    // D-C4: freeze time for deterministic data rendering
    await page.clock.install({ time: new Date("2026-04-01T08:00:00+10:00") });
    await loginAsPerfTestUser(page);
  });

  test("dashboard first paint matches baseline", async ({ page }) => {
    // Navigate and immediately screenshot (no waits for data)
    await page.goto("/zh-CN/");

    // Playwright waits for DOMContentLoaded by default; we want to capture
    // the moment the hydrated HTML is painted. A small stabilisation delay
    // on animations (AnimatedEntry) accepts slightly non-zero waits.
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot("dashboard-first-paint.png", {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
      animations: "disabled",
    });
  });
});
```

### Code Example 6: GitHub Actions warmup cron (conditional on P03)

```yaml
# .github/workflows/railway-warmup.yml — CREATE ONLY IF P03 p95 > 2s
# Source: project-standard pattern; free tier friendly
name: Railway Warmup
on:
  schedule:
    - cron: "*/10 * * * *" # every 10 minutes

jobs:
  warmup:
    runs-on: ubuntu-latest
    timeout-minutes: 2
    steps:
      - name: Ping /healthz
        env:
          RAILWAY_URL: ${{ secrets.NEXT_PUBLIC_API_URL }}
        run: |
          curl -f --max-time 15 "$RAILWAY_URL/healthz" > /dev/null
```

### Code Example 7: Cold-start measurement spec (`P03`)

```typescript
// Source: Playwright docs + custom measurement harness
// Runs outside regular CI (@perf tag), invoked manually or on a dedicated workflow
import { test, expect } from "@playwright/test";

test.describe("Cold-start characterisation @perf @cold", () => {
  test("p50/p95 for first-request after 15min idle", async ({ request }) => {
    const RAILWAY_URL = process.env.NEXT_PUBLIC_API_URL;
    if (!RAILWAY_URL) throw new Error("NEXT_PUBLIC_API_URL not set");

    const N = 10;
    const samples: number[] = [];

    for (let i = 0; i < N; i++) {
      // Wait 15 min between runs (or run N × separate GH Actions)
      // For measurement purposes, this is done in a dedicated harness
      const start = Date.now();
      const resp = await request.get(`${RAILWAY_URL}/healthz`, { timeout: 30_000 });
      const elapsed = Date.now() - start;
      expect(resp.ok()).toBe(true);
      samples.push(elapsed);

      if (i < N - 1) {
        // In practice, split across multiple workflow runs via matrix
        await new Promise((r) => setTimeout(r, 15 * 60 * 1000));
      }
    }

    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(N * 0.5)];
    const p95 = samples[Math.floor(N * 0.95)];

    console.log(`Cold-start samples (ms): ${samples.join(", ")}`);
    console.log(`p50=${p50} p95=${p95}`);

    // Write to coldstart-report.md is done by a post-run script, not here
    // because Playwright test wrappers are not a good place for file I/O
  });
});
```

## Common Pitfalls

### Pitfall 1: Per-request QueryClient contamination via `React.cache()`

**What goes wrong:** A developer sees `React.cache()` mentioned in Next.js docs for request-scoped memoisation and applies it to `getServerQueryClient()` thinking "one QueryClient per request, that's what I want". This is subtly wrong — `React.cache` memoises per-request in React's sense (not per user-session), AND it persists the QueryClient across the entire render tree. If middleware or layout calls `getServerQueryClient()` before the page, you get a shared instance.

**Why it happens:** `React.cache()` and "per-request" overlap in terminology but not in intent. The QueryClient must be created per page call, not per request to ensure isolation even inside a single render tree.

**How to avoid:** Keep `getServerQueryClient()` as a plain function that `return new QueryClient()`. Do NOT wrap with `React.cache()`. TanStack's docs use a plain function; follow them. [CITED: tanstack.com/query SSR guide]

**Warning signs:** The first time two users hit the same app instance simultaneously, one gets the other's cached data on first paint. Very hard to reproduce in dev.

### Pitfall 2: `queryFn` running on server references `ky` client that reads Zustand

**What goes wrong:** Hook's `queryOptions().queryFn` uses `api` (the `ky` instance from `lib/api/client.ts`), which reads the JWT from `useAuthStore.getState().accessToken`. On the server, Zustand has no persisted state → `accessToken` is null → Authorization header not set → BFF proxy returns 401 → prefetch fails silently.

**Why it happens:** The `ky` hook pattern was designed for client-only execution. Server execution wasn't a constraint when hooks were written.

**How to avoid:** Do NOT reuse the client `queryFn` on the server. Override `queryFn` at prefetch time via `{ ...hookQueryOptions, queryFn: () => serverApi.get(...).json() }`. The `queryKey` is preserved, so client-side `useQuery` still matches.

**Warning signs:** Sentry shows a spike of `operation: rsc_prefetch` errors with HTTP 401 codes. Development tests pass because localhost Zustand hydrates from browser localStorage but prod-on-cold-container does not.

### Pitfall 3: `fetch('/api/v1/...')` in RSC — relative URL fails

**What goes wrong:** Calling `fetch('/api/v1/courses')` from a Server Component throws "Invalid URL" or returns 404 because Node.js fetch requires absolute URLs (no implicit origin resolution).

**Why it happens:** Browser `fetch` resolves relative URLs against the page origin. Node.js fetch has no "page origin" concept.

**How to avoid:** Resolve origin via `await headers()` (`host` + `x-forwarded-proto`). Construct absolute URL: `${proto}://${host}/api/v1/...`. Documented in `getServerApiClient()` helper (§Code Example 2 supporting function).

**Warning signs:** `TypeError: Invalid URL` in server logs; works in Playwright but breaks on Vercel because localhost assumptions don't hold.

### Pitfall 4: `Promise.all` vs `Promise.allSettled` — one failure breaks the page

**What goes wrong:** Using `await Promise.all([p1, p2, p3])` with prefetches throws if any rejects, cascading to the RSC error boundary → `error.tsx` triggers → user sees error page for what should be a graceful skeleton fallback.

**Why it happens:** `Promise.all` is the default idiom for "run in parallel"; `allSettled` is one character longer and less familiar.

**How to avoid:** Use `Promise.allSettled` in `createPrefetchedPage`. Optionally wrap each individual `prefetchQuery` with `.catch()` so even `Promise.all` becomes safe. **D-B4 requirement.**

**Warning signs:** Entire page crashes when a single sub-endpoint is down. Tests that mock 404 on one endpoint cause full-page error rendering.

### Pitfall 5: Cold-start measurement measures the wrong thing

**What goes wrong:** Running Playwright `page.goto(url)` to measure cold-start includes Vercel edge + Next.js SSR + browser paint — the p95 is dominated by SSR + bundle, not Railway's cold-start. Masking the signal.

**Why it happens:** Intuition says "measure what the user experiences" → goto the full page. But PERF-03's intent is specifically to characterise **Railway** behaviour, not end-to-end TTFB.

**How to avoid:** Use Playwright's `request` fixture (or plain `curl`) to hit `$RAILWAY_URL/healthz` directly. Skip Vercel entirely. Record timings in isolation. Cold-start warmup's purpose is to keep the Railway container warm, so measuring it in isolation is correct.

**Warning signs:** Report shows p95 = 800ms when user anecdotally reports 3-5s on first cold load. The 800ms is the delta over warm, but the user's wall-time includes Vercel edge + DNS + TLS — those are warm and shouldn't be attributed to Railway.

### Pitfall 6: Playwright screenshot-diff flaky because font loading races the screenshot

**What goes wrong:** Baseline captured with fonts loaded; CI captures before fonts loaded → pixel diff > 2%. Test flakes intermittently.

**Why it happens:** Playwright's default wait is `load` or `domcontentloaded` — fonts load asynchronously after.

**How to avoid:** Explicitly wait `await page.evaluate(() => document.fonts.ready)` before `toHaveScreenshot`. Also disable animations with `animations: 'disabled'` in the screenshot options.

**Warning signs:** Diff shows sliver of regular-weight text vs bold-weight text in the same region. Flake passes when re-run.

### Pitfall 7: `shouldDehydrateQuery` accidentally excludes all queries

**What goes wrong:** Developer adds custom `dehydrate: { shouldDehydrateQuery: ... }` to filter "sensitive" data, but the predicate is inverted → all queries excluded → hydration always empty → skeleton always flashes.

**Why it happens:** Easy off-by-one in logical conditions. `defaultShouldDehydrateQuery` returns `true` for status="success", false for "pending" and "error". Custom predicates often get this backwards.

**How to avoid:** Don't add `shouldDehydrateQuery` unless you have a specific query that MUST NOT dehydrate. Phase 38's data is all user-scoped, all prefetched with intent to hydrate — use the default.

**Warning signs:** Visual regression test passes locally (cache warm from HMR) but fails in CI.

### Pitfall 8: `setRequestLocale` after `createPrefetchedPage` awaits

**What goes wrong:** `setRequestLocale(locale)` is called after the long-running `createPrefetchedPage()` await → `next-intl` warns that locale must be set before any async work → server render uses wrong locale.

**Why it happens:** Ordering of awaits matters in RSC.

**How to avoid:** `setRequestLocale(locale)` FIRST, before `createPrefetchedPage`. All 6 pages already do this in current form — maintain the ordering.

**Warning signs:** Dashboard shows English translations when Chinese is requested, intermittently.

### Pitfall 9: Dashboard page.tsx tries to use the HOF's `queries` parameter style for its waterfall

**What goes wrong:** The HOF's `run` callback signature supports dependency-chained prefetches (awaiting inside the callback), but early implementations may try to force Dashboard through a pure `queries: [...]` pattern that doesn't support mid-stream `fetchQuery`. Result: Dashboard waterfall remains sequential.

**Why it happens:** Pattern 2 API draft in §Code Example 2 uses `run` (callback style) — but if it shifts to `queries: []` for other pages, Dashboard gets shoehorned.

**How to avoid:** Keep the `run` callback API. It's more flexible; other pages just `await Promise.allSettled(independentPrefetches)` inside. Dashboard does fan-out + join.

**Warning signs:** P02 spec passes (5 other pages hydrate correctly) but P01's Dashboard still shows SkeletonCard for donut on first paint.

### Pitfall 10: middleware not refreshing Supabase session → `getSession()` returns stale token

**What goes wrong:** Without a top-level `middleware.ts` that calls `updateSession()`, Supabase SSR does not proactively refresh tokens. If a user's access token expires during a page request, `getSession()` returns null → prefetch skipped → page renders skeleton.

**Why it happens:** Current code has `updateSession` defined in `lib/supabase/proxy.ts` but no middleware.ts at `frontend/` root importing it. Grep confirms no importers.

**How to avoid:** Either (1) Wave 0 task in P01 adds `frontend/middleware.ts` importing `updateSession`, OR (2) accept stale token risk and rely on client-side refresh after hydration (acceptable given silent graceful degrade D-B4 — worst case is skeleton for one session-refresh cycle).

**Recommendation:** Option (1). Cheap and closes a real gap. Single file, ~10 lines, tests: just login → wait 55min → navigate → confirm no forced re-login. Lands in P01 Wave 0.

**Warning signs:** Sentry shows long tail of `session is null` for users with open tabs > 1 hour. Currently masked because client-side `onAuthStateChange` in AuthProvider refreshes, but that's a post-hydration fix; Phase 38's whole point is to populate before hydration.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `getInitialProps` / `getServerSideProps` (Pages Router) | Async Server Components + `prefetchQuery` (App Router) | Next.js 13 (App Router stable); TanStack Query v5 native HydrationBoundary | Phase 38 target |
| `cookies()` / `headers()` synchronous | `await cookies()` / `await headers()` (async) | Next.js 15.0.0-RC | Codemod available. Project is already on 15.5.14 — code must `await` |
| `React.cache()` for per-request QueryClient | Plain factory function (no cache) | TanStack guidance unchanged; reinforced by docs after 5.0 | Avoid subtle cross-request sharing |
| PPR (Partial Prerendering) | Still experimental in Next 15 | — | Deferred per CONTEXT.md "deferred ideas" |
| Next.js 16 Route Segment Config | Removed `dynamic` export | Next.js 16.0.0 | DO NOT upgrade — keep 15.x |
| Playwright `page.clock` introduced | 1.45+ | April 2024 | Required by D-C4 — install 1.59.1 (latest) |

**Deprecated/outdated:**
- `Sentry.withServerComponent` — not a thing; older blog posts suggested wrappers. Current `@sentry/nextjs` supports plain `captureException` from RSC. [CITED: docs.sentry.io Next.js guide]
- Sync `cookies()` — works in 15.x but deprecated; will break in 16.x.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Playwright `page.clock.install()` does not interfere with Next.js 15 RSC render | §Code Example 5 | Spec flakes. [ASSUMED] — Playwright docs don't explicitly address RSC. Mitigation: P04 Wave 0 runs a spike test against Dashboard before authoring all 6 specs |
| A2 | Railway's cold-start p95 is the bottleneck, not Vercel edge | §Pitfall 5 | Wrong metric → wasted warmup work. [ASSUMED] — user's 1-3s observation could be Vercel SSR + bundle. Mitigation: P03 measures both separately (Railway direct via `/healthz` AND Vercel page via Playwright `goto`) |
| A3 | `shouldDehydrateQuery` default is sufficient for Phase 38 | §Security | If wrong, user-specific data could leak on shared cache. [VERIFIED — per-request factory prevents this regardless, since there is no shared cache] |
| A4 | BFF proxy's `proxyRequest` handles `Authorization` forwarding identically for loopback and real client requests | §Canonical Refs | If not, server prefetch gets different response than client. [VERIFIED: lib/api/proxy.ts:37-38 source read] |
| A5 | `next-intl setRequestLocale` must be called before await'ing `createPrefetchedPage` | §Pitfall 8 | Wrong locale on server render. [ASSUMED from library conventions] — verify via a targeted test in P01 |
| A6 | N=10 cold-start samples is sufficient for p95 | §Pattern 5 | Underestimate tail. [ASSUMED] — 10 samples gives ±20% on p95. Acceptable for the binary "> 2s or not" decision; more samples only needed if close to threshold |
| A7 | `openapi.yaml` at `frontend/openapi/` defines all endpoints Phase 38 prefetches | §Code Examples | If endpoints missing in spec, `types.gen.d.ts` won't type-check the `queryFn`. [NEEDS VERIFICATION] — grep for each endpoint in openapi.yaml during P01 Wave 0 |
| A8 | Supabase Auth tokens are accessible via `session.access_token` in `@supabase/ssr 0.9.0` | §Code Examples 2,3 | If API shape differs, all server-side `queryFn` fail auth. [VERIFIED: @supabase/ssr 0.9 docs + in-repo usage pattern in AuthProvider.tsx] |

## Open Questions

1. **Does the existing `/api/v1/*` BFF proxy work when called from same-process RSC (internal loopback to self)?**
   - What we know: BFF proxy routes are standard Next.js Route Handlers; `fetch()` to them from an RSC is documented as supported.
   - What's unclear: Whether Vercel's runtime adds routing latency for self-calls vs. direct handler invocation.
   - Recommendation: P01 Wave 0 validates with a trivial prefetch → confirm round-trip latency < 20ms for loopback in dev.

2. **Dashboard's nearest-course discovery: does `useUpcomingDeadlines` return data shape compatible with `find().course_code` access?**
   - What we know: Hook `deadlineOptions.upcoming()` returns `UpcomingResponse` type from openapi.
   - What's unclear: The `data` field may be wrapped (`response.data.data`) vs. direct (`response.data`) — pattern varies across the codebase.
   - Recommendation: P01 task reads `deadlineOptions.upcoming()` queryFn return shape and adjusts the nearest-code extraction accordingly.

3. **Is there a Railway `/healthz` endpoint, and does it bypass DB connection (pure container readiness)?**
   - What we know: CONTEXT.md mentions "Playwright-driven measurement script that waits 15min idle then hits `/healthz`".
   - What's unclear: Endpoint existence + whether it pings DB (which would inflate timing by the DB pool cold-start).
   - Recommendation: P03 Wave 0 audits backend `main.py` for `/healthz` route. If pings DB, add a separate `/readyz` that only returns 200 (K8s convention).

4. **Does Phase 34's `studyRecOptions.main()` hook exist with a queryOptions factory?**
   - What we know: Dashboard imports `useStudyRecommendation` from `@/hooks/use-study-recommendations` (confirmed via DashboardPage.tsx:15).
   - What's unclear: Whether the hook file exports the `queryOptions()` factory (all others do; needs verification for this one).
   - Recommendation: P01 task inspects `hooks/use-study-recommendations.ts` — if no factory, add one (mirror `use-digest.ts` pattern).

5. **Will `generateStaticParams` (currently in `[locale]/layout.tsx`) interact badly with `force-dynamic` on child pages?**
   - What we know: Next.js docs say parent static params are allowed with dynamic child segments.
   - What's unclear: Whether Vercel build time increases significantly (locale × N pages × RSC pre-render).
   - Recommendation: P01 Wave 0 does a full `pnpm build` and compares build time vs. pre-Phase 38 baseline. If >2× slowdown, reconsider per-page `dynamic` vs. catch-all `generateStaticParams` adjustment.

6. **Is there a Route Handler at `frontend/app/api/v1/gpa/report/route.ts` that Dashboard's `gpaOptions.report()` hits?**
   - What we know: `frontend/app/api/v1/gpa/` directory exists per grep earlier.
   - What's unclear: Whether the specific `/gpa/report` sub-route has a handler or returns 404.
   - Recommendation: P01 Wave 0 lists `frontend/app/api/v1/gpa/**` and confirms all hook endpoints are covered.

## Sources

### Primary (HIGH confidence)

- TanStack Query Advanced SSR Guide — https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr (per-request QueryClient factory, HydrationBoundary, dehydrate)
- TanStack Query v5 SSR Guide — https://tanstack.com/query/v5/docs/framework/react/guides/ssr ("NEVER DO THIS" warning on shared root-level QueryClient, shouldDehydrateQuery docs)
- Next.js 15 Fetching Data — https://nextjs.org/docs/app/getting-started/fetching-data (RSC async fetch, Promise.all parallel fetching pattern)
- Next.js 15 `headers()` API — https://nextjs.org/docs/app/api-reference/functions/headers (async, opts route into dynamic rendering, requires await)
- Next.js 14 Route Segment Config — https://nextjs.org/docs/14/app/api-reference/file-conventions/route-segment-config (authoritative `dynamic` option semantics — preserves for Next.js 15 behaviour since 16 removed it)
- Playwright `page.clock` API — https://playwright.dev/docs/clock (install, setFixedTime, pauseAt — required by D-C4 since 1.45+)
- In-repo `package.json` — verified installed versions: `@tanstack/react-query 5.91.2`, `next 15.5.14`, `@supabase/ssr 0.9.0`, `@sentry/nextjs 10.47.0`
- In-repo code audit — verified existing patterns: `queryOptions()` factories in 12 hook files, BFF proxy at `app/api/v1/**`, Supabase SSR server client at `lib/supabase/server.ts`, AuthProvider JWT flow, client `QueryProvider` defaults
- Sentry Next.js captureException docs — https://docs.sentry.io/platforms/javascript/guides/nextjs/apis/ (callable from async Server Components, supports tags)

### Secondary (MEDIUM confidence)

- Jon Meyers "Forwarding Cookies from Server Components to Route Handlers" — https://jonmeyers.io/blog/forwarding-cookies-from-server-components-to-route-handlers-with-next-js-app-router/ (absolute URL requirement for server-side fetch to own routes)
- Railway Station community thread — https://station.railway.com/questions/cold-start-slow-ee224f40 (health check pre-warm suggestion confirmed by Railway staff)
- Brave search (user asked for Railway cold-start strategies) — confirms GH Actions cron is the community-standard warmup for free-tier platforms

### Tertiary (LOW confidence — flagged for validation)

- Playwright + Next.js 15 RSC compatibility — no explicit doc found; A1 assumes it works based on Playwright being a browser-level tool (unaffected by server-side rendering model). **Validate by spike in P04 Wave 0.**
- Exact Vercel edge vs. Railway latency decomposition — A2 assumes Railway is the primary cold-start contributor. **Validate in P03 by measuring both paths.**

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all primary libs are installed, versions verified against npm registry
- Architecture (RSC + HydrationBoundary): HIGH — canonical TanStack Query v5 pattern, project has 12 hooks already using `queryOptions()`
- Dashboard waterfall fix: HIGH — `Promise.all` / `Promise.allSettled` are stable JS idioms; TanStack `queryClient.fetchQuery` + `prefetchQuery` behave as documented
- BFF proxy + auth forwarding: HIGH — source-read `lib/api/proxy.ts` confirms header forwarding; mechanism diverges from CONTEXT.md (cookie vs Authorization) in a fixable way
- Cold-start measurement approach: MEDIUM — decision between Railway-only vs end-to-end measurement is a real tradeoff; A2 is the recommended default but needs P03 Wave 0 validation
- Playwright visual regression: MEDIUM — P04 is first Playwright setup for the repo; Wave 0 absorbs the usual first-setup gotchas (baseline generation across OSes, font readiness, CI vs local parity)
- Sentry RSC reporting: MEDIUM — Sentry docs confirm `captureException` works from async RSC; exact tag propagation through `onRequestError` callback not verified in this session, recommended to spot-check with one deliberate prefetch failure during P01

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (30 days — stable stack, no known upcoming Next.js / TanStack breaking releases)
