---
phase: 02-core-services-api
plan: "01"
subsystem: api
tags: [gpa, wam, decimal, hypothesis, fastapi, sqlalchemy, pydantic]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: "ORM models (Course, Grade, User), auth system, FastAPI app, test infrastructure"
provides:
  - "GPAService with WAM/GPA Decimal calculation, what-if simulation, target path planner"
  - "WhatIfScenario ORM model with JSONB scores persistence"
  - "6 GPA REST endpoints under /api/v1/gpa/"
  - "Pydantic schemas for all GPA request/response models"
  - "Hypothesis property tests proving mathematical invariants"
  - "Grade unique constraint for future upsert support"
affects: [02-02-PLAN, phase-3-frontend, phase-4-intelligence]

# Tech tracking
tech-stack:
  added: [apscheduler, anthropic, rapidfuzz, hypothesis]
  patterns: [service-layer-depends-injection, decimal-precision-gpa, hypothesis-property-testing]

key-files:
  created:
    - src/services/gpa.py
    - src/schemas/gpa.py
    - src/web/routes/gpa.py
    - src/models/whatif.py
    - alembic/versions/002_phase2_gpa_schema.py
    - tests/unit/test_gpa_service.py
    - tests/integration/test_gpa_routes.py
    - tests/unit/__init__.py
  modified:
    - pyproject.toml
    - src/models/user.py
    - src/models/__init__.py
    - src/config.py
    - src/web/routes/__init__.py

key-decisions:
  - "Decimal(str(float)) for all GPA math to avoid IEEE 754 rounding drift"
  - "JSONB for WhatIfScenario scores_json to support flexible per-assessment overrides"
  - "Grade unique constraint (course_id, assessment_name) added for future sync upsert support"
  - "Sync config settings pre-added to Settings to avoid migration conflicts with Plan 02-02"

patterns-established:
  - "Service layer: GPAService(session) injected via Depends(get_gpa_service)"
  - "Decimal precision: all WAM/GPA uses Decimal with ROUND_HALF_UP, converted at service boundary"
  - "Hypothesis property tests: strategies generating (Decimal, int) tuples for WAM invariant testing"
  - "Integration test data seeding: access test session via app.dependency_overrides[get_session]"

requirements-completed: [GPA-01, GPA-02, GPA-03, GPA-04, GPA-05]

# Metrics
duration: 12min
completed: 2026-03-16
---

# Phase 2 Plan 01: GPA/WAM Engine Summary

**GPAService with Decimal WAM/GPA calculation, what-if simulator, target path planner, and 6 REST endpoints verified by Hypothesis property tests**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-16T09:55:12Z
- **Completed:** 2026-03-16T10:07:44Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- GPAService calculates WAM using Decimal arithmetic with ROUND_HALF_UP, matching USYD grade bands (HD/D/CR/P/F)
- What-if simulation creates persistent scenarios stored in PostgreSQL JSONB, recalculating WAM/GPA with hypothetical scores
- Target path planner returns per-assessment minimum scores in uniform and smart allocation modes
- 2 Hypothesis property tests (200 examples each) prove WAM always in [0,100] and GPA always in {0,4,5,6,7}
- 6 REST endpoints fully operational: summary, course detail, what-if create/list, target path, trend
- All 77 tests pass (21 new + 56 existing), zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Dependencies + Schema** - `3297880` (feat)
2. **Task 2: GPAService + Tests** - `2bbd13a` (feat, TDD)
3. **Task 3: REST Routes + Integration Tests** - `c015c56` (feat, TDD)

## Files Created/Modified
- `src/services/gpa.py` - GPAService with WAM/GPA calculation, what-if, target path, trend
- `src/schemas/gpa.py` - Pydantic request/response models for all GPA endpoints
- `src/web/routes/gpa.py` - 6 FastAPI endpoints for GPA features
- `src/models/whatif.py` - WhatIfScenario ORM model with JSONB scores
- `alembic/versions/002_phase2_gpa_schema.py` - Migration for whatif_scenarios, target_gpa_7pt, Grade constraint
- `tests/unit/test_gpa_service.py` - 13 tests (2 Hypothesis + 11 scenario)
- `tests/integration/test_gpa_routes.py` - 8 integration tests
- `pyproject.toml` - Added apscheduler, anthropic, rapidfuzz, hypothesis
- `src/models/user.py` - Added target_gpa_7pt and whatif_scenarios relationship
- `src/models/__init__.py` - Added WhatIfScenario to model registry
- `src/config.py` - Added sync engine and AI config settings
- `src/web/routes/__init__.py` - Registered GPA router

## Decisions Made
- Used `Decimal(str(float_value))` pattern consistently to avoid IEEE 754 float imprecision in WAM/GPA math
- JSONB column for WhatIfScenario.scores_json provides schema flexibility for per-assessment overrides
- Pre-added sync config settings (sync_grades_interval_min, anthropic_api_key, etc.) to avoid Alembic conflicts with Plan 02-02
- Used `sum(..., Decimal("0"))` pattern with explicit start value for mypy --strict Decimal type narrowing

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- mypy --strict flagged `sum()` over Decimal generators returning `Decimal | float` union type -- resolved by adding explicit `Decimal("0")` start parameter
- Pre-existing passlib stubs issue (src/security/password.py) causes mypy error when checking full src/ -- this is a Phase 1 issue, not caused by our changes, logged as out-of-scope

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- GPAService is ready for frontend consumption (Phase 3 Predict page)
- Grade unique constraint enables sync engine upsert pattern (Plan 02-02)
- Phase 2 dependencies (apscheduler, anthropic, rapidfuzz) are installed and ready for Plan 02-02
- Sync config settings are pre-defined, Plan 02-02 can use them directly

## Self-Check: PASSED

All 8 created files exist. All 3 task commits verified in git log.

---
*Phase: 02-core-services-api*
*Completed: 2026-03-16*
