---
phase: 22-critical-fixes
plan: 01
subsystem: api
tags: [voyageai, asyncio, embedding, fastapi, non-blocking]

# Dependency graph
requires:
  - phase: 19
    provides: QAService with VoyageAI embedding calls for RAG
provides:
  - Non-blocking VoyageAI embedding calls via AsyncClient
  - Tests verifying AsyncClient usage in both call sites
affects: [qa-service, rag-pipeline, embedding-generation]

# Tech tracking
tech-stack:
  added: []
  patterns: [voyageai.AsyncClient for async embedding, sys.modules patching for lazy import testing]

key-files:
  created: []
  modified:
    - src/services/qa.py
    - tests/unit/test_qa_service.py

key-decisions:
  - "sys.modules patching for lazy import mocking instead of module attribute patching"
  - "Real ContentEmbedding ORM model in tests instead of MagicMock to satisfy SQLAlchemy"

patterns-established:
  - "VoyageAI AsyncClient with 'result = await vo.embed()' two-line pattern"
  - "sys.modules dict patching for testing lazy-imported third-party modules"

requirements-completed: [CRIT-01]

# Metrics
duration: 9min
completed: 2026-04-01
---

# Phase 22 Plan 01: VoyageAI AsyncClient Migration Summary

**Migrated VoyageAI embed() from blocking synchronous Client to native AsyncClient in both QAService call sites, verified by 2 new tests**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-01T04:28:16Z
- **Completed:** 2026-04-01T04:37:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Replaced `voyageai.Client` with `voyageai.AsyncClient` in `_answer_rag()` and `embed_course_materials()`
- Both call sites now use non-blocking `await vo.embed()` pattern, preventing event loop stalls during 200-2000ms network I/O
- Added 2 new unit tests verifying AsyncClient usage, bringing total test_qa_service.py to 11 tests (all passing)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add AsyncClient verification tests** - `82ef67f` (test) - TDD RED phase
2. **Task 2: Migrate Client to AsyncClient in qa.py** - `bdedf4f` (feat) - TDD GREEN phase

## Files Created/Modified
- `src/services/qa.py` - Changed both VoyageAI call sites from synchronous Client to AsyncClient with await
- `tests/unit/test_qa_service.py` - Added test_answer_rag_uses_async_client and test_embed_course_materials_uses_async_client

## Decisions Made
- Used `sys.modules` dict patching (via `patch.dict`) for mocking lazy-imported `voyageai` module instead of `patch("src.services.qa.voyageai")` -- the lazy `import voyageai` inside methods resolves from `sys.modules`, not module attributes
- Used real `ContentEmbedding` ORM model in tests instead of MagicMock because SQLAlchemy's `select()` and `delete()` require valid mapped entities, not mock objects
- Injected `cosine_distance` into `pgvector.sqlalchemy` module via `patch.object` with `create=True` since pgvector 0.4.2 doesn't export this function (pre-existing compatibility issue)
- Kept per-call client instantiation pattern as specified in plan (lifecycle optimization deferred to future phase)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed test mocking strategy for lazy imports**
- **Found during:** Task 2 (GREEN phase - tests were failing despite correct production code)
- **Issue:** Plan's test patching approach (`patch("src.services.qa.voyageai", ...)`) doesn't work with Python's lazy `import voyageai` inside methods -- the import resolves from `sys.modules`, not module attributes
- **Fix:** Changed to `patch.dict(sys.modules, {"voyageai": mock_voyageai})` which correctly intercepts lazy imports. Also used real ContentEmbedding instead of MagicMock to satisfy SQLAlchemy's entity validation.
- **Files modified:** tests/unit/test_qa_service.py
- **Verification:** All 11 tests pass
- **Committed in:** bdedf4f (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug in test mocking strategy)
**Impact on plan:** Essential fix for test correctness. No scope creep -- same test intent, different mocking mechanism.

## Issues Encountered
- pgvector 0.4.2 does not export `cosine_distance` as a standalone function (it was available in earlier versions). This is a pre-existing issue affecting the RAG pipeline at runtime. Worked around it in tests by injecting a mock function. Logged as out-of-scope discovery.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- VoyageAI embedding calls are now non-blocking in the async event loop
- Ready for Plans 02 (config hardening) and 03 (Docker/CORS) in this phase
- Pre-existing pgvector compatibility issue noted but out of scope for this plan

---
*Phase: 22-critical-fixes*
*Completed: 2026-04-01*
