---
phase: 03-frontend-dashboard
plan: 01
subsystem: ui
tags: [nextjs, tailwind-v4, roughjs, tanstack-query, next-intl, ky, zustand, vitest]

# Dependency graph
requires:
  - phase: 02-core-services-api
    provides: REST API endpoints, Pydantic schemas for TypeScript type mirroring
provides:
  - Next.js 15 project with Tailwind v4 design system
  - ky API client with JWT auth and response unwrapping
  - TypeScript types mirroring all backend Pydantic schemas
  - 6 Rough.js design system components (RoughCard, RoughProgressBar, RoughDonut, RoughTimeline, RoughNotationWrapper, HeroDoodles)
  - Three-column layout shell (Sidebar + main + RightPanel)
  - Auth pages (login with form-data, register)
  - 3-step onboarding flow (welcome, token tutorial, paste tokens)
  - next-intl i18n with en/zh locales
  - Zustand UI store
  - GPA utility functions with 18 unit tests
  - Backend CORS middleware for localhost:3000
affects: [03-02, 03-03]

# Tech tracking
tech-stack:
  added: [next@15.5.12, react@19.1.0, tailwindcss@4.2.1, roughjs@4.6.6, "@tanstack/react-query@5.90.21", next-intl@4.8.3, ky@1.14.3, zustand@5.0.12, lucide-react@0.577.0, date-fns@4.1.0, clsx@2.1.1, vitest@4.1.0]
  patterns: [Rough.js client-only SVG wrapper with ResizeObserver, ky prefixUrl with JWT beforeRequest hook, SuccessResponse unwrap pattern, form-data login via URLSearchParams, Tailwind v4 @theme CSS variables, next-intl App Router locale routing]

key-files:
  created:
    - frontend/package.json
    - frontend/app/globals.css
    - frontend/lib/api/client.ts
    - frontend/lib/api/types.ts
    - frontend/lib/api/endpoints.ts
    - frontend/lib/auth/tokens.ts
    - frontend/lib/hooks/useAuth.ts
    - frontend/lib/hooks/useUser.ts
    - frontend/lib/hooks/useSync.ts
    - frontend/lib/stores/ui.ts
    - frontend/lib/i18n/routing.ts
    - frontend/lib/i18n/request.ts
    - frontend/lib/utils/gpa.ts
    - frontend/lib/utils/dates.ts
    - frontend/middleware.ts
    - frontend/components/design-system/RoughCard.tsx
    - frontend/components/design-system/RoughProgressBar.tsx
    - frontend/components/design-system/RoughDonut.tsx
    - frontend/components/design-system/RoughTimeline.tsx
    - frontend/components/design-system/RoughNotationWrapper.tsx
    - frontend/components/design-system/HeroDoodles.tsx
    - frontend/components/layout/Sidebar.tsx
    - frontend/components/layout/RightPanel.tsx
    - frontend/components/layout/AppShell.tsx
    - frontend/components/layout/QueryProvider.tsx
    - frontend/components/shared/SkeletonCard.tsx
    - frontend/components/shared/ErrorBoundary.tsx
    - frontend/components/onboarding/StepIndicator.tsx
    - frontend/components/onboarding/TokenGuide.tsx
    - frontend/app/[locale]/(auth)/login/page.tsx
    - frontend/app/[locale]/(auth)/register/page.tsx
    - frontend/app/[locale]/(onboarding)/setup/page.tsx
    - frontend/app/[locale]/(dashboard)/page.tsx
    - frontend/app/[locale]/(dashboard)/timetable/page.tsx
    - frontend/__tests__/lib/utils/gpa.test.ts
    - frontend/__tests__/design-system/RoughCard.test.tsx
  modified:
    - src/web/main.py

key-decisions:
  - "Google Fonts @import placed before @import 'tailwindcss' to avoid CSS ordering warning"
  - "ResizeObserver polyfilled in vitest setup for jsdom environment"
  - "roughjs mocked in RoughCard test since jsdom lacks full SVG support"
  - "QueryProvider as separate client component to avoid server/client boundary issues"
  - "RoughCard accepts optional style prop for inline styling flexibility"
  - "Login uses URLSearchParams with username field (not email) per OAuth2PasswordRequestForm"

