---
phase: 05-dashboard-page
plan: 02
subsystem: ui
tags: [react, next-intl, lucide-react, date-fns, dropdown, notification, avatar]

# Dependency graph
requires:
  - phase: 01-app-shell
    provides: Header component with hardcoded dropdowns, AppShell layout
  - phase: 02-openapi-hooks
    provides: useNotifications hook, useAuthStore, Notification type schema
provides:
  - NotificationPanel component with data-driven notification items
  - AvatarMenu component with user info and navigation actions
  - Refactored Header using extracted dropdown components
affects: [05-dashboard-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [props-driven dropdown extraction, icon-mapping-by-type pattern]

key-files:
  created:
    - frontend/components/layout/NotificationPanel.tsx
    - frontend/components/layout/AvatarMenu.tsx
  modified:
    - frontend/components/layout/Header.tsx
    - frontend/__tests__/layout/AppShell.test.tsx

key-decisions:
  - "NotificationPanel receives data as props (not calling hooks directly) for testability"
  - "AvatarMenu uses button elements (not anchor tags) with onClick handlers for SPA navigation"
  - "Header computes initials from displayName with first+last letter logic"

patterns-established:
  - "Props-driven dropdown: Dropdowns receive data via props from parent, parent owns hook calls"
  - "Icon mapping record: ICON_MAP constant keyed by notification type for extensibility"

requirements-completed: [UI-01]

# Metrics
duration: 6min
completed: 2026-03-22
---

# Phase 05 Plan 02: Header Dropdown Extraction Summary

**Data-driven NotificationPanel and AvatarMenu components replacing hardcoded Header dropdowns, with icon mapping by notification type and relative timestamps**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-22T09:36:57Z
- **Completed:** 2026-03-22T09:43:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- NotificationPanel renders notification items with type-based icon mapping (deadline/grade/token/sync), unread styling, and relative timestamps via date-fns
- AvatarMenu renders user info from auth store with 4 navigation items (Profile, Settings, API Tokens, Log out) and proper logout flow
- Header refactored to use useNotifications + useAuthStore for dynamic data, conditional unread dot, and computed avatar initials

## Task Commits

Each task was committed atomically:

1. **Task 1: NotificationPanel component** - `e27892c` (feat)
2. **Task 2: AvatarMenu component + Header refactor** - `ce20e84` (feat)

## Files Created/Modified
- `frontend/components/layout/NotificationPanel.tsx` - Data-driven notification dropdown panel with icon mapping and relative timestamps
- `frontend/components/layout/AvatarMenu.tsx` - Avatar dropdown menu with user info, navigation actions, and logout
- `frontend/components/layout/Header.tsx` - Refactored to use NotificationPanel and AvatarMenu components with hook-driven data
- `frontend/__tests__/layout/AppShell.test.tsx` - Added mocks for useRouter, useAuthStore, useNotifications

## Decisions Made
- NotificationPanel receives data as props (not calling hooks directly) for testability and reusability
- AvatarMenu uses button elements (not anchor tags) with onClick handlers for proper SPA navigation via router.push
- Header computes initials from displayName: first letter of first name + first letter of last name (falls back to first 2 chars)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed AppShell test failures caused by new Header dependencies**
- **Found during:** Task 2 (Header refactor)
- **Issue:** Header now imports useRouter (next/navigation), useAuthStore, useNotifications -- AppShell test had no mocks for these
- **Fix:** Added vi.mock for next/navigation, @/lib/auth/store, @/hooks/use-notifications, and useLocale to next-intl mock
- **Files modified:** frontend/__tests__/layout/AppShell.test.tsx
- **Verification:** All 4 AppShell tests pass, full suite 136/136 pass
- **Committed in:** ce20e84 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Test mock fix was necessary to maintain green test suite after refactoring Header. No scope creep.

## Issues Encountered
None beyond the test mock fix documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- NotificationPanel and AvatarMenu are ready for integration into dashboard page
- Header now uses live data from hooks -- will render real notifications when API is connected
- Both components accept typed props, making them easy to test independently

---
*Phase: 05-dashboard-page*
*Completed: 2026-03-22*
