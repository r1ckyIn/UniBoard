---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: milestone
status: phase-complete
stopped_at: Completed 06-02-PLAN.md
last_updated: "2026-03-23T02:59:07Z"
progress:
  total_phases: 24
  completed_phases: 6
  total_plans: 29
  completed_plans: 29
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-20)

**Core value:** Help students get the highest possible GPA by surfacing only grade-relevant information from Canvas and Ed in one place
**Current focus:** Phase 06 — courses-page

## Current Position

Phase: 06 (courses-page) — COMPLETE
Plan: 2 of 2 (all complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 6
- Average duration: 6.3min
- Total execution time: 0.63 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 2/2 | 15min | 7.5min |

**Recent Trend:**

- Last 5 plans: 01-02 (7min), 02-01 (7min), 02-03 (6min), 02-04 (8min), 02-05 (4min)
- Trend: stable

*Updated after each plan completion*
| Phase 02 P01 | 7min | 3 tasks | 9 files |
| Phase 02 P03 | 6min | 1 task | 12 files |
| Phase 02 P04 | 8min | 2 tasks | 9 files |
| Phase 02 P02 | 9min | 2 tasks | 23 files |
| Phase 02 P05 | 4min | 2 tasks | 13 files |
| Phase 03 P01 | 6min | 2 tasks | 11 files |
| Phase 03 P02 | 5min | 2 tasks | 13 files |
| Phase 03 P03 | 4min | 2 tasks | 8 files |
| Phase 04 P01 | 6min | 2 tasks | 9 files |
| Phase 04 P02 | 4min | 2 tasks | 6 files |
| Phase 04 P03 | 7min | 2 tasks | 7 files |
| Phase 04 P04 | 3min | 2 tasks | 9 files |
| Phase 04 P05 | 5min | 2 tasks | 4 files |
| Phase 05 P00 | 3min | 2 tasks | 13 files |
| Phase 05 P01 | 5min | 2 tasks | 6 files |
| Phase 05 P02 | 6min | 2 tasks | 4 files |
| Phase 05 P04 | 3min | 2 tasks | 4 files |
| Phase 05 P03 | 3min | 3 tasks | 4 files |
| Phase 05 P05 | 5min | 2 tasks | 5 files |
| Phase 05 P07 | 2min | 1 tasks | 1 files |
| Phase 05 P06 | 3min | 2 tasks | 9 files |
| Phase 05 P08 | 2min | 2 tasks | 10 files |
| Phase 05 P09 | 5min | 2 tasks | 7 files |
| Phase 05 P10 | 3min | 2 tasks | 6 files |
| Phase 06 P01 | 3min | 2 tasks | 7 files |
| Phase 06 P02 | 5min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Fine granularity — each page gets its own phase in M1 (12 phases)
- [Roadmap]: Contract-first — Phase 2 defines OpenAPI spec before any pages are built
- [Roadmap]: 24 phases total across 4 milestones (M1:12, M2:5, M3:4, M4:3)
- [01-01]: Used hasLocale() from next-intl for locale validation
- [01-01]: Root layout handles fonts only; locale layout wraps NextIntlClientProvider
- [01-01]: ResizeObserver polyfill in test setup for future Rough.js tests
- [01-02]: Used withClientOnly() wrapper for RoughCard in RightPanel to avoid hydration mismatches
- [01-02]: Removed old app/[locale]/page.tsx in favor of (dashboard)/page.tsx route group
- [01-02]: RightPanel hidden on screens below xl (1280px) via hidden xl:flex
- [01-02]: Imported rough-notation types from rough-notation/lib/model.js (not directly exported)
- [Phase 02]: Single YAML spec over split-by-domain: ~32 endpoints fits comfortably in one file
- [Phase 02]: vi.hoisted() pattern for ky mock: resolves let-before-init issues with vi.mock factory hoisting
- [02-03]: Explicit field projection over destructuring to avoid unused-variable lint warnings
- [02-03]: CourseOutline generated from courseDetails at request time instead of separate fixture file
- [02-03]: Discussion filtering uses switch/case for 4 filter modes (high_value, endorsed, staff, all)
- [02-04]: Health endpoint uses inline NextResponse.json (no delay/error simulation)
- [02-04]: Search filters on both title and snippet fields for broader matching
- [02-04]: Notifications apply unread_only filter before pagination for accurate page counts
- [Phase 02]: Base64 index-based cursors for mockPaginatedResponse for generic compatibility
- [Phase 02]: Next.js 15 Promise-based params for dynamic [platform] route segments
- [02-05]: All hooks follow keys-factory -> queryOptions-factory -> thin-wrapper pattern
- [02-05]: Auth mutations use useAuthStore.getState() (not hook) since callbacks run outside render
- [02-05]: useSearch enabled guard at q.length >= 2 to prevent empty API calls
- [02-05]: useExportData uses enabled: false for on-demand GDPR export fetching
- [Phase 03]: Used zod default import (not zod/v4 subpath) since @hookform/resolvers auto-detects v4
- [Phase 03]: Auth layout uses 'use client' since it wraps AuthGuard + LanguageSwitcher + Toaster
- [Phase 03]: AuthDoodles uses full-screen scatter (4 quadrants + center concentric circles) at 0.15-0.20 opacity
- [Phase 03-02]: Tuple cast [number,number,number,number] for Motion ease arrays to satisfy TypeScript strict mode
- [Phase 03-02]: SuccessOverlay positioned absolutely over AuthFormCard using relative wrapper in AuthPage
- [Phase 03-02]: BrandPanel uses min-[900px]:flex for exact 900px breakpoint matching prototype
- [Phase 03]: URL search params (?mode=register) over useState for form mode persistence across locale switches
- [Phase 03]: Suspense boundary required for useSearchParams consumers in Next.js 15 static builds
- [Phase 04]: Moved guards from (auth) layout to page level: AuthGuard wraps auth/page.tsx, SetupGuard wraps setup/page.tsx
- [Phase 04]: Canvas token regex /^\d{50,100}$/ for numeric tokens, Ed token regex /^[a-zA-Z0-9_-]{10,50}$/ for alphanumeric
- [04-02]: GuideCard uses CSS max-height transition (0/500px) for collapsible animation
- [04-02]: Step icons (ExternalLink, Settings, Key, Copy) as decorative elements alongside numbered circles
- [Phase 04]: Used scope 'all' for sync trigger API body matching OpenAPI spec instead of domains array
- [Phase 04]: Tailwind animate-spin with custom animation-duration for spinner instead of styled-jsx
- [Phase 04]: Canvas regex /^\d+~[A-Za-z0-9]{20,}$/ accepts real Canvas API token format with tilde separator
- [Phase 04]: setTokenConfigured deferred to click handler to prevent SetupGuard unmounting SuccessStep during sync
- [Phase 04]: not-found.tsx uses div wrapper (no html/body) since Next.js root layout already provides them
- [Phase 04]: Two-layer RoughCard: outer div with 10px padding gap (no bg) + inner div with bg/shadow, so rough.js border wobble is visible against page background
- [Phase 04]: URL search params (?step=N) for setup step persistence across language switches, leveraging existing LanguageSwitcher search param preservation
- [Phase 05-00]: Used it.todo() over it.skip() for cleaner vitest reporting and intent clarity
- [Phase 05]: SkeletonCard uses variant map pattern (Record<SkeletonVariant, React.FC>) instead of conditional rendering
- [Phase 05]: skeleton-shimmer animation added to globals.css @theme block (Tailwind v4 CSS config)
- [05-02]: NotificationPanel receives data as props (not calling hooks directly) for testability
- [05-02]: AvatarMenu uses button elements (not anchor tags) with onClick handlers for SPA navigation
- [05-02]: Header computes initials from displayName with first+last letter logic
- [Phase 05-04]: Native HTML dialog over custom modal for built-in focus trap and Escape handling
- [Phase 05-04]: 3-tier deadline dot opacity thresholds based on cumulative weight (0.08/0.15/0.22)
- [Phase 05]: Motion spring variants with custom delay for hero stagger (damping: 25, stiffness: 200)
- [Phase 05]: Portal-slot pattern (createPortal + #right-panel-slot) for injecting dashboard-specific content into RightPanel without modifying AppShell
- [Phase 05]: useCourseDetail fetched on-demand based on donutCourseCode derived from selected/nearest deadline
- [Phase 05]: rAF-based converge animation for AssessmentDonut to precisely control Rough.js SVG redraw timing
- [Phase 05]: Removed Rough.js from AssessmentDonut; pure SVG path rendering for smooth fills matching prototype
- [Phase 05]: Encouragement provider uses highlight placeholder in message template for consistent split rendering
- [Phase 05]: Grade band returns em-dash for null/undefined/NaN inputs
- [Phase 05]: Staggered annotation reveal: separate useState per annotation with sequential setTimeout delays (900/1500/2300ms)
- [Phase 05]: TYPE_COLORS record mapping group_name to hex colors replaces course-color palette
- [Phase 05]: Pop-out highlight (6px midAngle offset) replaces stroke-width for donut segment selection
- [Phase 05]: date-fns zhCN locale outputs full-form weekday (星期一) as standard Chinese
- [Phase 05]: Main element as scroll container (overflow-y-auto + maxHeight) for sticky sidebar positioning
- [Phase 06]: BannerDeco uses inline style pointerEvents:none + className overflow-visible for SVG layering
- [Phase 06]: roughjs mock uses createElementNS g stubs for jsdom SVG testing compatibility
- [Phase 06]: CourseCard uses own Rough.js border drawing (not RoughCard) for 6px padding vs 10px default
- [Phase 06]: withClientOnly wraps both BannerDeco and RoughProgressBar for SSR safety
- [Phase 06]: Skeleton cards inline for courses (no SkeletonCard course variant), unique 120px banner structure

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-03-23T02:59:07Z
Stopped at: Completed 06-02-PLAN.md (Phase 06 complete)
Resume file: None