patterns-established:
  - "Rough.js components: 'use client' + useRef + useCallback + ResizeObserver with dimension guard"
  - "API calls: api.get/post via ky, unwrap<T>() for SuccessResponse envelope"
  - "Auth hooks: useLogin sends form-data, useRegister sends JSON"
  - "Design tokens: all in globals.css @theme block, referenced via var(--color-*)"
  - "Locale routing: /[locale]/ prefix with generateStaticParams for en/zh"

requirements-completed: [PLAT-01, PLAT-02, UI-07]

# Metrics
duration: 14min
completed: 2026-03-17
---

# Phase 03 Plan 01: Frontend Foundation Summary

**Next.js 15 frontend with Tailwind v4 design system (Rough.js hand-drawn borders, paper texture), ky API client with JWT auth, complete TypeScript type coverage, three-column layout shell, split-screen auth pages, and 3-step onboarding flow with i18n (en/zh)**

## Performance

- **Duration:** 14 min
- **Started:** 2026-03-16T22:05:27Z
- **Completed:** 2026-03-16T22:19:32Z
- **Tasks:** 3
- **Files modified:** 45+ (37 created, 1 modified)

## Accomplishments
- Complete Next.js 15 project scaffolded with all 12 production dependencies and 7 dev dependencies
- Tailwind v4 design system with all prototype CSS variables, paper grain overlay, and ruled lines
- 6 Rough.js design system components implementing hand-drawn card borders, progress bars, donut chart, timeline, text annotations, and background doodles
- ky HTTP client with JWT auth interceptor, retry logic, and SuccessResponse<T> unwrapping
- TypeScript types mirroring all 25+ backend Pydantic schemas (auth, user, GPA, deadlines, materials, intelligence, sync)
- Three-column layout shell (collapsible sidebar with 7 nav items, main content, sticky right panel)
- Split-screen login page (form-data via URLSearchParams) and register page with client-side validation
- 3-step onboarding flow: welcome, token tutorial with step-by-step guides, paste + validate Canvas and Ed tokens
- next-intl with en/zh locale routing, 60+ translation keys per language
- 18 passing unit tests (15 GPA utility + 3 RoughCard smoke tests)
- Backend CORS middleware enabling frontend connection to API

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js, API client, types, auth hooks, i18n, stores, and CORS** - `8aa94d3` (feat)
2. **Task 2: Design system components, vitest infrastructure, utility functions, and unit tests** - `3a12b91` (feat)
3. **Task 3: Layout shell, auth pages, and onboarding flow** - `ac2c469` (feat)

## Files Created/Modified
- `src/web/main.py` - Added CORSMiddleware allowing localhost:3000
- `frontend/app/globals.css` - Tailwind v4 theme with all prototype CSS variables, paper grain, ruled lines
- `frontend/lib/api/client.ts` - ky HTTP client with JWT auth and response unwrapping
- `frontend/lib/api/types.ts` - TypeScript interfaces for all Pydantic schemas
- `frontend/lib/api/endpoints.ts` - API endpoint constants
- `frontend/lib/auth/tokens.ts` - localStorage token management helpers
- `frontend/lib/hooks/useAuth.ts` - Login (form-data), register, logout, refresh mutations
- `frontend/lib/hooks/useUser.ts` - User profile and token config hooks
- `frontend/lib/hooks/useSync.ts` - Sync status and trigger hooks
- `frontend/lib/stores/ui.ts` - Zustand store for sidebar and locale state
- `frontend/lib/i18n/routing.ts` - next-intl routing config (en/zh)
- `frontend/lib/utils/gpa.ts` - Client-side WAM/GPA calculation utilities
- `frontend/lib/utils/dates.ts` - Date formatting helpers using date-fns
- `frontend/components/design-system/RoughCard.tsx` - Hand-drawn SVG card border
- `frontend/components/design-system/RoughProgressBar.tsx` - Canvas-based progress bar
- `frontend/components/design-system/RoughDonut.tsx` - SVG donut chart with arcs
- `frontend/components/design-system/RoughTimeline.tsx` - Vertical timeline with dots
- `frontend/components/design-system/RoughNotationWrapper.tsx` - Staggered text annotations
- `frontend/components/design-system/HeroDoodles.tsx` - Background doodle decorations
- `frontend/components/layout/Sidebar.tsx` - 7-item nav, hover-expand 68px to 224px
- `frontend/components/layout/RightPanel.tsx` - Sticky 300px panel with defaults
- `frontend/components/layout/AppShell.tsx` - Three-column layout assembly
- `frontend/components/layout/QueryProvider.tsx` - TanStack Query client provider
- `frontend/components/shared/SkeletonCard.tsx` - Animated loading placeholder
- `frontend/components/shared/ErrorBoundary.tsx` - Error boundary with retry button
- `frontend/components/onboarding/StepIndicator.tsx` - 3-step progress indicator
- `frontend/components/onboarding/TokenGuide.tsx` - Token retrieval tutorial
- `frontend/app/[locale]/(auth)/login/page.tsx` - Split-screen login with form-data
- `frontend/app/[locale]/(auth)/register/page.tsx` - Split-screen register
- `frontend/app/[locale]/(onboarding)/setup/page.tsx` - 3-step onboarding
- `frontend/app/[locale]/(dashboard)/page.tsx` - Dashboard placeholder
- `frontend/app/[locale]/(dashboard)/timetable/page.tsx` - Coming Soon placeholder

