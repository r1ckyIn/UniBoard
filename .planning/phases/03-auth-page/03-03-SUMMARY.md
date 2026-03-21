---
phase: 03-auth-page
plan: 03
subsystem: ui
tags: [react-hook-form, next-intl, search-params, scrollbar, validation]

# Dependency graph
requires:
  - phase: 03-auth-page (plan 02)
    provides: Auth forms with login/register, animations, success overlay
provides:
  - Scrollbar-stable layout (no shift between login/register)
  - Submit-only form validation (no premature blur errors)
  - URL-persisted form mode (?mode=register) surviving locale switches
affects: [03-auth-page plan 04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "useSearchParams + window.history.replaceState for URL state sync without full navigation"
    - "Suspense boundary wrapping useSearchParams consumers in Next.js 15"

key-files:
  created: []
  modified:
    - frontend/app/globals.css
    - frontend/components/auth/LoginForm.tsx
    - frontend/components/auth/RegisterForm.tsx
    - frontend/components/auth/AuthPage.tsx
    - frontend/components/auth/LanguageSwitcher.tsx
    - frontend/app/[locale]/(auth)/auth/page.tsx
    - frontend/app/[locale]/(auth)/layout.tsx
    - frontend/__tests__/auth/LoginForm.test.tsx

key-decisions:
  - "URL search params (?mode=register) over useState for form mode persistence across locale switches"
  - "window.history.replaceState over router.replace to avoid full navigation on mode toggle"

patterns-established:
  - "Suspense boundary required for useSearchParams consumers in Next.js 15 static builds"

requirements-completed: [UI-09]

# Metrics
duration: 4min
completed: 2026-03-21
---

# Phase 03 Plan 03: Gap Closure Summary

**Fixed scrollbar layout shift, premature blur validation, and language switch resetting form mode via overflow-y:scroll, onSubmit validation, and URL search params persistence**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-21T09:18:17Z
- **Completed:** 2026-03-21T09:22:27Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Eliminated horizontal layout shift when switching between login (short form) and register (tall form) by forcing permanent scrollbar via `overflow-y: scroll`
- Changed both LoginForm and RegisterForm validation from `onBlur` to `onSubmit` so errors only appear after user clicks submit
- Persisted form mode in URL search params (`?mode=register`) so language switches preserve the current form state
- Updated LoginForm test to validate via submit button click instead of blur event

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix scrollbar shift and validation mode** - `f421dea` (fix)
2. **Task 2: Preserve form mode across language switches** - `5b008c2` (fix)

## Files Created/Modified
- `frontend/app/globals.css` - Added `overflow-y: scroll` to html rule
- `frontend/components/auth/LoginForm.tsx` - Changed validation mode from onBlur to onSubmit
- `frontend/components/auth/RegisterForm.tsx` - Changed validation mode from onBlur to onSubmit
- `frontend/__tests__/auth/LoginForm.test.tsx` - Updated blur test to submit-click test
- `frontend/components/auth/AuthPage.tsx` - Read/write form mode from URL search params
- `frontend/components/auth/LanguageSwitcher.tsx` - Preserve search params on locale switch
- `frontend/app/[locale]/(auth)/auth/page.tsx` - Added Suspense boundary for useSearchParams
- `frontend/app/[locale]/(auth)/layout.tsx` - Added Suspense boundary for LanguageSwitcher

## Decisions Made
- Used `window.history.replaceState` instead of `router.replace` when toggling mode to avoid full navigation/remount
- Persisted mode via URL search params rather than localStorage for deep-linkability and SSR compatibility

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Suspense boundaries for useSearchParams**
- **Found during:** Task 2 (Preserve form mode across language switches)
- **Issue:** Next.js 15 build failed with "useSearchParams() should be wrapped in a suspense boundary" for both auth page and layout
- **Fix:** Wrapped AuthPage in Suspense in page.tsx and LanguageSwitcher in Suspense in layout.tsx
- **Files modified:** `frontend/app/[locale]/(auth)/auth/page.tsx`, `frontend/app/[locale]/(auth)/layout.tsx`
- **Verification:** `pnpm build` passes, `pnpm typecheck` passes, `pnpm lint` passes with zero warnings
- **Committed in:** 5b008c2 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Required for Next.js 15 compatibility. No scope creep.

## Issues Encountered
None beyond the auto-fixed Suspense boundary issue.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three UAT gap issues (scrollbar shift, blur validation, lang switch reset) are resolved
- Plan 04 (remaining gap closure) can proceed
- All auth tests pass (51/51), build succeeds, lint clean, types clean

---
*Phase: 03-auth-page*
*Completed: 2026-03-21*
