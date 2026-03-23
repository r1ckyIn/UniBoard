---
phase: 07-course-detail-page
plan: 04
subsystem: ui
tags: [roughjs, rough-card, design-system, date-fns, locale, next-intl]

# Dependency graph
requires:
  - phase: 07-course-detail-page (plan 03)
    provides: All 6 course-detail components with inline Rough.js borders
provides:
  - All 6 course-detail components using shared RoughCard component
  - EdPostsPanel with author display and locale-aware timestamps
  - Consistent border rendering aligned with Dashboard RoughCard pattern
affects: [course-detail-page, design-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [RoughCard wrapper for all card-style components, locale-aware date-fns timestamps]

key-files:
  created: []
  modified:
    - frontend/components/course-detail/CourseBanner.tsx
    - frontend/components/course-detail/AssessmentSection.tsx
    - frontend/components/course-detail/MaterialsSection.tsx
    - frontend/components/course-detail/CourseDeadlinesPanel.tsx
    - frontend/components/course-detail/EdPostsPanel.tsx
    - frontend/components/course-detail/QuickLinksPanel.tsx
    - frontend/__tests__/course-detail/AssessmentSection.test.tsx
    - frontend/__tests__/course-detail/MaterialsSection.test.tsx
    - frontend/__tests__/course-detail/QuickLinksPanel.test.tsx
    - frontend/__tests__/course-detail/EdPostsPanel.test.tsx

key-decisions:
  - "CourseBanner and AssessmentSection use empty padding RoughCard since they manage their own internal layout"
  - "ExternalLinkDialog placed outside RoughCard as sibling (Fragment wrapper) to avoid overflow clipping"
  - "Author test uses getAllByText with unique author count check since fixture data has duplicate authors"

patterns-established:
  - "RoughCard migration: remove rough import, refs, drawBorder/useEffect/ResizeObserver, wrap content in RoughCard"
  - "Test mock migration: replace vi.mock roughjs with vi.mock RoughCard returning div with data-testid"

requirements-completed: [UI-11]

# Metrics
duration: 6min
completed: 2026-03-23
---

# Phase 07 Plan 04: Gap Closure Summary

**Replaced all 6 inline Rough.js borders with shared RoughCard component and added author display + locale-aware timestamps to EdPostsPanel**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-23T09:09:21Z
- **Completed:** 2026-03-23T09:15:38Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- All 6 course-detail components (CourseBanner, AssessmentSection, MaterialsSection, CourseDeadlinesPanel, EdPostsPanel, QuickLinksPanel) migrated from inline Rough.js border code to shared RoughCard wrapper
- Removed ~370 lines of duplicated border-drawing code (containerRef, svgRef, drawBorder, ResizeObserver patterns)
- EdPostsPanel now shows author name, locale-aware timestamps (zhCN/enUS), and larger badge font (0.64rem)
- All 24 course-detail tests pass with updated RoughCard mocks

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace inline Rough.js borders with RoughCard in ALL 6 components** - `909827b` (refactor)
2. **Task 2: Add author display, locale-aware timestamps, and larger badges to EdPostsPanel** - `170ddd5` (feat)

## Files Created/Modified
- `frontend/components/course-detail/CourseBanner.tsx` - Replaced inline Rough.js with RoughCard (empty padding, banner manages own layout)
- `frontend/components/course-detail/AssessmentSection.tsx` - Replaced inline Rough.js with RoughCard (empty padding, has header + GradeSummary)
- `frontend/components/course-detail/MaterialsSection.tsx` - Replaced inline Rough.js with RoughCard (px-26 py-22 padding)
- `frontend/components/course-detail/CourseDeadlinesPanel.tsx` - Replaced inline Rough.js with RoughCard (px-18 py-16 padding)
- `frontend/components/course-detail/EdPostsPanel.tsx` - Replaced inline Rough.js with RoughCard, added author display, locale-aware timestamps, two-row layout
- `frontend/components/course-detail/QuickLinksPanel.tsx` - Replaced inline Rough.js with RoughCard (px-18 py-16 padding)
- `frontend/__tests__/course-detail/AssessmentSection.test.tsx` - Updated mock from roughjs to RoughCard
- `frontend/__tests__/course-detail/MaterialsSection.test.tsx` - Updated mock from roughjs to RoughCard
- `frontend/__tests__/course-detail/QuickLinksPanel.test.tsx` - Updated mock from roughjs to RoughCard
- `frontend/__tests__/course-detail/EdPostsPanel.test.tsx` - Updated mock from roughjs to RoughCard, added useLocale mock, added author test

## Decisions Made
- CourseBanner and AssessmentSection use `padding=""` since they have complex internal layouts (gradient banner, header + table + GradeSummary)
- ExternalLinkDialog moved outside RoughCard (using Fragment wrapper) in EdPostsPanel and QuickLinksPanel to avoid overflow clipping from RoughCard's inner div
- Author test uses getAllByText with unique author count to handle duplicate author names in fixture data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed author test for duplicate author names**
- **Found during:** Task 2 (author rendering test)
- **Issue:** Plan suggested `getByText(post.author)` but fixture has duplicate authors (e.g., "Dr. Smith" appears 3 times), causing getByText to fail
- **Fix:** Changed test to use `getAllByText` with unique author count verification
- **Files modified:** frontend/__tests__/course-detail/EdPostsPanel.test.tsx
- **Verification:** Test passes with correct author count per unique author
- **Committed in:** 170ddd5 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor test assertion adjustment for data correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 07 (course-detail-page) is fully complete with all 4 plans executed
- All UAT gaps from the Phase 07 review are now closed
- Ready for /pr-cycle or next phase

## Self-Check: PASSED

All 7 key files verified present. Both task commits (909827b, 170ddd5) confirmed in git log.

---
*Phase: 07-course-detail-page*
*Completed: 2026-03-23*
