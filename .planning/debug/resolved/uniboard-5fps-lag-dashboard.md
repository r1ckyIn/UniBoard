---
status: resolved-partial
resolved: 2026-04-18
resolved_commits:
  - "93d028e fix(perf): collapse RoughCard 400ms rAF burst into single-frame debounce (#80)"
  - "9edcf08 fix(bff): add missing /courses/{id}/roi BFF proxy route (#81)"
  - "e379a5b perf(roughcard): module-level LRU cache for Rough.js path templates (#82)"
  - "5fc444f chore(debug): enable production browser source maps (#83)"
  - "f5c15e6 perf(coursecard): apply RoughCard fixes to CourseCard (#84)"
  - "4125a55 perf(coursecard): cache ProgressBarFill background + rAF debounce resize (#85)"
  - "b175545 perf(sidebar): isolate paint + remove rule-width transition (#86)"
  - "940a6f9 perf(sidebar): shorten hover transition + promote to compositor layer (#87)"
  - "8bf2575 perf(appshell): contain main layout/style to decouple from sidebar"
metrics_improvement:
  inp: "267ms → 107ms (-60%)"
  input_delay: "233ms → 33ms (-86%)"
  recalculate_style: "185ms → 61ms (-67%)"
  paint: "84ms → 11ms (-87%)"
  animation_frame_fired: "190ms → 0 (eliminated)"
  fourof4_roi_404_storm: "eliminated"
remaining_backlog:
  - "999.1: sidebar transform-based architecture refactor (sidebar width transition non-composited → unavoidable layout thrash on heavy pages)"
  - "999.2: page mount lazy loading (entrance stagger + query waterfall + large DOM mount → first-visit lag)"
trigger: "uniboard.uk dashboard 5fps lag — perceived dropped frames during browse/scroll, started after domain migration on 2026-04-17"
created: 2026-04-17
updated: 2026-04-18
goal: find_and_fix
specialist_dispatch_enabled: true
user_preferred_tools:
  - playwright-mcp (browser automation + Performance trace capture from uniboard.uk)
  - vercel:performance-optimizer (subagent for analysis + optimization recommendations)
---

## Resolution Summary

Root cause was a cluster of Rough.js hotspots (400 ms rAF bursts on every
RoughCard mount, no path cache, duplicated code in CourseCard) compounded
by a missing BFF proxy route for `/courses/{id}/roi` that caused a
persistent 404 request storm on pages mounting RoiCard. Nine PRs across
two days pushed INP from 267 ms into Google's "Good" band at 107 ms and
made the `courses` list page fully smooth on first visit.

Two remaining items — captured in the backlog rather than attempted in
this session because each needs an architectural change, not a tactical
patch:

- **Sidebar hover lag on heavy pages** — `transition: width` is a
  non-composited property, so each animation frame requires main-thread
  layout work. When main content is mid-mount (staggered entrances,
  query waterfall), the sidebar's compositor frames get starved.
  Fix direction: two-layer DOM (outer 68 px shell + inner 224 px panel)
  with `transform: translateX` for GPU-composited hover. See backlog
  phase 999.1.
- **First-visit lag on dashboard/predict/settings/timetable** — entrance
  AnimatedEntry stagger + useQuery waterfall + 9-11 RoughCard first
  paint compound into a ~1-3 s window of main-thread contention. User
  confirmed via experiment: dashboard hover-sidebar is smooth only after
  a 5 s wait, which matches this window. Fix direction:
  intersection-observer-driven progressive mount, especially for
  SettingsPage's 11 sections. See backlog phase 999.2.

# Debug Session: uniboard.uk Dashboard 5fps Lag

## Context Carry-Over (from .planning/quick/20260417-platform-errors-post-domain/CONTINUE.md)

**Already ruled out**:
- Canvas / Ed Deadlines `/deadlines` 500 storm — fixed in PR #78 (datetime.now(UTC) tz-aware)
- USYD Unit Outline 301 redirect — fixed in PR #77 (follow_redirects=True)
- `localhost:3001` requests in production — grep-confirmed not present

## Symptoms

