---
phase: 04-setup-page
plan: 01
subsystem: ui
tags: [i18n, validation, route-guard, zustand, next-intl, react]

# Dependency graph
requires:
  - phase: 03-auth-page
    provides: AuthGuard hydration pattern, AuthDoodles, (auth) layout, zustand auth store
provides:
  - SetupGuard component (auth + !tokenConfigured check)
  - Token format validation functions (validateCanvasToken, validateEdToken)
  - i18n setup namespace in en.json and zh.json (42 keys each)
  - /[locale]/setup route entry with Suspense + SetupGuard
  - Restructured (auth) layout (guards at page level, layout provides only visuals)
affects: [04-setup-page plans 02 and 03, future settings page]

# Tech tracking
tech-stack:
  added: []
  patterns: [page-level guard pattern replacing layout-level guard, token format regex validation]

key-files:
  created:
    - frontend/lib/validation/token.ts
    - frontend/components/setup/SetupGuard.tsx
    - frontend/app/[locale]/(auth)/setup/page.tsx
    - frontend/__tests__/setup/token-validation.test.ts
    - frontend/__tests__/setup/SetupGuard.test.tsx
  modified:
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/app/[locale]/(auth)/layout.tsx
    - frontend/app/[locale]/(auth)/auth/page.tsx

key-decisions:
  - "Moved guards from layout to page level: AuthGuard wraps auth/page.tsx, SetupGuard wraps setup/page.tsx"
  - "Canvas token regex /^\\d{50,100}$/ -- generous range for numeric-only tokens"
  - "Ed token regex /^[a-zA-Z0-9_-]{10,50}$/ -- alphanumeric with hyphens/underscores"

patterns-established:
  - "Page-level guard pattern: each page in (auth) route group wraps its own guard instead of layout-level AuthGuard"
  - "SetupGuard: inverse of AuthGuard -- requires isAuthenticated + !tokenConfigured, redirects accordingly"

requirements-completed: [UI-10, PLAT-01]

# Metrics
duration: 6min
completed: 2026-03-22
---

# Phase 04 Plan 01: Setup Page Foundation Summary

**SetupGuard, token format validation (Canvas numeric + Ed alphanumeric), i18n setup namespace (42 keys EN/ZH), and (auth) layout restructure moving guards to page level**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-22T02:36:57Z
- **Completed:** 2026-03-22T02:43:24Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Token format validation with regex for Canvas (numeric 50-100 chars) and Ed (alphanumeric 10-50 chars) with whitespace trimming
- SetupGuard component using identical zustand hydration pattern as AuthGuard, with inverse redirect logic
- Complete i18n setup namespace in both en.json and zh.json with 42 keys (welcome, tutorial, tokens, success sections)
- Restructured (auth) layout to only provide visual scaffolding; guards moved to individual page components
- Setup route entry at /[locale]/setup with SetupGuard + Suspense + placeholder content

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n setup namespace, token validation, and SetupGuard with tests** - `c94c099` (feat)
2. **Task 2: Restructure (auth) layout and create /setup route entry** - `5b25b00` (feat)

## Files Created/Modified
- `frontend/lib/validation/token.ts` - validateCanvasToken and validateEdToken format validation functions
- `frontend/components/setup/SetupGuard.tsx` - Route guard requiring auth + !tokenConfigured
- `frontend/app/[locale]/(auth)/setup/page.tsx` - Setup route entry with SetupGuard + Suspense
- `frontend/__tests__/setup/token-validation.test.ts` - 10 test cases for token validation
- `frontend/__tests__/setup/SetupGuard.test.tsx` - 4 test cases for guard redirect scenarios
- `frontend/messages/en.json` - Added setup namespace with 42 i18n keys
- `frontend/messages/zh.json` - Added setup namespace with 42 i18n keys (Chinese translations)
- `frontend/app/[locale]/(auth)/layout.tsx` - Removed AuthGuard wrapper, layout now provides only visual scaffolding
- `frontend/app/[locale]/(auth)/auth/page.tsx` - Added AuthGuard wrapping at page level

## Decisions Made
- Moved guards from layout to page level: each page in (auth) route group wraps its own guard. This enables the auth page (redirects authenticated users away) and setup page (requires authenticated users) to coexist in the same route group.
- Canvas token regex uses generous range (50-100 digits) to accommodate token length variations.
- Ed token regex allows hyphens and underscores in addition to alphanumeric characters.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- SetupGuard, token validation, and i18n keys are ready for Plan 02 (StepIndicator, WelcomeStep, TutorialStep, GuideCard components) and Plan 03 (TokenStep, SuccessStep, SetupPage orchestrator)
- The placeholder content in setup/page.tsx will be replaced with the real SetupPage component in Plan 03
- All existing auth tests pass unchanged after layout restructure

---
*Phase: 04-setup-page*
*Completed: 2026-03-22*
