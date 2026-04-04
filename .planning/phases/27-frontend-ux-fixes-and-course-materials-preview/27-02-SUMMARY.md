---
phase: 27-frontend-ux-fixes-and-course-materials-preview
plan: 02
subsystem: frontend-timetable
tags: [timetable, ux, attendance-border, scroll-indicator]
dependency_graph:
  requires: [use-courses hook, courseOptions.detail, TimetableSession type]
  provides: [hasAttendance prop on TimetableEvent, attendanceCourses Set, scroll gradient on deadlines]
  affects: [TimetableEvent, TimetableGrid, TimetablePage, TimetableUpcomingDeadlines]
tech_stack:
  added: []
  patterns: [useQueries for parallel course detail fetch, ResizeObserver for scroll detection]
key_files:
  created:
    - frontend/__tests__/timetable/TimetableEvent.test.tsx
    - frontend/__tests__/timetable/TimetableUpcomingDeadlines.test.tsx
  modified:
    - frontend/components/timetable/TimetableEvent.tsx
    - frontend/components/timetable/TimetableGrid.tsx
    - frontend/components/timetable/TimetablePage.tsx
    - frontend/components/timetable/TimetableUpcomingDeadlines.tsx
decisions:
  - "ATTENDANCE_KEYWORDS array for case-insensitive group_name matching (attendance, participation)"
  - "useQueries pattern from PredictPage reused for parallel course detail fetching"
  - "maxHeight 320px for deadline scroll container matches right panel proportions"
  - "Gradient uses rgba(246,245,240,0.95) matching RoughCard background for seamless fade"
metrics:
  duration: 6min
  completed: 2026-04-04
---

# Phase 27 Plan 02: Timetable Attendance Border & Deadline Scroll Indicator Summary

Timetable events show solid/dashed left border based on course attendance/participation assessment data; upcoming deadlines section shows gradient fade when items overflow.

## What Was Done

### Task 1: hasAttendance Prop for TimetableEvent (6901692)

**Problem:** All timetable events had identical solid left borders, providing no visual distinction between courses with attendance/participation requirements and those without.

**Solution:**
- Added `hasAttendance?: boolean` prop to `TimetableEvent` - controls solid (true) vs dashed (false/undefined) left border style
- Added `attendanceCourses?: Set<string>` prop to `TimetableGrid` - passes attendance lookup to events via `attendanceCourses?.has(s.course_code)`
- In `TimetablePage`, added `useQueries` call to fetch all course details in parallel (same pattern as PredictPage)
- Computed `attendanceCourses` Set via useMemo: checks each course's `assessment_weights` for group_names containing "attendance" or "participation" (case-insensitive)
- Added 4 test cases covering solid, dashed, default, and text rendering

### Task 2: Scroll Overflow Gradient for TimetableUpcomingDeadlines (e4f4020)

**Problem:** When many upcoming deadlines existed, items below the fold were invisible with no visual cue that more content was available.

**Solution:**
- Added scroll container with `maxHeight: 320px` and `overflow-y-auto` around the deadline items list
- Implemented `canScrollDown` state with scroll event listener (`{ passive: true }`) and ResizeObserver for dynamic content detection
- Renders a 32px gradient overlay (`linear-gradient(transparent, rgba(246,245,240,0.95))`) at the bottom when content overflows
- Gradient auto-hides when scrolled to bottom (within 2px threshold) or when content fits
- Added 4 test cases covering rendering, overflow detection, non-overflow, and gradient attributes

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- All 29 timetable tests pass (4 new TimetableEvent + 4 new TimetableUpcomingDeadlines + 21 existing)
- TypeScript: zero errors (`pnpm tsc --noEmit`)
- No existing tests broken

## Known Stubs

None - all data flows are wired through existing hooks and API endpoints.

## Self-Check: PASSED

- All 6 modified/created source files exist
- SUMMARY.md exists at expected path
- Commit 6901692 (Task 1) found in git log
- Commit e4f4020 (Task 2) found in git log
