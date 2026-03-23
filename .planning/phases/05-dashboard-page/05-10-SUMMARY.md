---
phase: 05-dashboard-page
plan: 10
subsystem: ui
tags: [i18n, date-fns, locale, sticky-sidebar, tailwind, next-intl]

requires:
  - phase: 05-dashboard-page
    provides: "HeroSection, CourseGradesTable, AppShell, RightPanel components"
provides:
  - "Locale-aware hero date line (weekday + week number annotation)"
  - "Center-aligned Target column in CourseGradesTable"
  - "Truly sticky right sidebar via main scroll container"
affects: []

tech-stack:
  added: [date-fns/locale/zh-CN, date-fns/locale/en-US]
  patterns: ["date-fns locale-aware formatting via useLocale() -> dateFnsLocale map", "main as scroll container for sticky sidebar positioning"]

key-files:
  created: []
  modified:
    - frontend/components/dashboard/HeroSection.tsx
    - frontend/components/dashboard/CourseGradesTable.tsx
    - frontend/components/layout/AppShell.tsx
    - frontend/components/layout/RightPanel.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json

key-decisions:
  - "date-fns zhCN locale outputs full-form weekday (e.g. 星期一) which is acceptable standard Chinese"
  - "RightPanel sticky top changed from calc(header+28px) to top-0 since main scroll container already sits below header"
  - "HeroSection parallax uses main.scrollTop instead of window.scrollY to match new scroll container"

patterns-established:
  - "Locale-aware date formatting: useLocale() from next-intl maps to date-fns locale object"
  - "Scroll container pattern: main with overflow-y-auto + maxHeight for sticky children"

requirements-completed: [UI-01]

duration: 3min
completed: 2026-03-23
---

# Phase 05 Plan 10: UAT Gap Closure (Hero Localization, Target Alignment, Sticky Sidebar) Summary

**Locale-aware hero date line with date-fns zhCN/enUS locales, center-aligned Target column badges, and truly sticky right sidebar via main scroll container**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-23T01:01:40Z
- **Completed:** 2026-03-23T01:04:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Hero date line weekday is now locale-aware: shows full-form Chinese weekday (e.g. 星期一) in zh locale, English weekday (e.g. Monday) in en locale
- Hero week number annotation uses i18n key (weekLabel): renders "Week 4" in English, "第4周" in Chinese inside Rough Notation circle
- CourseGradesTable Target column header and badge cells are center-aligned
- Right sidebar is truly sticky via main overflow-y-auto scroll container with constrained maxHeight
- Hero parallax fade-out correctly uses main.scrollTop instead of window.scrollY

## Task Commits

Each task was committed atomically:

1. **Task 1: Localize hero date line weekday and week number annotation** - `e0505f8` (fix)
2. **Task 2: Center-align Target column badges and fix sticky sidebar** - `36313f6` (fix)

## Files Created/Modified
- `frontend/components/dashboard/HeroSection.tsx` - Added locale-aware weekday, localized weekLabel, main scroll container for parallax
- `frontend/components/dashboard/CourseGradesTable.tsx` - Changed Target column from text-right to text-center
- `frontend/components/layout/AppShell.tsx` - Added overflow-y-auto + maxHeight to main element
- `frontend/components/layout/RightPanel.tsx` - Changed sticky top to top-0, removed self-start
- `frontend/messages/en.json` - Added hero.weekLabel key
- `frontend/messages/zh.json` - Added hero.weekLabel key, simplified date template

## Decisions Made
- Used date-fns zhCN locale which outputs full-form weekday (星期一) rather than short form (周一) -- this is the standard date-fns output and proper Chinese
- Changed RightPanel sticky from top-[calc(header+28px)] to top-0 since main scroll container already sits below the header
- Migrated HeroSection parallax from window.scrollY to main.scrollTop to match the new scroll container pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 10 gap closure plans for Phase 05 are complete
- Dashboard page UAT issues fully addressed
- Ready for PR cycle and phase completion

## Self-Check: PASSED

- SUMMARY.md exists
- Commit e0505f8 (Task 1) verified
- Commit 36313f6 (Task 2) verified
- All 4 modified source files verified

---
*Phase: 05-dashboard-page*
*Completed: 2026-03-23*
