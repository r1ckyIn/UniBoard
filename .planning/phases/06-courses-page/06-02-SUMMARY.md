---
phase: 06-courses-page
plan: 02
subsystem: ui
tags: [roughjs, react, courses, responsive-grid, skeleton, i18n]

requires:
  - phase: 06-courses-page
    provides: "courses i18n namespace, BannerDeco component, course-colors MATH1005 entry"
  - phase: 01-foundation
    provides: "design-system RoughCard pattern, RoughProgressBar, AnimatedEntry, withClientOnly"
  - phase: 02
    provides: "useCourses hook, getCourseColor utility, getGradeBand utility"
provides:
  - "CourseCard component with two-layer Rough.js borders, colored banner, grade display, progress bar"
  - "CoursesPage orchestrator with data fetching, grid layout, loading/error/empty states"
  - "/courses route entry under (dashboard) route group"
  - "10 passing tests (6 CourseCard + 4 CoursesPage) replacing todo stubs"
affects: [07-course-detail]

tech-stack:
  added: []
  patterns: ["CourseCard two-layer pattern: transparent outer with Rough.js SVG + inner with banner/info"]

key-files:
  created:
    - frontend/components/courses/CourseCard.tsx
    - frontend/components/courses/CoursesPage.tsx
    - frontend/app/[locale]/(dashboard)/courses/page.tsx
  modified:
    - frontend/__tests__/courses/CourseCard.test.tsx
    - frontend/__tests__/courses/CoursesPage.test.tsx

key-decisions:
  - "CourseCard uses own Rough.js border drawing (not RoughCard) for 6px padding instead of 10px"
  - "withClientOnly wraps both BannerDeco and RoughProgressBar for SSR safety"
  - "Skeleton cards are inline (not SkeletonCard variant) since no course variant exists"
  - "AnimatedEntry delay capped at 6 for cards beyond index 4"

patterns-established:
  - "Course card two-layer: outer transparent div with p-[6px] + Rough.js SVG border + inner card with bg"
  - "CoursesPage orchestrator pattern: useCourses hook + getCourseColor mapping + conditional states"

requirements-completed: [UI-02]

duration: 5min
completed: 2026-03-23
---

# Phase 06 Plan 02: Courses Page Assembly Summary

**CourseCard with two-layer Rough.js borders, colored banners, grade badges, progress bars; CoursesPage orchestrator with responsive 3-col grid and loading/error/empty states; /courses route wired**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T02:53:56Z
- **Completed:** 2026-03-23T02:59:07Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Built CourseCard with two-layer Rough.js border, 120px colored banner with BannerDeco, grade value with course-colored text, conditional band badge, RoughProgressBar for assessed weight, -3px hover lift, click navigation
- Built CoursesPage orchestrator consuming useCourses hook with responsive grid (1/2/3 columns at 900/1400px breakpoints), loading skeleton shimmer, error state with AlertCircle, empty state with BookOpen
- Wired /courses route under (dashboard) route group following existing page.tsx server component pattern
- Replaced 10 todo test stubs with passing tests (6 CourseCard + 4 CoursesPage)

## Task Commits

Each task was committed atomically:

1. **Task 1: CourseCard with two-layer Rough.js borders** - `774f0c4` (feat)
2. **Task 2: CoursesPage orchestrator + page.tsx route** - `3cab056` (feat)

## Files Created/Modified
- `frontend/components/courses/CourseCard.tsx` - Two-layer card with Rough.js border, banner, grade info, progress bar
- `frontend/components/courses/CoursesPage.tsx` - Page orchestrator with data fetching, grid layout, state handling
- `frontend/app/[locale]/(dashboard)/courses/page.tsx` - Next.js server component route entry
- `frontend/__tests__/courses/CourseCard.test.tsx` - 6 passing tests (name/code/semester, grade color, badge, null grade, progress, navigation)
- `frontend/__tests__/courses/CoursesPage.test.tsx` - 4 passing tests (data rendering, loading skeleton, empty state, error state)

## Decisions Made
- CourseCard implements its own Rough.js border drawing rather than reusing RoughCard, because CourseCard needs 6px outer padding (prototype spec) vs RoughCard's 10px default
- Both BannerDeco and RoughProgressBar wrapped with withClientOnly for SSR safety, consistent with DashboardPage pattern
- Loading skeleton cards are inline divs with shimmer animation rather than SkeletonCard variants, since no "course" variant exists and the card structure (120px banner + info lines) is unique
- AnimatedEntry delay is capped at 6 (max useful value in DELAY_MAP) for cards beyond index 4

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused RoughProgressBar direct import**
- **Found during:** Task 1 (CourseCard implementation)
- **Issue:** Imported RoughProgressBar directly AND via withClientOnly; direct import was unused
- **Fix:** Removed unused direct import, kept only the withClientOnly-wrapped version
- **Files modified:** frontend/components/courses/CourseCard.tsx
- **Committed in:** 774f0c4 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup, no scope change.

## Issues Encountered
- jsdom converts inline hex color values to rgb() format in tests; adjusted test assertion to compare against `rgb(217, 119, 87)` instead of `#d97757`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete /courses page ready for visual verification
- CourseCard click navigates to /courses/{id} (will 404 until Phase 07 course-detail is built)
- All 17 courses tests pass (7 BannerDeco + 6 CourseCard + 4 CoursesPage)
- Full test suite: 153 tests passing, 0 failures

## Self-Check: PASSED

All 5 created/modified files verified on disk. All 2 commits verified in git log.

---
*Phase: 06-courses-page*
*Completed: 2026-03-23*
