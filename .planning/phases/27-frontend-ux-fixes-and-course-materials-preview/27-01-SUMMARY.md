---
phase: 27-frontend-ux-fixes-and-course-materials-preview
plan: 01
subsystem: frontend-dashboard
tags: [ux, navigation, activity, dashboard, tdd]
dependency_graph:
  requires: []
  provides: [per-type-activity-routing, internalPath-field]
  affects: [dashboard-page, recent-activity-component]
tech_stack:
  added: []
  patterns: [type-based-url-classification, internal-vs-external-routing]
key_files:
  created: []
  modified:
    - frontend/lib/notifications/map-to-activity.ts
    - frontend/components/dashboard/RecentActivity.tsx
    - frontend/__tests__/dashboard/RecentActivity.test.tsx
decisions:
  - "Check n.type === 'deadline_reminder' (not activityType === 'deadline') to avoid false positive on fallback types like token_expired"
  - "Grade type always sets internalPath from action_url; deadline type always overrides to /deadlines per D-01"
  - "Component changes bundled into Task 1 TDD GREEN phase since tests drive both map-to-activity and component behavior"
metrics:
  duration: 6min
  completed: "2026-04-04T10:10:00Z"
  tasks: 2
  files: 3
---

# Phase 27 Plan 01: Dashboard Activity Navigation Routing Summary

Per-type click routing for dashboard activity items using URL classification in map-to-activity and router.push/ExternalLinkDialog dispatch in RecentActivity

## What Was Done

### Task 1: ActivityItem type + URL classification + tests (TDD)

Added `internalPath?: string` field to the `ActivityItem` interface in `map-to-activity.ts`. Replaced the blanket `externalUrl: n.action_url` assignment with type-based URL classification:

- **grade** type: always sets `internalPath = action_url` (course pages are internal)
- **deadline_reminder** type: always sets `internalPath = "/deadlines"` (per D-01 decision)
- **discussion/endorsed** with `startsWith("/")`: sets `internalPath` (internal route)
- **discussion/endorsed** with `startsWith("http")`: sets `externalUrl` (external Ed link)
- All other types: same URL format classification

Wrote 11 tests (6 unit tests for `mapNotificationToActivity` + 5 component tests for `RecentActivity`) replacing all `.todo()` stubs.

### Task 2: Per-type click routing in RecentActivity component

Imported `useRouter` from `@/lib/i18n/navigation`. Changed `handleItemClick` from accepting `url?: string` to accepting `ActivityItem`. Logic:
- `item.internalPath` present: `router.push(item.internalPath)` for in-app navigation
- `item.externalUrl` present: `setDialogUrl(item.externalUrl)` for ExternalLinkDialog
- Neither present: no action (item not clickable)

Updated `role`, `tabIndex`, `className`, `onClick`, and `onKeyDown` conditions from `item.externalUrl` to `item.internalPath || item.externalUrl`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1+2 | 4e53546 | feat(27-01): add per-type navigation routing for dashboard activity items |

## Verification Results

- 11/11 tests pass (vitest)
- 0 TypeScript errors (tsc --noEmit)
- Grade activity navigates to `/courses/{courseId}` in-app
- Deadline activity navigates to `/deadlines` in-app
- Discussion/endorsed with external URL opens ExternalLinkDialog
- Items without any URL are not clickable (no role="button")
- UX-02 (predict button) confirmed already working (no changes needed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed deadline type classification check**
- **Found during:** Task 1 GREEN phase
- **Issue:** Using `activityType === "deadline"` matched the fallback default for unrecognized types (e.g., `token_expired`), causing them to incorrectly route to `/deadlines`
- **Fix:** Changed to `n.type === "deadline_reminder"` to only match actual deadline notifications
- **Files modified:** `frontend/lib/notifications/map-to-activity.ts`
- **Commit:** 4e53546

**2. [Process] Tasks 1 and 2 merged into single commit**
- **Reason:** TDD GREEN phase required both map-to-activity changes AND component wiring for tests to pass. Since tests in Task 1 cover component behavior that requires Task 2's changes, both were implemented together.

## Known Stubs

None - all functionality is fully wired.

## Self-Check: PASSED

- FOUND: frontend/lib/notifications/map-to-activity.ts
- FOUND: frontend/components/dashboard/RecentActivity.tsx
- FOUND: frontend/__tests__/dashboard/RecentActivity.test.tsx
- FOUND: .planning/phases/27-frontend-ux-fixes-and-course-materials-preview/27-01-SUMMARY.md
- FOUND: commit 4e53546
