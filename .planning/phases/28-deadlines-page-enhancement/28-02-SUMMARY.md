---
phase: 28-deadlines-page-enhancement
plan: "02"
subsystem: frontend/deadlines
tags: [urgency, filter-logic, mutation-hooks, mock-api, i18n, overdue]
dependency_graph:
  requires: []
  provides: [urgency-overdue-level, deadline-action-mock-api, mutation-hooks, filter-semantics]
  affects: [deadline-card-redesign, deadline-timeline, notification-panel]
tech_stack:
  added: []
  patterns: [module-scoped-mock-state, optimistic-mutation, extended-type-pattern]
key_files:
  created:
    - frontend/app/api/v1/deadlines/[deadlineId]/actions/route.ts
    - frontend/app/api/v1/deadlines/[deadlineId]/actions/[action]/route.ts
  modified:
    - frontend/lib/deadlines/urgency.ts
    - frontend/lib/fixtures/deadlines.ts
    - frontend/app/api/v1/deadlines/route.ts
    - frontend/hooks/use-deadlines.ts
    - frontend/components/deadlines/DeadlinesPage.tsx
    - frontend/messages/en.json
    - frontend/messages/zh.json
decisions:
  - "Overdue and urgent share same red color (#d97757); visual distinction via card border in Plan 03"
  - "Module-scoped Map for mock action persistence (survives navigation, resets on server restart)"
  - "Extended Deadline type in fixture file with is_pinned/is_deleted optional fields (not yet in OpenAPI)"
  - "Filter uses Record<string, unknown> cast for is_deleted to avoid strict type errors before spec update"
metrics:
  duration: 4min
  tasks_completed: 2
  tasks_total: 2
  files_modified: 9
  completed_date: "2026-04-04"
---

# Phase 28 Plan 02: Urgency Extension, Filter Logic & Mock API Summary

Extended urgency system with "overdue" level (daysRemaining < 0), revised All/Week filter semantics, created mock route handlers for deadline user actions, and added mutation hooks with optimistic cache invalidation.

## Changes Made

### Task 1: Urgency Extension + Fixture Data + Mock Route Handlers

**urgency.ts** -- Added `"overdue"` as first entry in the `Urgency` type union. Updated `getUrgency()` to return `"overdue"` when `daysRemaining < 0`. Added overdue entry to `URGENCY_COLORS` with red palette (#d97757), same as urgent (visual distinction comes from card border in Plan 03).

**deadlines.ts** -- Added 2 overdue fixture entries (`ddl_comp2017_w3` Weekly Task W3, `ddl_math2021_hw0` Homework 0) with `status: "overdue"` and negative `days_remaining`. Extended local Deadline type with optional `is_pinned` and `is_deleted` boolean fields. Added both fields (defaulting false) to all existing entries.

**deadlines/route.ts** -- Added module-scoped `deadlineActions` Map with `"pinned"` and `"deleted"` Sets for mock state persistence. GET handler now annotates each deadline with `is_pinned` and `is_deleted` from the state map.

**[deadlineId]/actions/route.ts** -- New POST handler for creating deadline user actions. Accepts `{action: "pin"|"delete"}` in body, adds deadline ID to the corresponding Set, returns action confirmation.

**[deadlineId]/actions/[action]/route.ts** -- New DELETE handler for removing deadline user actions. Extracts action from URL params, removes deadline ID from the corresponding Set.

### Task 2: Filter Logic Changes + Mutation Hooks

**DeadlinesPage.tsx** -- Revised filter logic per D-05 and D-06:
- All modes now exclude user-deleted deadlines (`is_deleted` filter at top)
- "All" mode filters to `upcoming | overdue | submitted` statuses only (hides completed)
- "Week" mode expanded from `0-7` to `-7 to +7` day window (includes recent past)

**use-deadlines.ts** -- Added `actions` key to `deadlineKeys` factory. Added `useCreateDeadlineAction()` and `useRemoveDeadlineAction()` mutation hooks with optimistic update pattern (cancel queries, save previous, rollback on error, invalidate on settle).

**en.json / zh.json** -- Added 6 new i18n keys under deadlines: `pinToTop`, `unpin`, `deleteDeadline`, `undoDelete`, `deletedToast`, `overdue` in both English and Chinese.

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | cc6b3ff | feat(28-02): extend urgency system with overdue level, add fixtures and mock route handlers |
| 2 | 835f185 | feat(28-02): revise filter logic, add mutation hooks, and i18n messages |

## Known Stubs

None -- all code is functional. The `is_pinned`/`is_deleted` fields are development-ready with mock state persistence. Plan 03 will consume these via the DeadlineCard component redesign.

## Self-Check: PASSED

- [x] `frontend/lib/deadlines/urgency.ts` exists with overdue level
- [x] `frontend/lib/fixtures/deadlines.ts` exists with overdue entries
- [x] `frontend/app/api/v1/deadlines/route.ts` exists with deadlineActions
- [x] `frontend/app/api/v1/deadlines/[deadlineId]/actions/route.ts` exists
- [x] `frontend/app/api/v1/deadlines/[deadlineId]/actions/[action]/route.ts` exists
- [x] `frontend/hooks/use-deadlines.ts` exists with mutation hooks
- [x] `frontend/components/deadlines/DeadlinesPage.tsx` exists with revised filter logic
- [x] Commit cc6b3ff found
- [x] Commit 835f185 found
