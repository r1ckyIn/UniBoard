---
phase: 04-setup-page
plan: 05
subsystem: ui
tags: [roughjs, hand-drawn, url-params, next-intl, language-switch]

# Dependency graph
requires:
  - phase: 04-setup-page/04-01
    provides: "SetupPage component with step state, RoughCard, Suspense boundary"
  - phase: 04-setup-page/04-03
    provides: "LanguageSwitcher that preserves search params during locale switch"
provides:
  - "Two-layer RoughCard with visible hand-drawn borders (outer padding gap + inner bg)"
  - "URL-persisted setup step state that survives language switch remounts"
affects: [setup-page, design-system]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-layer card structure: outer wrapper (rough.js border visible) + inner wrapper (bg, content)"
    - "URL search param persistence for component state across remounts"

key-files:
  created: []
  modified:
    - "frontend/components/design-system/RoughCard.tsx"
    - "frontend/components/setup/SetupPage.tsx"
    - "frontend/__tests__/design-system/RoughCard.test.tsx"
    - "frontend/__tests__/setup/SetupPage.test.tsx"

key-decisions:
  - "Two-layer RoughCard: outer div has 10px padding gap with no bg so rough.js border wobble is visible against page cream background"
  - "Step persistence via URL search params (?step=N) instead of sessionStorage or cookie -- LanguageSwitcher already preserves search params"

patterns-established:
  - "Two-layer rough border pattern: outer wrapper (padding, no bg, SVG) + inner wrapper (bg, shadow, content)"
  - "URL param state persistence pattern: useSearchParams for read + router.replace for write"

requirements-completed: [UI-10]

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 04 Plan 05: Gap Closure - RoughCard Borders & Language Switch Step Persistence Summary

**Two-layer RoughCard restructure for visible hand-drawn borders + URL search param persistence for setup step across language switches**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-22T04:24:54Z
- **Completed:** 2026-03-22T04:30:43Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Restructured RoughCard from single-layer (border hidden by bg) to two-layer (10px padding gap, border visible against page background)
- Setup step now persists as ?step=N URL param, surviving language switch remounts
- Added 4 new tests for URL param persistence behavior
- All 136 tests pass, TypeScript clean, build succeeds

## Task Commits

Each task was committed atomically:

1. **Task 1: Restructure RoughCard to two-layer approach** - `a2c56da` (fix)
2. **Task 2: Persist setup step in URL search params** - `083fd5a` (fix)

## Files Created/Modified
- `frontend/components/design-system/RoughCard.tsx` - Two-layer structure: outer (padding, SVG) + inner (bg, shadow, content)
- `frontend/components/setup/SetupPage.tsx` - useSearchParams for initial step, router.replace on step change
- `frontend/__tests__/design-system/RoughCard.test.tsx` - Updated assertions for two-layer structure
- `frontend/__tests__/setup/SetupPage.test.tsx` - Added mocks for useSearchParams/useRouter/usePathname, 4 new URL param tests

## Decisions Made
- Used 10px padding gap (matching prototype's setup-card CSS) for RoughCard outer wrapper
- Step persistence via URL search params over sessionStorage -- leverages existing LanguageSwitcher search param preservation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 plans for Phase 04 (setup-page) are now complete
- Ready for PR cycle and merge

---
*Phase: 04-setup-page*
*Completed: 2026-03-22*
