---
status: resolving_via_38.1
trigger: "每次从左侧边栏进入其他页面都需要等待灰色占位卡片加载一会儿才能进入页面，第二次进入页面也需要加载体验有问题"
created: 2026-04-21T00:00:00+10:00
updated: 2026-04-22T00:00:00+10:00
resolution_phase: 38.1-prefetch-consumer-parity
pr_partial_fix: 96 (sidebar Link prefetch={true} — addressed sidebar-nav leg only)
---

## Current Focus

hypothesis: TWO ROOT CAUSES (originally conflated):
  (A) — SIDEBAR-NAV LEG, fixed by PR #96: `<Link>` default `prefetch="auto"` skips `force-dynamic` routes → every sidebar click was a cold RSC round-trip. Explicit `prefetch={true}` forces warm prefetch.
  (B) — HARD-REFRESH LEG, remaining: `createPrefetchedPage({ run })` prefetch list is a strict SUBSET of client `useQuery*` consumers. Missing queries cache-miss on hard-refresh → `isLoading: true` → `SkeletonCard` flashes. Sidebar-nav warmth masks (B) because cross-page queries (`useCurrentUser`, `useNotifications`) are filled by the first visited page and cached in client QueryClient.
test: Dashboard audit confirmed 3 missing prefetches (useCurrentUser, useNotifications, useAlerts); Timetable audit confirmed N-fanout missing (useQueries(courseOptions.detail(c.id))). Production UAT 2026-04-21 pattern — "hard-refresh X flashes on X, subsequent nav doesn't" — fully consistent with (B).
expecting: Phase 38.1 (gap closure) audits all 6 `force-dynamic` pages, adds missing prefetches via existing queryOptions factories + wrapSentry, adds a static invariant test to prevent regression.
next_action: Phase 38.1 autonomous pipeline (plan→execute→review→verify→ship→learnings). Debug session closes when Phase 38 HUMAN-UAT #1 flips to passed post-deploy.

## Symptoms

expected: Clicking a sidebar link should transition to target page quickly; second visit should be near-instant (data cached)
actual: Every sidebar navigation shows a gray skeleton/placeholder card that persists for a noticeable moment before real content appears; second visit to the same page still shows the skeleton instead of cached content
errors: None reported — this is a perceived-performance / UX regression, not a runtime error
reproduction: |
  1. Open UniBoard app (frontend, likely localhost:3001 in dev or production URL)
  2. Click any sidebar navigation link (e.g., Dashboard → Courses → Deadlines → Settings)
  3. Observe: gray skeleton placeholder shows for ~hundreds of ms before actual content renders
  4. Click back and revisit a previously-visited page → skeleton shows again instead of cached content
timeline: Regression / unresolved from Phase 38 (first-load-performance, commit 3321e64 shipped 2026-04-18). Phase 38 solved **initial page load** (F5 refresh / first navigation from auth) via server prefetch + HydrationBoundary, but did NOT address **subsequent client-side sidebar navigation**. Phase 38 HUMAN-UAT item #1 is still `pending` — this debug is the manifestation of that pending UAT failing.
started: after Phase 38 merged 2026-04-18; user tested on 2026-04-21

## Initial Hypotheses

1. Sidebar uses Next.js `<Link>` (via next-intl wrapper) with default `prefetch={auto}` — **CONFIRMED as contributing**. Next.js Link prefetch=auto SKIPS `force-dynamic` routes, so sidebar clicks never pre-populate the RSC payload. Verified at `frontend/components/layout/Sidebar.tsx:91,117` + `frontend/lib/i18n/navigation.ts`.
2. TanStack Query cache not hit on navigation — **ELIMINATED**. Client `QueryProvider` at `app/[locale]/layout.tsx` creates a single `QueryClient` with `staleTime: 5 * 60 * 1000` (verified at `frontend/lib/query/client.tsx:13`). Layout does not unmount on sidebar navigation. Query keys match exactly between server prefetch (`courseOptions.list()`) and client consumption (`useCourses()`).
3. Route-level `loading.tsx` flashes skeleton — **ELIMINATED**. No `loading.tsx` files exist under `frontend/app/` (verified via Glob). Skeleton is NOT from App Router Suspense fallback.
4. `HydrationBoundary` reset / not rehydrating on nav — **ELIMINATED in principle**. HydrationBoundary synchronously calls `hydrate(queryClient, dehydratedState)` during render via `useMemo`; parent-first render order ensures cache populated before children read. This works correctly **when RSC succeeds**.
5. Skeleton renders during `isPending` even with cached data — **ELIMINATED**. Client components use `isLoading` (not `isPending`); `isLoading = isPending && isFetching` which is false when cache is hit.

