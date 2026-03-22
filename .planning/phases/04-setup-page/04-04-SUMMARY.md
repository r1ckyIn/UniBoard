---
phase: 04-setup-page
plan: 04
subsystem: ui
tags: [canvas-token, validation, i18n, hydration, next-intl]

# Dependency graph
requires:
  - phase: 04-setup-page/03
    provides: "Setup page 3-step flow with TokenInput/TokenStep/SuccessStep"
provides:
  - "Canvas token validation accepting real {id}~{secret} format"
  - "Clickable clear button on invalid token inputs"
  - "SuccessStep that shows courses before navigating to dashboard"
  - "Clean not-found.tsx without hydration errors"
affects: [setup-page, auth-flow]

# Tech tracking
tech-stack:
  added: []
  patterns: ["onClear callback pattern for interactive status icons"]

key-files:
  created: []
  modified:
    - "frontend/lib/validations/token.ts"
    - "frontend/components/setup/TokenInput.tsx"
    - "frontend/components/setup/TokenStep.tsx"
    - "frontend/components/setup/SuccessStep.tsx"
    - "frontend/app/not-found.tsx"
    - "frontend/messages/en.json"
    - "frontend/messages/zh.json"
    - "frontend/__tests__/setup/token-validation.test.ts"
    - "frontend/__tests__/setup/TokenStep.test.tsx"

key-decisions:
  - "Canvas regex /^\\d+~[A-Za-z0-9]{20,}$/ accepts real Canvas API token format"
  - "XCircle renders as button when onClear provided, div otherwise (backward compatible)"
  - "setTokenConfigured deferred to handleGoToDashboard click to prevent premature unmount by SetupGuard"
  - "not-found.tsx uses div with minHeight:100vh instead of html/body wrapper"

patterns-established:
  - "Interactive vs decorative icon pattern: provide onClear callback to make icon clickable"

requirements-completed: [UI-10, PLAT-01]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 04 Plan 04: Gap Closure Summary

**Fixed Canvas token regex to accept real {id}~{secret} format, added clickable clear buttons, fixed SuccessStep timing/routing, and removed not-found hydration error**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T04:24:57Z
- **Completed:** 2026-03-22T04:28:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Canvas token validation now accepts real Canvas API tokens with `{numeric_id}~{alphanumeric_secret}` format
- XCircle icon on invalid tokens is now a clickable button that clears the input and resets to idle state
- SuccessStep shows 5 mock course names before "Go to Dashboard" button appears (setTokenConfigured deferred to click handler)
- Dashboard navigation corrected from `/dashboard` to `/` (route group has no URL segment)
- not-found.tsx hydration error fixed by removing nested html/body tags
- Tutorial i18n updated with 120-day Canvas expiry and Ed permanent token info

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Canvas token regex, add onClear to TokenInput, update tutorial i18n** - `731b420` (fix)
2. **Task 2: Fix SuccessStep course display, dashboard route, and not-found hydration** - `eb1f5c5` (fix)

## Files Created/Modified
- `frontend/lib/validations/token.ts` - Canvas regex changed from pure-digit to {id}~{secret} format
- `frontend/__tests__/setup/token-validation.test.ts` - Test tokens updated to realistic Canvas format
- `frontend/__tests__/setup/TokenStep.test.tsx` - Test constant updated for new Canvas token format
- `frontend/components/setup/TokenInput.tsx` - Added onClear prop, XCircle renders as button when onClear provided
- `frontend/components/setup/TokenStep.tsx` - Wired onClear callbacks for both Canvas and Ed inputs
- `frontend/components/setup/SuccessStep.tsx` - Deferred setTokenConfigured to click handler, fixed route to /
- `frontend/app/not-found.tsx` - Removed html/body wrapper to prevent hydration mismatch
- `frontend/messages/en.json` - Updated Canvas expiry info, error format, Ed permanence note
- `frontend/messages/zh.json` - Updated Canvas expiry info, error format, Ed permanence note

## Decisions Made
- Canvas regex `/^\d+~[A-Za-z0-9]{20,}$/` chosen to match real Canvas API token format (numeric ID + tilde + alphanumeric secret)
- onClear renders XCircle as `<button>` vs `<div>` for backward compatibility when onClear is not provided
- setTokenConfigured moved from setTimeout to click handler to prevent SetupGuard from unmounting SuccessStep mid-sync
- not-found.tsx uses `<div>` with `minHeight: "100vh"` instead of `<html>`/`<body>` since Next.js root layout already wraps it

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated TokenStep test tokens to match new Canvas regex**
- **Found during:** Task 2 (verification)
- **Issue:** TokenStep.test.tsx used `"1234567890".repeat(7)` (pure digits) which no longer matches the new Canvas regex
- **Fix:** Changed `VALID_CANVAS_TOKEN` to `"3156~PR7xCaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcde"`
- **Files modified:** `frontend/__tests__/setup/TokenStep.test.tsx`
- **Verification:** All 132 tests pass
- **Committed in:** eb1f5c5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Test token constant directly caused by Task 1's regex change. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 UAT gap issues from setup page are resolved
- Ready for Plan 05 (if exists) or phase completion/PR cycle

---
*Phase: 04-setup-page*
*Completed: 2026-03-22*