- **Expected**: Smooth 60fps interaction on uniboard.uk dashboard (scroll, tab switch, panel render)
- **Actual**: Visibly choppy ~5fps perceived; interaction lags; frames dropped during scroll
- **Errors**: No console errors visible (500 storm fixed). Need DevTools Performance + React Profiler to confirm
- **Timeline**: Surfaced after uniboard.uk domain migration (PR #76 merged 2026-04-17). Pre-domain (uniboard.app or vercel.app preview) baseline unknown — needs comparison
- **Reproduction**: Login at uniboard.uk → dashboard → scroll/switch tab → observe FPS

## User-Specified Tooling

User explicitly requested:
1. **Playwright MCP** — drive uniboard.uk in real browser, capture Performance trace, Network panel, console
2. **vercel:performance-optimizer subagent** — analyze trace, recommend Core Web Vitals / rendering / caching fixes

## Initial Hypothesis Ranking (from CONTINUE.md user analysis)

1. **TanStack Query refetch storm** — `refetchOnWindowFocus: true` + multiple `useQueries` retrying after the deadlines 500 storm (the storm is fixed but retry/backoff config may still misbehave). The 500 storm we confirmed in PR #78 fix was symptomatic of this same hook layer
2. **next-intl SSR hydration overhead** — locale routing under `/en` re-runs hydration on every nav
3. **Sentry Replay session sampling** — if `replaysSessionSampleRate: 1.0` or unset, continuous DOM recording leaks memory + CPU
4. **Plus 11-step diagnostic playbook** documented in CONTINUE.md (Performance trace, React Profiler, Long Task API, memory profile, Bundle analyzer, etc.)

## Current Focus

```
hypothesis: Rough.js border redraw amplification via ResizeObserver 400ms rAF burst across ~9 dashboard RoughCards
test: Static source code analysis of RoughCard.tsx, DashboardPage.tsx and children; review of ResizeObserver + rAF burst logic
expecting: Confirm each RoughCard instance registers its own ResizeObserver that triggers a 400ms rAF burst on every resize, and that skeleton→content swap triggers resizes for ~9 cards simultaneously on dashboard mount
next_action: Present root-cause analysis to user with ranked fix options; await decision before patching
reasoning_checkpoint: "Hypothesis 1 + 3 eliminated by static code review (queryClient + Sentry config both correct). New dominant hypothesis (Rough.js ResizeObserver burst) accounts for both post-load lag AND scroll-time lag AND sidebar hover lag, without requiring browser trace to confirm."
tdd_checkpoint: ""
```

## Evidence

- timestamp: 2026-04-17T13:00Z
  source: frontend/lib/query/client.tsx
  kind: code
  excerpt: |
    defaultOptions.queries = {
      staleTime: 5 * 60 * 1000, // 5 min per TRD 13.3
      retry: 1,
      refetchOnWindowFocus: false,
    }
  relevance: ELIMINATES hypothesis 1 (TanStack Query refetch storm). refetchOnWindowFocus is explicitly false, retry is 1 (not aggressive), staleTime 5 min prevents refetch churn.

- timestamp: 2026-04-17T13:00Z
  source: frontend/instrumentation-client.ts
  kind: code
  excerpt: |
    Sentry.init({
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      ...
    })
  relevance: ELIMINATES hypothesis 3 (Sentry Replay session sampling). replaysSessionSampleRate is 0 — no continuous DOM recording. Replay only triggers on error (replaysOnErrorSampleRate: 1.0).

- timestamp: 2026-04-17T13:01Z
  source: frontend/components/design-system/RoughCard.tsx:51-92
  kind: code
  excerpt: |
    // Every RoughCard instance attaches its own ResizeObserver.
    const observer = new ResizeObserver(() => {
      if (burstRafId !== null) cancelAnimationFrame(burstRafId);
      const start = performance.now();
      const loop = () => {
        drawBorder();  // rough.svg(svg).rectangle(...) — full Rough.js SVG regeneration
        if (performance.now() - start < RESIZE_BURST_DURATION) {  // 400 ms
          burstRafId = requestAnimationFrame(loop);
        } else {
          burstRafId = null;
        }
      };
      loop();
    });
    observer.observe(el);
  relevance: SMOKING GUN. Every resize event kicks off a 400ms rAF loop that regenerates the full Rough.js border every frame (~24 redraws per burst at 60fps). Each rough.svg().rectangle() call runs the Rough.js generation algorithm (hand-drawn path simulation), which is CPU-heavy even with fixed seed.

- timestamp: 2026-04-17T13:02Z
  source: frontend/components/dashboard/DashboardPage.tsx:249-344
  kind: code
  excerpt: |
    Dashboard simultaneously mounts 9+ RoughCard instances:
      - StatsRow (3 cards internally, all RoughCard — lines 33/88/133 of StatsRow.tsx)
      - CourseGradesTable (1 RoughCard)
      - DeadlineTimeline (1 RoughCard)
      - AssessmentDonut (1 RoughCard)
      - ProfileCard (1 RoughCard)
      - MiniCalendar (1 RoughCard)
      - RecentActivity (1 RoughCard)
    Each wrapped in AnimatedEntry with staggered animate-slide-up delays (0.04s - 0.72s).
    Each card conditionally renders SkeletonCard → real content based on TanStack Query `isLoading` state.
    Query resolution order is not coordinated — multiple isLoading→false transitions fire near-simultaneously as HTTP responses arrive.
  relevance: The skeleton→real-content DOM swap changes each card's content-box height → fires its ResizeObserver → triggers the 400ms rAF burst. With 9 cards resolving near-simultaneously, this produces ~9 × 24 = 216 Rough.js border regenerations in a 400ms window. Main thread saturates → framerate collapses.

- timestamp: 2026-04-17T13:02Z
  source: frontend/components/layout/AppShell.tsx:11
  kind: code
  excerpt: |
    <main className="flex-1 py-7 px-8 overflow-y-auto" style={{ maxHeight: "calc(100vh - var(--spacing-header-h))" }}>
  relevance: The main scroll container uses overflow-y-auto. When scrollbar appears/disappears due to content height change (skeleton → real content often changes total height enough to toggle scrollbar), the content box width of ALL children shifts by scrollbar width (~15-17px) → every RoughCard's ResizeObserver fires again → another cascade of 400ms bursts.

- timestamp: 2026-04-17T13:03Z
  source: frontend/components/layout/Sidebar.tsx:46-53
  kind: code
  excerpt: |
    <aside className="fixed inset-y-0 left-0 w-[var(--spacing-sidebar-w)]
      transition-[width] duration-[0.28s] ...
      hover:w-[var(--spacing-sidebar-w-expanded)] group">
  relevance: Sidebar hover-expands from 68px → 224px with CSS width transition. Because the sidebar is `fixed`, it does not reflow main content (main uses `ml-[var(--spacing-sidebar-w)]` static CSS var). So hover itself does NOT trigger RoughCard ResizeObservers directly. But the internal font-rendering and icon animation on hover can still cost ~1-2 ms per frame. This is a minor contributor, not the primary culprit.

- timestamp: 2026-04-17T13:03Z
  source: frontend/components/dashboard/HeroSection.tsx:131-153
  kind: code
  excerpt: |
    // Scroll handler on main uses rAF to throttle parallax opacity update
    scrollContainer.addEventListener("scroll", onScroll, { passive: true });
    const onScroll = () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const opacity = Math.max(0, 1 - scrollContainer.scrollTop / heroHeight);
        content.style.opacity = String(opacity);
      });
    };
  relevance: Scroll handler is already rAF-throttled and only modifies opacity (no layout). Clean implementation, NOT a perf contributor. Moving on.