## Decisions Made
- Google Fonts @import placed before `@import 'tailwindcss'` to avoid CSS ordering warning in Tailwind v4 processing
- ResizeObserver polyfilled in vitest setup since jsdom does not include it
- roughjs module mocked in RoughCard tests because jsdom lacks full SVG createElement support
- QueryProvider extracted as separate client component to cleanly handle server/client component boundary
- RoughCard extended with optional `style` prop for inline styling flexibility
- Login mutation uses `URLSearchParams` with `username` field (not `email`) matching OAuth2PasswordRequestForm spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] CSS @import ordering in Tailwind v4**
- **Found during:** Task 1 (globals.css creation)
- **Issue:** Placing `@import url(...)` after `@import "tailwindcss"` caused a CSS warning because Tailwind inlines its content, pushing the URL import after other rules
- **Fix:** Moved Google Fonts @import before Tailwind @import
- **Files modified:** frontend/app/globals.css
- **Verification:** Build produces no warnings
- **Committed in:** 8aa94d3 (Task 1 commit)

**2. [Rule 3 - Blocking] ResizeObserver missing in jsdom**
- **Found during:** Task 2 (RoughCard test execution)
- **Issue:** jsdom does not provide ResizeObserver, causing RoughCard tests to crash with "ResizeObserver is not defined"
- **Fix:** Added ResizeObserver polyfill to frontend/src/test/setup.ts
- **Files modified:** frontend/src/test/setup.ts
- **Verification:** All 18 tests pass
- **Committed in:** 3a12b91 (Task 2 commit)

**3. [Rule 1 - Bug] RoughCard missing style prop**
- **Found during:** Task 3 (timetable page build)
- **Issue:** Timetable page passed `style` prop to RoughCard which was not declared in the interface, causing TypeScript error
- **Fix:** Added optional `style?: CSSProperties` prop to RoughCardProps interface and passed through to container div
- **Files modified:** frontend/components/design-system/RoughCard.tsx
- **Verification:** Build succeeds
- **Committed in:** ac2c469 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All auto-fixes necessary for correct build and test execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All design system components, layout shell, API client, and auth flow are ready for Plans 03-02 and 03-03
- Plan 03-02 can build Dashboard (hero, stats, grades, timeline, donut), Courses, and Deadlines pages using existing components
- Plan 03-03 can build Predict (using gpa.ts utilities), Digest, and Settings pages
- Backend CORS is enabled, all hooks and types are defined

## Self-Check: PASSED

- All 35 key files verified present on disk
- All 3 task commits (8aa94d3, 3a12b91, ac2c469) verified in git log
- `pnpm build` exits 0 with all routes compiled
- `pnpm test --run` exits 0 with 18/18 tests passing
- Backend CORS import verified

---
*Phase: 03-frontend-dashboard*
*Completed: 2026-03-17*
