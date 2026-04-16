---
phase: 33-token-lifecycle-onboarding
plan: 03
subsystem: api
tags: [fastapi, pydantic, openapi, sync, onboarding]

# Dependency graph
requires:
  - phase: 15-backend-api
    provides: SyncStatusResponse Pydantic schema + GET /sync/status endpoint
  - phase: 32.1-sync-hardening
    provides: SyncHistory audit trail populated by real Canvas/Ed sync runs
provides:
  - per_platform_counts field on SyncStatusResponse grouping domain counters by source platform (canvas/ed)
  - DOMAIN_TO_PLATFORM mapping as single source of truth for domain->platform grouping
  - aggregate_per_platform_counts helper for unit-testable aggregation logic
  - Regenerated frontend OpenAPI types with full typed access to the new field
affects: [33-07-success-step, onboarding, sync, platform-progress]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Server-side domain->platform aggregation (keeps mapping in one place, survives future domain additions)
    - Extract-helper-for-testability (pulled aggregation out of route handler into pure function)

key-files:
  created:
    - tests/unit/test_sync_status.py
  modified:
    - src/schemas/sync.py
    - src/web/routes/sync.py
    - frontend/openapi/openapi.yaml
    - frontend/lib/api/types.gen.d.ts

key-decisions:
  - "Extract aggregate_per_platform_counts as module-level pure function (not inline in route) so it can be unit-tested without DB/auth fixtures"
  - "per_platform_counts is None when profile.last_sync_at is None (matches last_sync=None semantics from the plan spec)"
  - "Missing domain counters default to 0 (full canvas+ed shape always populated when sync has happened) — avoids frontend undefined-checks per domain"
  - "Fix pre-existing openapi.yaml drift: add course_id to Deadline schema (was hand-edited into types.gen.d.ts in 14923ad but never into the yaml spec)"

patterns-established:
  - "Contract-first regeneration: openapi.yaml is source of truth; types.gen.d.ts is regenerated via pnpm generate:types, never hand-edited"
  - "DOMAIN_TO_PLATFORM constant near route: future domain additions (e.g., modules, outline) can be grouped by extending the map"

requirements-completed: [ONBD-01]

# Metrics
duration: 6min
completed: 2026-04-15
---

# Phase 33 Plan 03: Per-Platform Sync Counts Summary

**GET /sync/status response extended with per_platform_counts grouping domain counters under canvas/ed; frontend OpenAPI types regenerated for typed access**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-15T07:32:45Z
- **Completed:** 2026-04-15T07:39:00Z
- **Tasks:** 2
- **Files modified:** 4 (1 created, 3 edited)

## Accomplishments
- Added three new Pydantic schemas (CanvasPlatformCounts, EdPlatformCounts, PerPlatformCounts) and extended SyncStatusResponse with optional per_platform_counts field
- Introduced DOMAIN_TO_PLATFORM constant and aggregate_per_platform_counts helper in src/web/routes/sync.py
- Wired aggregation into GET /sync/status handler with None fallback when no sync has happened yet
- Regenerated frontend types from openapi.yaml; typecheck clean (0 errors)
- Fixed pre-existing openapi.yaml drift: Deadline schema now correctly includes course_id (was hand-edit in generated file only)

## Task Commits

1. **Task 1 RED: failing test for per-platform aggregation** — `71a1b02` (test)
2. **Task 1 GREEN: add per_platform_counts to sync status response** — `69f7025` (feat)
3. **Task 2: regenerate frontend types for per_platform_counts** — `d14563e` (feat)

_TDD: Task 1 split into RED (test) and GREEN (impl) commits per `<tdd_execution>` protocol. No refactor commit needed — helper was already clean._

## Files Created/Modified
- `tests/unit/test_sync_status.py` (created) — 6 unit tests covering aggregation logic, DOMAIN_TO_PLATFORM mapping, and invariants
- `src/schemas/sync.py` (modified) — Added CanvasPlatformCounts, EdPlatformCounts, PerPlatformCounts; extended SyncStatusResponse
- `src/web/routes/sync.py` (modified) — Added DOMAIN_TO_PLATFORM, aggregate_per_platform_counts helper, wired into GET /sync/status
- `frontend/openapi/openapi.yaml` (modified) — Added PerPlatformCounts/CanvasPlatformCounts/EdPlatformCounts schemas; fixed Deadline.course_id drift
- `frontend/lib/api/types.gen.d.ts` (modified) — Regenerated via pnpm generate:types