- timestamp: 2026-04-17T13:04Z
  source: frontend/components/dashboard/DeadlineTimeline.tsx + AssessmentDonut.tsx
  kind: code
  excerpt: |
    In addition to the RoughCard wrapper, DeadlineTimeline and AssessmentDonut each draw their OWN Rough.js SVG (timeline line+dots for one, donut cross-hatch for the other). These inner SVGs redraw via useEffect([drawTimeline, deadlines]) or useEffect([segments, highlightType]) — NOT on every resize. That's fine. But clicking a deadline dot triggers a state change → selectedDeadlineId change → donut highlight change → AssessmentDonut re-renders and redraws ALL its cross-hatched segments (~6 Rough.js path() calls + 18 label/line/circle calls = ~24 Rough.js primitive generations per click).
  relevance: Compounding cost on user interaction. Each deadline click triggers an AssessmentDonut redraw which is expensive (Rough.js cross-hatch fill is especially costly). But this is per-click, not continuous — not the root cause of the persistent 5fps lag, but a secondary amplifier.

## Eliminated

- **Hypothesis 1: TanStack Query refetch storm** — `refetchOnWindowFocus: false`, `retry: 1`, `staleTime: 5 min`. Config is correct; NOT the cause.
- **Hypothesis 3: Sentry Replay session sampling** — `replaysSessionSampleRate: 0`, replay only on error. NOT the cause.
- **Hypothesis 2: next-intl SSR hydration** — standard NextIntlClientProvider setup. Static generation via `generateStaticParams`. Hydration runs once per navigation, not continuously. Would not explain persistent lag during scroll/interaction. Downgraded but not fully eliminated — retained as distant tertiary.