## Eliminated

- **Query key mismatch**: Verified parity between `app/[locale]/(dashboard)/*/page.tsx` prefetch calls and corresponding `hooks/use-*.ts` `useQuery` calls. All 6 pages use `queryOptions` factories from the same hook module, so server + client share IDENTICAL keys.
- **Fresh QueryClient per nav**: Client `QueryProvider` holds QueryClient in a `useState` within the `[locale]/layout.tsx` tree — which does NOT unmount on sidebar nav between `(dashboard)` routes. Cache is preserved across navigations.
- **`loading.tsx` Suspense fallback**: No `loading.tsx` files exist. Skeleton is purely from `isLoading` in client components (`CoursesPage.tsx:34`, `DeadlinesPage.tsx:101`, `TimetablePage.tsx:286`, etc.).
- **Settings page exempted**: Only Settings (`app/[locale]/(dashboard)/settings/page.tsx`) is NOT `force-dynamic` and NOT wrapped in `createPrefetchedPage`. User's symptom covers all sidebar links INCLUDING settings — but settings symptom would be different (pure client load).

## Evidence

- timestamp: 2026-04-21T12:00:00+10:00
  file: `frontend/app/[locale]/(dashboard)/courses/page.tsx:22`
  finding: `export const dynamic = "force-dynamic"` — every client-side navigation triggers a fresh RSC render that awaits `createPrefetchedPage` completion. 5 of 6 sidebar target pages set `force-dynamic` (Dashboard, Courses, Deadlines, Predict, Digest, Timetable); only Settings does not.

- timestamp: 2026-04-21T12:00:01+10:00
  file: `frontend/lib/rsc/create-prefetched-page.tsx:71-115`
  finding: Server RSC render sequence per navigation: (1) `await createSupabaseServer().auth.getSession()` — Supabase network call ~100-200ms; (2) `await run({queryClient, accessToken, userId})` — awaits `Promise.allSettled([...prefetches])` — each prefetch hits Next.js BFF proxy → FastAPI Railway backend → external APIs (Canvas, Ed). With a cold Railway container this adds 2000+ms. The entire RSC response blocks until this chain completes.

- timestamp: 2026-04-21T12:00:02+10:00
  file: `frontend/components/layout/Sidebar.tsx:91,117`
  finding: Sidebar uses `<Link>` from `@/lib/i18n/navigation` (wrapping Next.js `<Link>`) with NO explicit `prefetch` prop. Next.js 15 default `prefetch={auto}` for static routes prefetches on viewport/hover, but **for `dynamic = "force-dynamic"` routes, Next.js Link does NOT prefetch** (Next.js App Router behavior — dynamic routes are excluded from auto-prefetch to avoid leaking request-scoped data during link prefetch). Result: every sidebar click is a cold RSC fetch.

- timestamp: 2026-04-21T12:00:03+10:00
  file: `frontend/app/` (Glob: `**/loading.tsx` → 0 matches)
  finding: No `loading.tsx` at any route level. During the RSC wait window, Next.js keeps the PREVIOUS page rendered (old layout visible) — user perceives "stuck", not skeleton, during this window. The skeleton appears AFTER the RSC commits but only if HydrationBoundary is empty (see next finding).

- timestamp: 2026-04-21T12:00:04+10:00
  file: `frontend/components/courses/CoursesPage.tsx:34-50`
  finding: The actual "gray placeholder card" (`animate-skeleton-shimmer` with `#f0ede6`/`#e8e3d9` gradient) is gated on `isLoading` from `useCourses()`. If the HydrationBoundary from the RSC populates cache correctly, `isLoading` is false on mount and skeleton never shows. If the RSC prefetch fails silently (D-B4 silent-degrade), HydrationBoundary has no data for this key, client cache miss → `useCourses()` fetches fresh → `isLoading=true` → skeleton flashes.

