---
phase: 05-dashboard-page
plan: 08
subsystem: ui
tags: [rough-notation, tailwind, animation, uat-gaps, polish]

# Dependency graph
requires:
  - phase: 05-dashboard-page
    provides: Dashboard page components, HeroSection, ProfileCard, ExternalLinkDialog, AvatarMenu, NotificationPanel
provides:
  - Polished UI matching prototype behavior with all UAT gaps closed
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Staggered Rough Notation annotation timing (900ms/1500ms/2300ms) matching annotationGroup sequential API
    - disableHover prop on RoughCard for static right-panel cards
    - CSS grid stretch with h-full propagation for equal-height card rows

key-files:
  created: []
  modified:
    - frontend/components/dashboard/DashboardPage.tsx
    - frontend/components/dashboard/HeroSection.tsx
    - frontend/components/dashboard/ProfileCard.tsx
    - frontend/components/dashboard/ExternalLinkDialog.tsx
    - frontend/components/dashboard/MiniCalendar.tsx
    - frontend/components/dashboard/RecentActivity.tsx
    - frontend/components/dashboard/DeadlineTimeline.tsx
    - frontend/components/dashboard/AssessmentDonut.tsx
    - frontend/components/layout/AvatarMenu.tsx
    - frontend/components/layout/NotificationPanel.tsx

key-decisions:
  - "Removed transition-colors entirely from AvatarMenu instead of reducing duration for truly instant hover"
  - "Used fixed positioning with transform centering for ExternalLinkDialog instead of relying on browser showModal() default"
  - "Propagated h-full through AnimatedEntry -> RoughCard chain for bottom row equal height"

patterns-established:
  - "Staggered annotation reveal: separate useState per annotation with sequential setTimeout delays"

requirements-completed: [UI-01]

# Metrics
duration: 2min
completed: 2026-03-22
---

# Phase 05 Plan 08: UAT Gap Closure Summary

**Close 7 UAT cosmetic gaps: profile faculty, right panel hover, avatar menu delay, notification scroll, external dialog centering, hero annotation stagger, bottom row equal height**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-22T23:04:24Z
- **Completed:** 2026-03-22T23:07:04Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Fixed profile card displaying "Faculty of Science" instead of "Computer Science"
- Disabled hover elevation on all 3 right-panel cards (ProfileCard, MiniCalendar, RecentActivity)
- Removed transition delay from avatar menu hover for instant highlight feedback
- Added smooth scrolling to notification panel list
- Centered ExternalLinkDialog with flat/minimal shadow design
- Implemented staggered hero annotations matching prototype annotationGroup sequential timing
- Made bottom row Deadline Timeline and Assessment Donut cards equal height via CSS grid stretch

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix profile card, right panel hover, avatar menu delay, notification scroll, external dialog** - `6d874d7` (fix)
2. **Task 2: Fix hero annotation stagger, Rough Notation alignment, and bottom row equal height** - `8fbf35c` (fix)

## Files Created/Modified
- `frontend/components/dashboard/DashboardPage.tsx` - Faculty value fix, bottom row h-full on AnimatedEntry
- `frontend/components/dashboard/HeroSection.tsx` - 3 separate staggered annotation states replacing single showAnnotations
- `frontend/components/dashboard/ProfileCard.tsx` - Added disableHover to RoughCard
- `frontend/components/dashboard/MiniCalendar.tsx` - Added disableHover to RoughCard
- `frontend/components/dashboard/RecentActivity.tsx` - Added disableHover to RoughCard
- `frontend/components/dashboard/ExternalLinkDialog.tsx` - Fixed centering with transform, flat shadow, responsive width
- `frontend/components/dashboard/DeadlineTimeline.tsx` - Added h-full to RoughCard for equal height
- `frontend/components/dashboard/AssessmentDonut.tsx` - Added h-full to RoughCard for equal height
- `frontend/components/layout/AvatarMenu.tsx` - Removed transition-colors duration for instant hover
- `frontend/components/layout/NotificationPanel.tsx` - Added scroll-smooth and WebkitOverflowScrolling

## Decisions Made
- Removed transition-colors entirely from AvatarMenu hover rather than just reducing duration, since the intent is "instant" highlight
- Used fixed positioning with CSS transform centering on ExternalLinkDialog for cross-browser reliability
- Propagated h-full through AnimatedEntry className prop and into both bottom-row RoughCards

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added disableHover to MiniCalendar and RecentActivity**
- **Found during:** Task 1
- **Issue:** Plan only mentioned ProfileCard explicitly, but MiniCalendar and RecentActivity also use RoughCard in the right panel and need disableHover
- **Fix:** Added disableHover prop to both components' RoughCard wrappers
- **Files modified:** MiniCalendar.tsx, RecentActivity.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** 6d874d7

**2. [Rule 2 - Missing Critical] Added h-full to DeadlineTimeline and AssessmentDonut RoughCards**
- **Found during:** Task 2
- **Issue:** Plan mentioned adding h-full to wrappers in DashboardPage, but the RoughCard components inside also need h-full for stretch to propagate through the full component tree
- **Fix:** Added className="h-full" to RoughCard in both DeadlineTimeline.tsx and AssessmentDonut.tsx
- **Files modified:** DeadlineTimeline.tsx, AssessmentDonut.tsx
- **Verification:** TypeScript compilation passes
- **Committed in:** 8fbf35c

---

**Total deviations:** 2 auto-fixed (2 missing critical functionality)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All UAT gaps from 05-UAT.md have been addressed
- Dashboard page is feature-complete and polished

---
## Self-Check: PASSED

All 10 modified files verified present. Both task commits (6d874d7, 8fbf35c) verified in git log.

---
*Phase: 05-dashboard-page*
*Completed: 2026-03-22*