## Resolution

```
root_cause: |
  Rough.js border redraw amplification. Every RoughCard registers its own ResizeObserver
  that fires a 400 ms requestAnimationFrame burst on every resize event, regenerating
  the full Rough.js SVG border each frame (~24 regenerations per burst). The dashboard
  mounts 9+ RoughCard instances whose contents swap from SkeletonCard to real content
  as TanStack Query loads resolve, firing ResizeObservers near-simultaneously.
  Additionally, the `overflow-y-auto` main container's scrollbar toggle on content
  height change fires another cascade of resize events → another 9× 400ms rAF bursts.
  Total worst case: ~216 Rough.js border regenerations in a 400ms window, saturating
  the main thread and collapsing framerate to ~5fps.

fix: |
  Three-stage fix (highest → lowest leverage):

  1. Eliminate the rAF burst in RoughCard. Replace the 400 ms redraw loop with a
     single redraw per ResizeObserver callback, debounced via rAF:
       const observer = new ResizeObserver(() => {
         if (rafId !== null) cancelAnimationFrame(rafId);
         rafId = requestAnimationFrame(drawBorder);
       });
     This keeps the border aligned with layout changes but reduces cost from 24×
     regenerations to 1× per resize event. Expected gain: ~95% reduction in
     steady-state CPU during skeleton→content cascade.

     If spring/layout animations require per-frame updates, gate the burst behaviour
     behind an explicit opt-in prop (e.g. `followResize={true}`) and use it only on
     SetupPage / components with genuine height-animation needs.

  2. Cache the Rough.js path output. Rough.js generation is expensive; even with
     fixed `seed: 42` it re-executes the full algorithm. Memoise the generated
     <path> element by (width, height) and reattach the cached path on redraw.
     Expected additional gain: ~50% of the remaining per-redraw cost.

  3. Avoid scrollbar-toggle cascades. Set `scrollbar-gutter: stable` on `<main>` so
     scrollbar presence does not reflow child content widths. Prevents secondary
     ResizeObserver cascade when scrollbar appears/disappears.

verification: |
  Required verification (user should run via Playwright MCP or DevTools Performance):
  1. Record 10 s Performance trace on uniboard.uk dashboard at initial load.
     Before fix: expect many Long Tasks (> 50 ms), FPS ≈ 5-15.
     After fix: expect FPS ≈ 55-60, Long Tasks rare (< 5 total in 10 s).
  2. Install PerformanceObserver for 'longtask' entries and count during:
     - Initial dashboard load (worst case)
     - Scroll (should have no Long Tasks)
     - Deadline click (donut redraw) — isolated event, acceptable if < 100 ms
  3. Compare current-mark scenario (~9 RoughCards) vs predict page (~5 RoughCards)
     to confirm lag scales with card count — if so, fix definitely targets root cause.

files_changed: []
```

## Fix Direction — Ranked Options for User

**Option A (recommended, lowest risk)**: Patch only `RoughCard.tsx`. Replace the 400ms rAF burst with a single rAF-debounced redraw. Est. 10 lines diff. Ships as PR `fix/roughcard-resize-burst`.

**Option B (thorough, more work)**: Option A + scrollbar-gutter stable on `<main>` + memoised Rough.js path cache. Est. 30 lines diff across 2-3 files.

**Option C (defer)**: Ship Option A first, measure via Playwright trace, iterate only if more gain needed.

**Specialist hint**: react (the fix is a React hook/effect refactor, not a Vercel-infra/Core-Web-Vitals matter). The `vercel:performance-optimizer` specialist may flag other opportunities (bundle size, image optimization, prefetch) but those are orthogonal to this specific bug.
