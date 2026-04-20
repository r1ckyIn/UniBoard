# Phase 38: First-Load Performance (RSC Prefetch + HydrationBoundary) - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver first-paint-with-real-data on six card-heavy pages — Dashboard, Courses, Deadlines, Predict, Digest, Timetable — for cached-auth revisits. Mechanism: Next.js 15 `async` Server Component prefetch + TanStack Query `HydrationBoundary`, plus:

- Collapse the Dashboard `/deadlines/upcoming → /courses/{nearest}` serial waterfall
- Characterise Railway cold-start p50/p95 and add warmup only if >2s
- Re-evaluate backlog 999.2 (viewport lazy-mount) post-ship

Out of scope: animation changes, sidebar (999.1), new features, backend schema changes beyond the waterfall fix decision.

</domain>

<decisions>
## Implementation Decisions

### Architecture — RSC → Backend Auth

- **D-A1:** RSC prefetch calls the backend via the existing Next.js BFF proxy (`fetch('/api/v1/...')`) introduced in Phase 30. Same-origin loopback keeps one code path between SSR and CSR; cookie-based auth already flows through the proxy layer.
- **D-A2:** Server-side `QueryClient` factory lives in `frontend/lib/query/server.ts` (new), matches the client defaults (`staleTime: 5min`, `retry: 1`), and is created per-request (not cached across requests) — user-specific data must not leak.
- **D-A3:** Auth gate — call `createServerClient()` from `frontend/lib/supabase/server.ts`; if `getUser()` is null, skip prefetch and let the page render with empty `dehydrate()`. Client-side auth guard still handles redirect.

### Dashboard Waterfall (Success #3)

- **D-A4:** Solve via **frontend RSC `Promise.all`** parallelisation — NOT a backend schema change. Dashboard's server component awaits `/deadlines/upcoming` once, then parallelises `/courses/{code}` fetches for the top-N courses using `Promise.all([...])`. Backend `/deadlines/upcoming` response shape remains unchanged. Backend aggregation is deferred to a future phase if profiling shows N+1 becomes problematic.

### Railway Cold-Start (Success #4)

- **D-A5:** **Measure first, mitigate if needed.** P03 produces a Playwright-driven measurement script that waits 15min idle then hits `/healthz`; records p50/p95 across N=10 runs into `coldstart-report.md`. If p95 >2s, add a GitHub Actions cron (every 10 min, lightweight `/healthz` ping) to keep Railway warm. Do NOT upgrade to Railway paid "always-on" — cost/benefit skewed vs free tier + cron for a solo-dev project.

### Prefetch Scope

- **D-B1:** **Critical-path full prefetch** (not hero-only, not streaming). Success criterion #2 is worded "no SkeletonCard visible to the naked eye" — hero-only does not clear this bar for secondary regions. Streaming via `<Suspense>` is deferred to a Phase 38.x follow-up if profiling justifies.
- **D-B2: Per-page critical path (queries to prefetch on the server)**
  - **Dashboard** — `/courses`, `/deadlines/upcoming`, `/courses/{nearestCourseCode}` (Promise.all after deadlines resolves), and any query powering the Phase 34 study-rec hero
  - **Courses** — `/courses` (with grades summary embedded by the existing endpoint)
  - **Deadlines** — `/deadlines/upcoming?mode=all` + `/courses` (for color mapping)
  - **Predict** — `/courses` + **all N × `/courses/{code}/detail`** + **all N × `/courses/{code}/roi`** in parallel (full N-fanout, decision below)
  - **Digest** — `/digest/latest`
  - **Timetable** — `/timetable/sessions?week={current}` + `/deadlines/upcoming`
- **D-B3: Predict N-fanout = full** — prefetch ALL N courses × 2 endpoints in parallel on the server. Accepted tradeoff: cold-start penalty is amplified, but D-A5 warmup neutralises it if real-world p95 exceeds 2s.
- **D-B4: Prefetch failure handling = silent graceful degrade.** If any RSC `queryClient.prefetchQuery()` rejects, catch it per-query and continue — dehydrate whatever succeeded. Client's `useQuery` will fill the gap with a `SkeletonCard` exactly as today. Do NOT throw to `error.tsx` — a single backend hiccup must not break the entire page. Log failures via Sentry with `phase: 38, operation: rsc_prefetch` tag.

### Verification (Success #2)