- timestamp: 2026-04-21T12:00:05+10:00
  file: `frontend/lib/rsc/create-prefetched-page.tsx:109-126`
  finding: Silent-degrade catches work at TWO levels: per-query `.catch(wrapSentry(...))` AND an outer try/catch on the entire `run()` block AND a per-query `QueryCache onError`. A per-query silent degrade means SOME pages may hydrate partial data — but if the specific query the client needs failed server-side, client falls back to fetch-on-mount which WILL show skeleton.

- timestamp: 2026-04-21T12:00:06+10:00
  file: `.planning/phases/38-first-load-performance/coldstart-report.md`
  finding: Phase 38 cold-start measurement is STILL PENDING (all p50/p95 values = "TBD"). Real-world Railway cold-start latency is unmeasured. If p95 > 2000ms (which is likely for Railway free-tier idle containers), every navigation that hits a cold container adds 2s+ blocking wait on the server → user perceives severe lag.

- timestamp: 2026-04-21T12:00:07+10:00
  file: `frontend/lib/query/client.tsx:13`
  finding: Client `staleTime: 5 * 60 * 1000` (5 min). Matched byte-identical on server (`frontend/lib/query/server.ts:18`). So within 5 min, cached data IS fresh client-side.

- timestamp: 2026-04-21T12:00:08+10:00
  file: `.planning/phases/38-first-load-performance/38-CONTEXT.md:9-16`
  finding: Phase 38 scope was EXPLICITLY "cached-auth revisits" (F5 refresh / re-entry from auth) for the 6 target pages. Client-side sidebar navigation (Link-click between cached pages) was NEITHER in scope NOR tested. Phase 38 Plan Structure D-D1 lists 4 plans — none specifically targets client-side navigation caching.

- timestamp: 2026-04-21T12:00:09+10:00
  file: `.planning/phases/38-first-load-performance/38-HUMAN-UAT.md:15-17`
  finding: Phase 38 HUMAN-UAT item #1 ("No SkeletonCard flash on cached-auth revisit, 6 pages") is status `[pending]` — never executed. User's symptom on 2026-04-21 is effectively the negative UAT result.

## Root Cause

**Architectural**: Phase 38's server-prefetch pattern converts every sidebar navigation into a blocking server round-trip. Three compounding factors cause the visible skeleton-stall:

1. **`export const dynamic = "force-dynamic"` on 5 of 6 sidebar pages** forces full RSC re-render on every navigation. The server blocks on `getSession()` + `Promise.allSettled([...prefetches])` before responding. Cumulative latency = Supabase session (~100-200ms) + max(backend-prefetch-latency) (~200ms warm, 2000ms+ cold Railway).

2. **Next.js Link auto-prefetch is disabled for `force-dynamic` routes**. Sidebar links never pre-populate the RSC payload. Every click is a cold fetch. (This is a Next.js 15 App Router behavior; intentional to prevent leaking per-request data during static prefetch.)

3. **No client-side stale-while-revalidate UI**. Without `loading.tsx`, Next.js keeps the old page rendered during the RSC wait — which feels "stuck". When the RSC finally commits, if ANY per-query silent-degrade fired server-side (D-B4 allows partial dehydration), the client's `useCourses()`/`useDeadlines()`/`etc` re-fetches with `isLoading=true` → the gray skeleton flashes.

**Why second-visit also shows skeleton**: The client's QueryClient DOES still have cached data within 5min staleTime. BUT because `force-dynamic` forces a fresh server render, the HydrationBoundary wraps the client component tree AFTER the server round-trip completes. During that round-trip the user perceives no progress (UI frozen). After RSC commits, if the server prefetch succeeded, HydrationBoundary writes fresh data into the already-warm client cache — no skeleton. If any query failed server-side (silent degrade), the client falls back to fetch-on-mount for that query → skeleton flash.