## Decisions Made
- **Helper extraction for testability**: The aggregation logic is a pure function (SyncResults -> PerPlatformCounts | None) with no DB/auth dependencies, so it was extracted from the route handler. Unit tests hit the helper directly, avoiding the FastAPI TestClient + auth-fixture complexity mentioned in the plan's test hint. Six focused tests cover the four behaviors in the plan plus the mapping constant and an invariant check.
- **None semantics for per_platform_counts**: Plan spec says "matches last_sync=None semantics". The current `SyncStatusResponse.last_sync` is never actually None in the route (always constructed with fallback timestamps), so the gate `profile.last_sync_at` (the column) is used instead — None when the user has never synced, matching the intended UX.
- **Zero-fill for missing domains**: When sync_history has only some domains (e.g., deadlines only), the missing counters default to 0 so `counts.canvas.grades` and `counts.ed.discussions` are always present. Frontend consumers don't need per-field undefined checks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed pre-existing openapi.yaml drift on Deadline.course_id**
- **Found during:** Task 2 (frontend typecheck after regenerating types)
- **Issue:** Running `pnpm generate:types` overwrote a hand-edited `course_id` field on the `Deadline` type (added in commit 14923ad "fix(19): add course_id to Deadline"). The openapi.yaml spec never carried this field, so regeneration dropped it and broke typecheck on 14 lib/fixtures/deadlines.ts literals and DeadlineCard.tsx.
- **Fix:** Added `course_id: string` to the `Deadline` schema's second allOf branch in openapi.yaml and regenerated types. Aligns the spec with the actual backend contract (confirmed against src schemas).
- **Files modified:** frontend/openapi/openapi.yaml (+ regenerated types.gen.d.ts)
- **Verification:** `pnpm typecheck` → 0 errors; `grep -q 'per_platform_counts'` → found; Deadline tests compile.
- **Committed in:** d14563e (Task 2 commit)

### Scope Boundary Notes
Other uncommitted file modifications were present in the worktree (frontend/components/auth/ForgotPasswordForm.tsx, messages/en.json, messages/zh.json, __tests__/auth/ForgotPasswordForm.test.tsx). These are not part of plan 33-03 — they belong to a parallel executor (likely another Phase 33 plan). Left uncommitted by this executor.

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** The fix was essential — without it, the type regeneration (which is the whole point of Task 2) would have broken the frontend. The deviation corrects drift that predates this plan.

## Issues Encountered
- None during planned work. Only the pre-existing drift noted above.

## User Setup Required
None — no external service configuration required. The new field is additive and backwards-compatible (optional in the OpenAPI spec; nullable in Pydantic).

## Next Phase Readiness
- Plan 33-07 (SuccessStep platform rows) can now consume `data.per_platform_counts.canvas.total` and `data.per_platform_counts.ed.total` with full TypeScript type safety.
- No blockers. Backend and frontend contract aligned (OpenAPI yaml = source of truth).

## Verification Evidence

```
# Backend unit tests
UNIBOARD_DISABLE_SYNC=true DEBUG=true uv run pytest tests/unit/test_sync_status.py -x --timeout=60
→ 6 passed in 0.24s

# Backend mypy (strict)
uv run mypy --strict src/schemas/sync.py src/web/routes/sync.py
→ Success: no issues found in 2 source files

# Frontend typecheck
cd frontend && pnpm typecheck
→ exit 0

# Spot-check contract
grep -A 5 'per_platform_counts' frontend/lib/api/types.gen.d.ts
→ per_platform_counts?: components["schemas"]["PerPlatformCounts"] | null;
  platforms: components["schemas"]["PlatformStatus"];
  };
  PerPlatformCounts: {
      canvas: components["schemas"]["CanvasPlatformCounts"];
      ed: components["schemas"]["EdPlatformCounts"];
```

## Self-Check: PASSED

- Files created: tests/unit/test_sync_status.py → FOUND
- Files modified: src/schemas/sync.py, src/web/routes/sync.py, frontend/openapi/openapi.yaml, frontend/lib/api/types.gen.d.ts → ALL FOUND
- Commits: 71a1b02 (test), 69f7025 (feat), d14563e (feat) → ALL FOUND IN git log

---
*Phase: 33-token-lifecycle-onboarding*
*Completed: 2026-04-15*
