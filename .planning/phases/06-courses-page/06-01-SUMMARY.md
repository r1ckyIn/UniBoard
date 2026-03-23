---
phase: 06-courses-page
plan: 01
subsystem: ui
tags: [i18n, roughjs, svg, courses, vitest]

requires:
  - phase: 01-foundation
    provides: "design-system RoughCard pattern, course-colors utility"
provides:
  - "courses i18n namespace (13 keys) in en.json and zh.json"
  - "MATH1005 purple color entry in COURSE_COLORS"
  - "BannerDeco Rough.js 5-pattern SVG deco component"
  - "Wave 0 test stubs for CoursesPage (4 todo), CourseCard (6 todo), BannerDeco (7 passing)"
affects: [06-courses-page]

tech-stack:
  added: []
  patterns: ["BannerDeco: useRef+useEffect Rough.js SVG drawing with seed 42 determinism"]

key-files:
  created:
    - frontend/components/courses/BannerDeco.tsx
    - frontend/__tests__/courses/BannerDeco.test.tsx
    - frontend/__tests__/courses/CourseCard.test.tsx
    - frontend/__tests__/courses/CoursesPage.test.tsx
  modified:
    - frontend/messages/en.json
    - frontend/messages/zh.json
    - frontend/lib/dashboard/course-colors.ts

key-decisions:
  - "BannerDeco uses inline style pointerEvents:none + className overflow-visible for SVG layering"
  - "roughjs mock returns createElementNS('g') stubs for jsdom compatibility"

patterns-established:
  - "courses/ component directory for Phase 06 page components"
  - "roughjs vi.mock pattern with createElementNS stubs for SVG testing"

requirements-completed: [UI-02]

duration: 3min
completed: 2026-03-23
---

# Phase 06 Plan 01: Courses Foundation Summary

**Courses i18n namespace (13 keys bilingual), MATH1005 color entry, BannerDeco 5-pattern Rough.js SVG component, and Wave 0 test stubs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T02:48:00Z
- **Completed:** 2026-03-23T02:51:16Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added 13-key bilingual courses i18n namespace with full EN/ZH parity
- Registered MATH1005 purple (#9b7bb8) in COURSE_COLORS map
- Built BannerDeco component with 5 distinct Rough.js SVG doodle patterns (circle+sparkle, wave, star, dots, zigzag)
- Created Wave 0 test stubs: 4 CoursesPage todos, 6 CourseCard todos, 7 passing BannerDeco tests

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n courses namespace + course-colors MATH1005 entry** - `e2098a7` (feat)
2. **Task 2 RED: Wave 0 test stubs + BannerDeco tests** - `7057a20` (test)
3. **Task 2 GREEN: BannerDeco component implementation** - `ea01dfc` (feat)

## Files Created/Modified
- `frontend/messages/en.json` - Added courses namespace with 13 i18n keys
- `frontend/messages/zh.json` - Added courses namespace with 13 Chinese translations
- `frontend/lib/dashboard/course-colors.ts` - Added MATH1005 purple color entry
- `frontend/components/courses/BannerDeco.tsx` - 5-pattern Rough.js SVG deco component
- `frontend/__tests__/courses/BannerDeco.test.tsx` - 7 passing tests (render, 5 patterns, styles)
- `frontend/__tests__/courses/CourseCard.test.tsx` - 6 it.todo stubs for Plan 02
- `frontend/__tests__/courses/CoursesPage.test.tsx` - 4 it.todo stubs for Plan 02

## Decisions Made
- BannerDeco uses inline style `pointerEvents: "none"` + className `overflow-visible` for SVG layering, matching RoughCard pattern
- roughjs mock in tests uses `createElementNS("svg", "g")` stubs since jsdom cannot render SVG paths
- Normalised patternIndex with `((patternIndex % 5) + 5) % 5` to handle negative indices safely

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All building blocks ready for Plan 02 (CourseCard + CoursesPage assembly)
- i18n namespace available for course page components
- MATH1005 color registered for demo/test data
- BannerDeco ready for import into CourseCard banner section
- 10 test stubs ready to be implemented in Plan 02

## Self-Check: PASSED

All 5 created files verified on disk. All 3 commits verified in git log.

---
*Phase: 06-courses-page*
*Completed: 2026-03-23*