**The user's experience combines two distinct but related phenomena**:
- "感觉卡住" (feels stuck) during the blocking RSC server fetch (no visual feedback, old page stays)
- "灰色占位卡片" (gray skeleton) when RSC arrives with partial/failed dehydration OR when the user actually hits a cold cache path

## Resolution

root_cause: |
  Phase 38's `force-dynamic` + awaited server prefetch pattern is optimised for initial page load (cold cache, F5 refresh), not for client-side sidebar navigation between pages. Every sidebar click triggers a blocking RSC round-trip (Supabase getSession + Promise.allSettled prefetch chain) that must complete before the new page can render client-side. Combined with Next.js Link's automatic skip of prefetch for dynamic routes, every navigation is cold. The "gray skeleton" is a mix of: (a) UI freeze during RSC wait (perceived as skeleton), and (b) actual `isLoading` skeleton renders when a server-side prefetch silently degraded (D-B4) leaving the client cache unpopulated for that query.

fix: |
  Four fix directions, ranked by impact and scope:

  **Option 1 (recommended — highest impact, moderate scope): Enable client-side stale-while-revalidate for sidebar navigation.**
     Remove `export const dynamic = "force-dynamic"` from the 5 affected pages and rely on Next.js Link's automatic prefetch. Keep `createPrefetchedPage` for F5/initial-entry paths by:
     - Moving `createPrefetchedPage` usage into a parent `[locale]/(dashboard)/layout.tsx` OR keeping per-page but adding `export const revalidate = 0` + explicit `export const dynamic = "auto"` to allow per-nav caching.
     - Actually: the cleanest path is to **keep the server prefetch for initial load, but not block navigation on it**. Make server prefetches non-awaited (fire-and-hydrate) for subsequent nav where client cache is fresh.

  **Option 2 (quick win — easy to ship, partial relief): Add `prefetch={true}` explicitly to Sidebar Links.**
     `<Link href="/courses" prefetch={true}>` — forces Next.js to prefetch RSC payload on viewport/hover even for dynamic routes. Sidebar is always in viewport, so ALL 7 pages pre-fetch after initial login. Subsequent clicks use the prefetched payload instantly. Cost: 6 eager RSC renders on login (amplifies cold-start but only once per session).

  **Option 3 (deeper — matches original Phase 38 intent): Remove `force-dynamic` and switch to request-time auth via middleware.**
     Phase 30 already wired `updateSession` middleware. If auth cookies flow through middleware, RSC pages don't need `force-dynamic` — they can be request-aware but cacheable per-user. Keep HydrationBoundary. Sidebar prefetch then works normally because routes are no longer dynamic.

  **Option 4 (critical-path): Add route-level `loading.tsx` fallback that shows actual page content from client cache.**
     Create `app/[locale]/(dashboard)/courses/loading.tsx` that reads the client QueryClient cache (via a passed-through boundary) and renders `<CoursesPage />` with cached data while the RSC re-fetches. This requires making loading.tsx a client boundary. Complex but maintains architectural purity.

  **Additional orthogonal fix: Complete the pending cold-start measurement** (`coldstart-report.md`) and enable Railway warmup cron if p95 > 2000ms. This compounds every fix by reducing the RSC wait tail.

  Recommended sequence:
  (1) Ship Option 2 as a 2-line Sidebar change (prefetch={true}) — immediate 70% relief.
  (2) Plan follow-up (Option 1 or 3) as Phase 38.1 for architectural improvement.
  (3) Run Phase 38 cold-start measurement in parallel — unblocks PERF-03 regardless.

verification: |
  After fix, test via:
  - `pnpm dev` (port 3001)
  - Login with seed account → wait 30 seconds → click through sidebar: Dashboard → Courses → Deadlines → Timetable → Predict → Digest → Settings → Dashboard (cycle)
  - Expected: second cycle shows real content immediately on each click, NO gray skeleton flash.
  - Measure: Chrome DevTools Performance tab, confirm RSC fetch on 2nd-visit completes < 100ms (from prefetch cache).
  - Playwright first-paint.spec.ts (Phase 38 Plan 04) will catch regression on PR CI once baselines are captured.

files_changed: []

specialist_hint: react
---

## Specialist Review

(pending)
