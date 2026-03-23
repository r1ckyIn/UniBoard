---
phase: 08-deadlines-page
plan: 01
subsystem: ui
tags: [i18n, next-intl, urgency, deadlines, vitest]

# Dependency graph
requires:
  - phase: 01-app-shell
    provides: "i18n infrastructure (messages/en.json, messages/zh.json), route group layout"
  - phase: 05-dashboard-page
    provides: "DeadlineTimeline component with URGENCY_COLORS pattern to extract"
provides:
  - "deadlines i18n namespace in en.json and zh.json (23 keys)"
  - "Shared urgency utility (getUrgency, urgencyLabel, URGENCY_COLORS)"
  - "Route entry at /[locale]/(dashboard)/deadlines"
  - "Placeholder DeadlinesPage component"
  - "Wave 0 test stubs (20 it.todo() cases across 3 files)"
affects: [08-02-PLAN, 08-03-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared urgency utility extracted from dashboard for reuse"
    - "Wave 0 test stubs with it.todo() for all planned behaviors"

key-files:
  created:
    - "frontend/lib/deadlines/urgency.ts"
    - "frontend/app/[locale]/(dashboard)/deadlines/page.tsx"
    - "frontend/components/deadlines/DeadlinesPage.tsx"
    - "frontend/__tests__/deadlines/DeadlinesPage.test.tsx"
    - "frontend/__tests__/deadlines/DeadlineCard.test.tsx"
    - "frontend/__tests__/deadlines/DeadlineCalendarView.test.tsx"
  modified:
    - "frontend/messages/en.json"
    - "frontend/messages/zh.json"

key-decisions:
  - "Urgency utility extracted as shared lib rather than modifying existing DeadlineTimeline — dashboard migration deferred"

patterns-established:
  - "Shared urgency utility at lib/deadlines/urgency.ts for consistent classification across dashboard and deadlines page"

requirements-completed: [UI-03]

# Metrics
duration: 3min
completed: 2026-03-23
---

# Phase 08 Plan 01: Deadlines Foundation Summary

**Deadlines i18n namespace (23 keys), shared urgency utility (getUrgency/urgencyLabel/URGENCY_COLORS), route entry, and 20 Wave 0 test stubs**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T10:22:00Z
- **Completed:** 2026-03-23T10:25:07Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added "deadlines" i18n namespace to both en.json and zh.json with 23 keys covering title, filters, card content, AI chat, empty/error states, and calendar
- Created shared urgency utility at lib/deadlines/urgency.ts with getUrgency (3-tier classification), urgencyLabel (human-readable), and URGENCY_COLORS (dot/bg/soft palette)
- Created route entry at /deadlines and placeholder DeadlinesPage component following courses page pattern
- Added 20 it.todo() test stubs across 3 test files (DeadlinesPage: 8, DeadlineCard: 7, DeadlineCalendarView: 5)

## Task Commits

Each task was committed atomically:

1. **Task 1: i18n deadlines namespace + shared urgency utility** - `1268990` (feat)
2. **Task 2: Route entry + Wave 0 test stubs** - `ed87580` (feat)

## Files Created/Modified
- `frontend/messages/en.json` - Added deadlines namespace with 23 English keys
- `frontend/messages/zh.json` - Added deadlines namespace with 23 Chinese keys
- `frontend/lib/deadlines/urgency.ts` - Shared urgency classification, label, and color mapping
- `frontend/app/[locale]/(dashboard)/deadlines/page.tsx` - Route entry with setRequestLocale
- `frontend/components/deadlines/DeadlinesPage.tsx` - Placeholder component with i18n title
- `frontend/__tests__/deadlines/DeadlinesPage.test.tsx` - 8 todo stubs for page orchestrator
- `frontend/__tests__/deadlines/DeadlineCard.test.tsx` - 7 todo stubs for card component
- `frontend/__tests__/deadlines/DeadlineCalendarView.test.tsx` - 5 todo stubs for calendar view

## Decisions Made
- Urgency utility extracted as shared lib rather than modifying existing DeadlineTimeline — dashboard component migration deferred to avoid touching stable code

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- i18n namespace ready for Plan 02 (DeadlineCard + timeline view) and Plan 03 (calendar view + integration)
- Shared urgency utility ready for import by DeadlineCard component
- Route entry ready to render full DeadlinesPage once Plan 02 implements it
- All 20 test stubs ready to be implemented in Plans 02 and 03

## Self-Check: PASSED

- All 6 created files verified present on disk
- Commits 1268990 and ed87580 verified in git log
- Full test suite: 28 passed, 0 failures, 20 new todos

---
*Phase: 08-deadlines-page*
*Completed: 2026-03-23*
