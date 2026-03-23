---
phase: 07-course-detail-page
plan: 03
subsystem: ui
tags: [react, next.js, portal, course-detail, rough.js, external-link, deadlines, discussions]

# Dependency graph
requires:
  - phase: 07-course-detail-page (plan 01)
    provides: "hooks, fixtures, i18n translations, stub tests for course detail"
  - phase: 07-course-detail-page (plan 02)
    provides: "CourseBanner, AssessmentSection, MaterialsSection, AiChatPlaceholder components"
  - phase: 05-dashboard-page
    provides: "portal-slot pattern, ExternalLinkDialog, AnimatedEntry, getCourseColor"
provides:
  - "QuickLinksPanel with Canvas/Ed/EdLessons external links"
  - "CourseDeadlinesPanel with colored stripes and day badges"
  - "EdPostsPanel with endorsed/staff badges and high-value filtering"
  - "CourseDetailPage orchestrator with data fetching, prediction state, portal injection"
  - "Fully functional Course Detail page with all components wired together"
affects: [phase-08, phase-09, milestone-audit]

# Tech tracking
tech-stack:
  added: []
  patterns: ["portal-slot injection for right panel in page-level components", "shared ExternalLinkDialog state via useState"]

key-files:
  created:
    - frontend/components/course-detail/QuickLinksPanel.tsx
    - frontend/components/course-detail/CourseDeadlinesPanel.tsx
    - frontend/components/course-detail/EdPostsPanel.tsx
  modified:
    - frontend/components/course-detail/CourseDetailPage.tsx
    - frontend/__tests__/course-detail/QuickLinksPanel.test.tsx
    - frontend/__tests__/course-detail/EdPostsPanel.test.tsx
    - frontend/__tests__/course-detail/CourseDetailPage.test.tsx

key-decisions:
  - "getCourseColor returns { base, soft } not { main, soft } as plan specified - adapted to actual API"
  - "Shared ExternalLinkDialog with openUrl state pattern instead of per-link dialog instances"
  - "CourseDeadlinesPanel uses useCourseDeadlines hook internally rather than receiving deadlines as props"

patterns-established:
  - "Right panel components follow same Rough.js border pattern as left column sections"
  - "External link opening via shared ExternalLinkDialog with useState-based URL tracking"

requirements-completed: [UI-11]

# Metrics
duration: 5min
completed: 2026-03-23
---

# Phase 07 Plan 03: Course Detail Page Assembly Summary

**Right panel components (QuickLinks, Deadlines, EdPosts) and CourseDetailPage orchestrator with portal-slot injection, prediction state, and 23 passing tests**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-23T07:34:10Z
- **Completed:** 2026-03-23T07:39:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Built QuickLinksPanel with 3 external links (Canvas, Ed Discussion, Ed Lessons) using colored icon backgrounds and ExternalLinkDialog
- Built CourseDeadlinesPanel fetching course-specific deadlines with colored stripes, day badges, and loading/empty states
- Built EdPostsPanel fetching high-value discussions with endorsed/staff badges and relative timestamps
- Replaced CourseDetailPage placeholder with full orchestrator: data fetching, prediction state, portal injection, loading/error states
- All 23 course-detail tests pass (6 Assessment + 5 Materials + 3 QuickLinks + 4 EdPosts + 5 CourseDetailPage)
- Full test suite green with no regressions (176 passing tests)

## Task Commits

Each task was committed atomically:

1. **Task 1: QuickLinksPanel + CourseDeadlinesPanel + EdPostsPanel + tests** - `05b98c0` (feat)
2. **Task 2: CourseDetailPage orchestrator + CourseDetailPage tests** - `fe5c770` (feat)

## Files Created/Modified
- `frontend/components/course-detail/QuickLinksPanel.tsx` - Right panel external links (Canvas, Ed Discussion, Ed Lessons) with ExternalLinkDialog
- `frontend/components/course-detail/CourseDeadlinesPanel.tsx` - Right panel course-specific deadlines with colored stripe and day badges
- `frontend/components/course-detail/EdPostsPanel.tsx` - Right panel high-value Ed Discussion posts with endorsed/staff badges
- `frontend/components/course-detail/CourseDetailPage.tsx` - Main page orchestrator with data hooks, prediction state, portal injection
- `frontend/__tests__/course-detail/QuickLinksPanel.test.tsx` - 3 tests: link rendering, dialog opening, icon colors
- `frontend/__tests__/course-detail/EdPostsPanel.test.tsx` - 4 tests: post titles, endorsed badge, staff badge, empty state
- `frontend/__tests__/course-detail/CourseDetailPage.test.tsx` - 5 tests: back link, banner, assessment, materials, AI chat

## Decisions Made
- Used `getCourseColor(code).base` / `.soft` matching actual API signature (`base` not `main` as plan specified)
- Single shared ExternalLinkDialog per panel with `useState<string | null>` for URL tracking, reducing DOM nodes
- CourseDeadlinesPanel calls `useCourseDeadlines(courseId)` internally for encapsulation
- EdPostsPanel passes `"high_value"` filter to `useCourseDiscussions` for server-side filtering
- `canvas_course_id` and `ed_course_id` use optional fallback `?? ""` since Course type marks them as optional

## Deviations from Plan

None - plan executed exactly as written (minor adaptation for `base` vs `main` field name was a plan-vs-code mismatch, not a deviation).

## Issues Encountered
- Pre-existing TypeScript error in `CourseCard.test.tsx` (`beforeEach` not found) - out of scope, not caused by this plan's changes

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Course Detail page is fully functional with all components wired together
- Phase 07 is complete (all 3 plans executed)
- Ready for `/pr-cycle` to create PR, review, and merge

## Self-Check: PASSED

All 7 created/modified files verified on disk. Both task commits (05b98c0, fe5c770) found in git log.

---
*Phase: 07-course-detail-page*
*Completed: 2026-03-23*
