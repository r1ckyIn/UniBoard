---
phase: 23-code-quality
plan: 02
subsystem: api
tags: [refactoring, dead-code, dry, mixin, python, fastapi]

# Dependency graph
requires:
  - phase: 14-platform-adapters
    provides: Ed Discussion and Ed Lessons adapter implementations
  - phase: 15-core-services-api-routes
    provides: auth.py route, notification service, courses/gpa routes
provides:
  - EdRequestMixin shared base for all Ed platform adapters
  - Clean F401 violations in src/
  - Dead code removed (auth.py, schemas/auth.py, unused hooks, dead deps)
affects: [23-code-quality, future-adapters]

# Tech tracking
tech-stack:
  added: []
  patterns: [EdRequestMixin mixin pattern for shared adapter request logic]

key-files:
  created:
    - src/adapters/_ed_base.py
  modified:
    - src/adapters/ed_discussion.py
    - src/adapters/ed_lessons.py
    - src/web/routes/__init__.py
    - src/services/notification.py
    - src/web/routes/courses.py
    - src/web/routes/gpa.py
    - pyproject.toml
    - frontend/package.json

key-decisions:
  - "EdRequestMixin uses _platform_name string for log key/error message parameterization"
  - "Mixin placed first in MRO (EdRequestMixin, DiscussionAdapter) for correct method resolution"

patterns-established:
  - "EdRequestMixin: shared _request() for Ed adapters via mixin inheritance"

requirements-completed: [QUAL-02, QUAL-03]

# Metrics
duration: 6min
completed: 2026-04-01
---

# Phase 23 Plan 02: DRY Consolidation and Dead Code Removal Summary

**EdRequestMixin extracts shared Ed adapter _request() logic; 275+ lines of dead code removed across 4 files, 4 imports, and 4 dependencies, fixing language_preference bug**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-01T06:43:09Z
- **Completed:** 2026-04-01T06:49:30Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Extracted shared EdRequestMixin from duplicate _request() in Ed Discussion and Ed Lessons adapters (DRY consolidation, QUAL-02)
- Deleted 4 dead files (auth.py route with language_preference bug, schemas/auth.py, use-search.ts, use-grades.ts) totaling 178 lines
- Removed 4 unused imports (Profile, UTC, selectinload, Any) fixing all ruff F401 violations
- Removed 4 dead dependencies (passlib, bcrypt, jinja2, react-rough-notation) from lock files

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Ed adapter mixin and refactor both adapters** - `435cae6` (refactor)
2. **Task 2: Remove dead code files, imports, dependencies, and dead auth route** - `900ae94` (fix)

## Files Created/Modified
- `src/adapters/_ed_base.py` - New EdRequestMixin with shared _request() method
- `src/adapters/ed_discussion.py` - Refactored to inherit from EdRequestMixin, _request() removed
- `src/adapters/ed_lessons.py` - Refactored to inherit from EdRequestMixin, _request() removed
- `src/web/routes/auth.py` - DELETED (53 lines, buggy /auth/me endpoint)
- `src/schemas/auth.py` - DELETED (42 lines, unused Supabase-replaced schemas)
- `frontend/hooks/use-search.ts` - DELETED (55 lines, zero imports)
- `frontend/hooks/use-grades.ts` - DELETED (28 lines, zero imports)
- `src/web/routes/__init__.py` - Removed auth_router registration
- `src/services/notification.py` - Removed unused Profile import
- `src/web/routes/courses.py` - Removed unused UTC import
- `src/web/routes/gpa.py` - Removed unused selectinload import
- `pyproject.toml` - Removed passlib, bcrypt, jinja2 deps and mypy override
- `frontend/package.json` - Removed react-rough-notation dependency

## Decisions Made
- EdRequestMixin uses `_platform_name` string attribute for log key and error message parameterization (e.g., "ed_discussion" vs "ed_lessons" in log events)
- Mixin placed first in MRO (`EdRequestMixin, DiscussionAdapter`) to ensure `_request()` resolves to the mixin implementation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed unused `Any` import in ed_lessons.py after mixin extraction**
- **Found during:** Task 2 verification (ruff F401 check)
- **Issue:** After removing `_request()` from ed_lessons.py in Task 1, the `from typing import Any` import became unused (it was only used in `_request()` parameter types)
- **Fix:** Removed the unused `typing.Any` import
- **Files modified:** src/adapters/ed_lessons.py
- **Verification:** `ruff check src/ --select F401` reports 0 errors
- **Committed in:** 900ae94 (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup from Task 1's refactoring. No scope creep.

## Issues Encountered
- Test helpers for Ed adapters use `__new__` to bypass `__init__`, so `_platform_name` was not set. Fixed by adding `_platform_name` assignment in both test helpers.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Ed adapters share clean mixin base, ready for any future Ed platform adapter additions
- All ruff F401 violations resolved, codebase is clean
- Dead dependencies removed, reducing install size and attack surface

---
*Phase: 23-code-quality*
*Completed: 2026-04-01*
