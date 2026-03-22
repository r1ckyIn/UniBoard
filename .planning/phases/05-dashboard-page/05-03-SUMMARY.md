---
phase: 05-dashboard-page
plan: 03
subsystem: ui
tags: [react, rough.js, motion, next-intl, dashboard, hero, stats, grades, progress-bar]

# Dependency graph
requires:
  - phase: 05-01
    provides: encouragement provider, course-colors utility, i18n dashboard namespace
  - phase: 01-design-system-foundation
    provides: RoughCard, HeroDoodles, RoughNotationWrapper, ClientOnly/withClientOnly, AnimatedEntry
provides:
  - HeroSection with Motion spring entrance, parallax fade-out, Rough Notation annotations
  - StatsRow with 3 stat cards (WAM/Target/Alerts) using RoughCard wrappers
  - CourseGradesTable with per-course colored Rough.js progress bars and predict links
  - RoughProgressBar reusable SVG component for hand-drawn progress visualization
affects: [05-04, 05-05, 05-06, 07-course-detail, 09-predict]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Motion spring stagger variants with custom delay parameter"
    - "Scroll-based parallax fade with rAF throttle for hero sections"
    - "RoughProgressBar as reusable SVG Rough.js canvas component"
    - "withClientOnly for Rough.js component lazy loading in tables"

key-files:
  created:
    - frontend/components/dashboard/HeroSection.tsx
    - frontend/components/dashboard/StatsRow.tsx
    - frontend/components/dashboard/CourseGradesTable.tsx
    - frontend/components/dashboard/RoughProgressBar.tsx
  modified: []

key-decisions:
  - "Motion spring variants with custom delay for hero stagger (damping: 25, stiffness: 200)"
  - "Encouragement text splits message string to wrap highlightPhrase with RoughNotation"
  - "Date line uses placeholder strings for i18n interpolation then renders RoughNotation inline"
  - "RoughProgressBar uses fixed seed 42 for deterministic hand-drawn paths"
  - "StatsRow alertSummary parsed by splitting on dot-separator for i18n interpolation"

patterns-established:
  - "Hero parallax: scroll listener + rAF throttle + opacity calc pattern"
  - "RoughProgressBar: reusable SVG Rough.js component with replaceChildren() redraw"

requirements-completed: [UI-01]

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 05 Plan 03: Dashboard Hero, Stats, and Grades Summary

**Hero section with Motion spring entrance and parallax fade, 3 stat cards (WAM/Target/Alerts) with Rough.js borders, and course grades table with hand-drawn progress bars and hover predict links**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-22T09:46:40Z
- **Completed:** 2026-03-22T09:50:07Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- HeroSection with time-of-day greeting, Motion spring stagger entrance (0.1s-1.0s), scroll parallax fade-out, and Rough Notation annotations on weekday/week/encouragement
- StatsRow displaying WAM (orange), GPA Target (blue), and Alerts (amber) stat cards with RoughCard wrappers and AnimatedEntry stagger
- CourseGradesTable with per-course colored RoughProgressBar, grade badges, and "predict ->" hover links with opacity transition
- Reusable RoughProgressBar SVG component using rough.svg() for hand-drawn progress visualization

## Task Commits

Each task was committed atomically:

1. **Task 1: HeroSection with Motion entrance, parallax fade, Rough Notation annotations** - `2ae95da` (feat)
2. **Task 2: StatsRow + RoughProgressBar** - `75f28cc` (feat)
3. **Task 3: CourseGradesTable** - `a0d8f89` (feat)

## Files Created/Modified
- `frontend/components/dashboard/HeroSection.tsx` - Hero section with greeting, date line, encouragement, scroll prompt, Motion spring entrance, parallax fade
- `frontend/components/dashboard/StatsRow.tsx` - 3-column stats grid (WAM/Target/Alerts) with RoughCard and AnimatedEntry
- `frontend/components/dashboard/RoughProgressBar.tsx` - Reusable Rough.js SVG progress bar with configurable progress, color, dimensions
- `frontend/components/dashboard/CourseGradesTable.tsx` - Course grades table with progress bars, earned marks, target badges, predict links

## Decisions Made
- Motion spring variants use custom delay parameter (damping: 25, stiffness: 200) for natural hero stagger animation
- Date line renders RoughNotation inline by splitting translated string on placeholder tokens
- Encouragement text splits message string at highlightPhrase index to wrap with RoughNotation highlight
- RoughProgressBar uses seed 42 for deterministic Rough.js paths (no jitter on redraw)
- StatsRow cards are display-only with no click handlers per CONTEXT.md locked decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 4 components ready for integration into DashboardPage orchestrator (Plan 05 or 06)
- RoughProgressBar available as reusable component for future phases
- Hero, Stats, and Grades sections complete; Deadlines, Donut, Right Panel remain (Plans 04-06)

## Self-Check: PASSED

All 4 created files verified on disk. All 3 task commits verified in git log.

---
*Phase: 05-dashboard-page*
*Completed: 2026-03-22*