- **D-C1:** Dual verification — Playwright screenshot-diff automated regression (P04) + manual UAT sign-off (human walks through each page on Vercel preview).
- **D-C2:** Assertion = **pixel-diff** (not DOM-only, not LCP metric). Strictest bar; matches user's success criterion reading of "no skeleton flash to the naked eye."
- **D-C3:** Coverage = **all 6 pages**.
- **D-C4 (Claude's Discretion — Playwright setup):**
  - Test account: dedicated Supabase seed account (e.g., `perf-test@uniboard.uk`), seeded with a fixed 3-course + fixed deadline fixture via one-time SQL migration
  - Time freeze: Playwright 1.45+ `page.clock.install({ time: '2026-04-01T08:00:00+10:00' })`
  - Locale: `zh-CN` only (primary locale). `en` stays in manual UAT to keep CI spec count bounded
  - Diff tolerance: `maxDiffPixelRatio: 0.02`
  - Baseline storage: `frontend/tests/e2e/perf/__screenshots__/` (committed, not gitignored)
  - CI trigger: `pull_request.paths` includes `frontend/**`

### Plan Structure

- **D-D1:** **4 plans**, dependency-layered:
  - **P01** — Infra + Dashboard reference implementation (one plan, one PR). Establishes `getServerQueryClient()` helper, `createPrefetchedPage()` HOF pattern, and ships Dashboard end-to-end (including waterfall fix) as the template
  - **P02** — Remaining 5 pages in a single plan with 5 wave-parallel sub-tasks (Courses / Deadlines / Predict / Digest / Timetable). File-level no-conflict — each page has its own `page.tsx` + client component
  - **P03** — Railway cold-start measurement + conditional warmup cron
  - **P04** — Playwright screenshot-diff suite (all 6 pages + fixture seed SQL)
- **D-D2:** P02 = wave-parallel inside one plan (executor spawns 5 sub-tasks simultaneously; safe because files don't overlap).
- **D-D3:** Playwright spec = independent **P04** after functional landing, not per-page. Baseline screenshots are easier to generate once when the full 6-page experience is stable.
- **D-D4:** No feature flag. Silent degrade (D-B4) means failure mode = today's behaviour (SkeletonCard), so risk of regression during rollout is bounded to "as if Phase 38 never landed".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Goal & Requirements
- `.planning/ROADMAP.md` §Phase 38 — success criteria, depends-on chain, context carry-over
- `.planning/REQUIREMENTS.md` — PERF-01/02/03 (nominal IDs; body text lives in ROADMAP.md since this phase was promoted from backlog 999.2 on 2026-04-20)

### Prior Debug & Performance Context
- `.planning/debug/resolved/uniboard-5fps-lag-dashboard.md` — Phase 38's empirical origin: PRs #80-87 drove INP 267→107 ms but left "first-visit lag on dashboard/predict/settings/timetable" unresolved (~1-3s window of entrance stagger + query waterfall + 9-11 RoughCard first paint). 999.2 captured the symptom; Phase 38 resolves it at the data-delivery layer rather than via deferred render.
- `.planning/quick/260420-n29-fix-gpu-paint-cost-stalls-on-intel-mac-4/` — Latest related perf work (GPU paint cost on Intel Mac); confirms Phase 38 is orthogonal to paint-cost optimisations

### Existing Code Entry Points (read before planning)
- `frontend/app/[locale]/layout.tsx` — Current provider chain: `NextIntlClientProvider → QueryProvider → AuthProvider → children`. QueryProvider must NOT be replaced; HydrationBoundary wraps inside it per TanStack SSR guidance
- `frontend/app/[locale]/(dashboard)/page.tsx` + `courses/page.tsx` + `deadlines/page.tsx` + `predict/page.tsx` + `digest/page.tsx` + `timetable/page.tsx` — Six pages to convert. Current pattern: thin `async function Page()` that sets locale + renders a client component
- `frontend/lib/query/client.tsx` — Client `QueryProvider`; defaults (`staleTime 5min`, `retry 1`, `refetchOnWindowFocus false`) must be mirrored in the new server factory
- `frontend/lib/supabase/server.ts` — `createServerClient()` already ships. RSC can call `.auth.getUser()` to gate prefetch (D-A3)
- `frontend/lib/supabase/proxy.ts` — Middleware updateSession flow already runs on every request; validates Phase 30's cookie-auth path
- `frontend/app/api/v1/` (BFF proxy routes) — Target of server-side loopback fetches (D-A1)

### Prior Phase Decisions (relevant patterns)
- `.planning/phases/34-ai-features-live/34-LEARNINGS.md` §D-D1 — Dashboard hero has a 3-stage fallback chain (AI → ROI → static). RSC prefetch must NOT break this; stage 3 (static) is the safe fallback when stages 1-2 prefetch fails
- `.planning/phases/33-token-lifecycle-onboarding/` — Phase 33 established `configureToken` + exp-backoff patterns. RSC prefetch failure handling (D-B4) reuses the same "silent degrade, log to Sentry" mindset

### External Docs (researcher should fetch)
- TanStack Query Advanced SSR — https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr (authoritative for `HydrationBoundary` / `dehydrate` / `getQueryClient` pattern)
- Next.js 15 App Router Data Fetching — https://nextjs.org/docs/app/building-your-application/data-fetching
- Playwright `page.clock` API — https://playwright.dev/docs/clock (required by D-C4)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`frontend/lib/supabase/server.ts:createClient()`** — Returns a Supabase server client. Used in RSC to call `.auth.getUser()` for the prefetch gate (D-A3)
- **`frontend/app/api/v1/**` BFF routes** — Phase 30 built these. RSC loopback fetch target (D-A1)
- **`frontend/lib/query/client.tsx` defaults** — Source of truth for `QueryClient` options; server factory must mirror
- **`frontend/components/*/Page.tsx` hooks** — `useCourses`, `useDeadlines`, `useCourseDetail`, `useDigestLatest`, etc. Each hook's query key + queryFn needs to be callable from the server. Expose a `queries.{domain}.{name}()` `queryOptions()` helper if not already done — TanStack recommends this for SSR parity.
- **Playwright MCP** — Previously used in 260420-n29 quick task; already wired for local invocation. P04 reuses the same tooling.

### Established Patterns
- **Async Server Page wrappers** — Every current page.tsx is already an `async function` (for `setRequestLocale`). We're extending this pattern, not introducing it.
- **Next.js 15 `params: Promise<{locale}>`** — All pages use `await params`. Keep consistent for new prefetch logic.
- **Per-locale static generation** — `generateStaticParams` returns all locales; with user-specific prefetch, affected routes become dynamic at request time. Add `export const dynamic = 'force-dynamic'` on the 6 pages (implicit once cookies()/auth are read, but explicit is clearer).
- **Type safety** — `frontend/lib/api/types.gen.d.ts` generated from `openapi.yaml`. Prefetch `queryFn` must use the same types as client hooks.
- **Sentry tag convention** — Prior phases use `Sentry.setTag("phase", "38")` + `operation` tag for observability (D-B4 follows this).

### Integration Points
- **`QueryClientProvider`** stays client-side in `lib/query/client.tsx`. Server `HydrationBoundary` wraps it at page level, not at layout level (TanStack guidance — per-route dehydration).
- **Middleware** (`middleware.ts` via `updateSession`) already refreshes Supabase session on every request — no change needed. Server `createClient()` reads the refreshed cookies.
- **Next.js 15 `cookies()` / `headers()`** — RSC prefetch calling BFF proxy must explicitly forward cookies for same-origin auth. Internal `fetch('/api/v1/...')` in Node runtime does NOT carry cookies by default — needs `headers: { Cookie: (await headers()).get('cookie') }`. Confirm during P01 research step.
- **Sentry observability** — RSC prefetch failures emit Sentry breadcrumbs with `phase: 38` tag so post-launch monitoring can spot cold-start spikes.

### Creative Options Enabled
- `queryOptions()` factory per domain (TanStack pattern) lets the same key + queryFn work on server AND client — removes drift risk
- Once P01 lands, the `createPrefetchedPage()` HOF can be a 20-line helper that other pages import — P02 sub-tasks become shallow (declare which queries, pass, done)

</code_context>

<specifics>
## Specific Ideas

- User reads "no SkeletonCard visible to the naked eye" literally — Playwright diff must be pixel-strict, not DOM-presence-only (D-C2)
- Dedicated `perf-test@uniboard.uk` account for reproducible diff baselines (D-C4)
- Phase 30 BFF proxy is a first-class citizen — do NOT bypass it with direct Railway calls (D-A1). Consistency over 5ms savings.
- Backend schema left alone. Deadlines waterfall fix is pure frontend parallelism (D-A4).
- Cost preference: GH Actions cron (free) over Railway always-on (paid). Only escalate if cron proves insufficient (D-A5).
- Silent graceful degrade is preferred over strict error boundaries — Phase 38 must NEVER be worse than today's experience on failure paths (D-B4)

</specifics>

<deferred>
## Deferred Ideas

- **Backend aggregation of `assessment_weights` into `/deadlines/upcoming`** — Considered as D-A4 alternative; deferred. Revisit if N+1 frontend Promise.all becomes a cold-start bottleneck observable in p95.
- **Streaming with React Suspense boundaries per region** — GA-5 option C. Defer to a hypothetical Phase 38.1 if critical-path full prefetch still has perceptible delay after Railway warmup is in place.
- **Partial Prerendering (PPR)** — Experimental in Next 15; not production-ready for user-specific data at the scale we need. Revisit when stable.
- **`en` locale Playwright coverage** — Deferred to keep spec count bounded; `en` stays in manual UAT rotation.
- **LCP / Core Web Vitals instrumentation** — GA-4 option B. Deferred; Vercel Analytics already captures RUM for production pages, which is sufficient for now.
- **Sentry Performance tracing on RSC prefetch spans** — Nice-to-have observability; add opportunistically if Phase 38 post-launch shows unclear failure modes.
- **Settings page (not in 6-page scope)** — Heavy right rail + 11 sections; was the other page in the "first-visit lag" symptom cluster. Not included in Phase 38 because it has different data characteristics (form-heavy, client-only state). Consider a 38.x follow-up.

### Reviewed Todos (not folded)
None — no pending todos matched Phase 38 scope at gather time.

</deferred>

---

*Phase: 38-first-load-performance*
*Context gathered: 2026-04-20*
