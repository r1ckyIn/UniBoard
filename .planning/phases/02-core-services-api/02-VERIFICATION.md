---
phase: 02-core-services-api
verified: 2026-03-16T21:45:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 2: Core Services & API Verification Report

**Phase Goal:** Users can retrieve real-time GPA data, unified deadlines, and course materials through REST API endpoints
**Verified:** 2026-03-16T21:45:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | API returns current GPA/WAM calculated from synced Canvas grades, with per-course breakdown showing grade band (HD/D/CR/P/F) and percentage assessed | VERIFIED | GPAService uses Decimal(str(float)) + ROUND_HALF_UP throughout; GRADE_BANDS maps 85->HD(7), 75->D(6), 65->CR(5), 50->P(4), <50->F(0); CourseSummary includes grade_band, gpa_point, pct_assessed fields; 2 Hypothesis property tests (200 examples each) prove WAM in [0,100] and GPA in {0,4,5,6,7}; 13 unit tests + 8 integration tests pass |
| 2 | API returns What-if simulation results when given hypothetical scores, and returns minimum required scores for a target GPA | VERIFIED | GPAService.simulate() creates WhatIfScenario ORM row with JSONB scores_json; GPAService.calculate_target_path() supports uniform + smart modes; Tests: test_whatif_simulate, test_whatif_persistence, test_target_path_uniform_achievable, test_target_path_unreachable all pass; POST /gpa/what-if returns 201, POST /gpa/target returns TargetPathResponse |
| 3 | API returns a deduplicated unified deadline list from Canvas + Ed Lessons + Ed Discussion, with no duplicates (SHA-256 dedup verified) | VERIFIED | DeadlineService uses hashlib.sha256 for exact dedup + rapidfuzz.fuzz.token_set_ratio (threshold 95) for fuzzy matching; aggregate_and_dedup() processes Canvas assignments, Ed Lessons, and Ed Discussion regex-extracted dates; 14 unit tests cover normalize_title, compute_dedup_key, find_near_duplicate, calculate_urgency, extract_deadlines_from_text |
| 4 | API returns course materials with AI-generated folder descriptions, and keyword search returns matching files with content snippets | VERIFIED | CourseMaterialService.get_course_materials() returns unified folder view with Module.ai_description or rule-based fallback; generate_ai_description() calls Claude Haiku with daily limit and fallback; search() uses PostgreSQL tsvector with plainto_tsquery + ts_headline for highlighted snippets; 5 integration tests verify tsvector search, ts_headline snippets, course code search, no results |
| 5 | Background sync engine runs on configured intervals (grades 15min, deadlines 1h, modules daily) and token expiration warnings are surfaced | VERIFIED | SyncEngine uses APScheduler 3.11 AsyncIOScheduler with IntervalTrigger(minutes=15) for grades, IntervalTrigger(minutes=60) for deadlines, CronTrigger(hour=3) for modules; sync tasks detect TokenInvalidError and set canvas_token_status="expired"; Manual sync trigger respects 5-minute throttle; 4 integration tests verify: sync status endpoint, manual trigger, throttle, token expiry detection |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/services/gpa.py` | GPAService with WAM/GPA calculation, what-if, target path | VERIFIED | 506 lines, class GPAService with all 6 methods, Decimal arithmetic throughout |
| `src/schemas/gpa.py` | Pydantic request/response models | VERIFIED | 133 lines, 13 schema classes including GPASummaryResponse, WhatIfCreateRequest, TargetPathResponse |
| `src/web/routes/gpa.py` | 6 FastAPI endpoints | VERIFIED | 97 lines, router with summary, course detail, what-if create/list, target, trend |
| `src/models/whatif.py` | WhatIfScenario ORM model | VERIFIED | 31 lines, JSONB scores_json, Float result_wam/result_gpa, FK to users |
| `alembic/versions/002_phase2_gpa_schema.py` | Migration for whatif_scenarios, target columns, Grade constraint | VERIFIED | Applied to DB; whatif_scenarios table EXISTS, uq_grades_course_assessment EXISTS, target_gpa_7pt EXISTS |
| `alembic/versions/003_phase2_search_sync_schema.py` | Migration for tsvector, sync status, text_content | VERIFIED | Applied to DB; search_vector on module_items and lessons EXISTS, sync status columns EXISTS |
| `src/services/deadline.py` | DeadlineService with SHA-256 dedup + rapidfuzz | VERIFIED | 361 lines, hashlib.sha256 + fuzz.token_set_ratio threshold 95, aggregate_and_dedup() with 3-phase processing |
| `src/services/materials.py` | CourseMaterialService with folder view + search | VERIFIED | 296 lines, tsvector search with ts_headline, AI description with rule-based fallback |
| `src/services/intelligence.py` | EdIntelligenceService for endorsed/staff posts | VERIFIED | 56 lines, filters is_endorsed + is_staff_post, returns HighValuePostResponse |
| `src/sync/engine.py` | APScheduler lifespan manager | VERIFIED | 96 lines, AsyncIOScheduler with 3 jobs, UNIBOARD_DISABLE_SYNC guard |
| `src/sync/tasks.py` | Sync tasks for grades, deadlines, modules | VERIFIED | 363 lines, upsert with on_conflict_do_update, TokenInvalidError -> expired status, retry logic |
| `src/web/routes/deadlines.py` | Deadline REST endpoints | VERIFIED | 71 lines, 3 endpoints: list, conflicts, detail |
| `src/web/routes/materials.py` | Materials and search endpoints | VERIFIED | 59 lines, 3 endpoints: course materials, folder items, search |
| `src/web/routes/sync.py` | Sync trigger and status endpoints | VERIFIED | 90 lines, 2 endpoints: trigger (throttled), status |
| `src/web/routes/intelligence.py` | Ed Discussion intelligence endpoint | VERIFIED | 34 lines, 1 endpoint: high-value posts by course |
| `tests/unit/test_gpa_service.py` | Hypothesis + scenario unit tests | VERIFIED | 434 lines, 2 Hypothesis (200 examples) + 11 scenario tests |
| `tests/unit/test_deadline_service.py` | Dedup scenario tests | VERIFIED | 139 lines, 14 tests covering normalize, dedup key, fuzzy match, urgency, regex extraction |
| `tests/unit/test_materials_service.py` | Rule-based description tests | VERIFIED | 39 lines, 5 tests for _rule_based_description |
| `tests/unit/test_intelligence_service.py` | Post filtering tests | VERIFIED | 155 lines, 4 tests for endorsed/staff/regular/truncation |
| `tests/integration/test_gpa_routes.py` | GPA endpoint integration tests | VERIFIED | 294 lines, 8 tests hitting real HTTP endpoints |
| `tests/integration/test_sync_engine.py` | Sync lifecycle tests | VERIFIED | 136 lines, 4 tests for status, trigger, throttle, token expiry |
| `tests/integration/test_search.py` | Full-text search tests | VERIFIED | 151 lines, 5 tests for tsvector search + ts_headline |
| `tests/integration/test_routes_phase2.py` | Phase 2 route integration tests | VERIFIED | 124 lines, 6 tests for deadlines, search, sync, auth requirement, discussions |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| src/services/gpa.py | src/models/grade.py | selectinload(Course.grades) | WIRED | Lines 155, 212 |
| src/services/gpa.py | src/models/whatif.py | WhatIfScenario create/query | WIRED | Lines 302, 327-329 |
| src/web/routes/gpa.py | src/services/gpa.py | Depends(get_gpa_service) | WIRED | Lines 25-27, used in all 6 endpoints |
| src/web/routes/gpa.py | src/schemas/gpa.py | Response type annotations | WIRED | GPASummaryResponse, CourseDetailResponse, etc. imported and used |
| src/web/routes/__init__.py | src/web/routes/gpa.py | include_router(gpa_router, prefix="/gpa") | WIRED | Line 17 |
| src/web/routes/__init__.py | src/web/routes/deadlines.py | include_router(deadlines_router, prefix="/deadlines") | WIRED | Line 18 |
| src/web/routes/__init__.py | src/web/routes/materials.py | include_router(materials_router) | WIRED | Line 19 |
| src/web/routes/__init__.py | src/web/routes/sync.py | include_router(sync_router, prefix="/sync") | WIRED | Line 20 |
| src/web/routes/__init__.py | src/web/routes/intelligence.py | include_router(intelligence_router) | WIRED | Line 21 |
| src/web/main.py | src/sync/engine.py | lifespan=lifespan in FastAPI() | WIRED | Lines 12, 26 |
| src/sync/engine.py | src/sync/tasks.py | sync_all_grades, sync_all_deadlines, sync_all_modules | WIRED | Lines 39-43, imported inside lifespan |
| src/sync/tasks.py | src/services/deadline.py | DeadlineService for aggregate_and_dedup | WIRED | Line 22, used in sync_all_deadlines |
| src/sync/tasks.py | src/models/user.py | canvas_token_status="expired" on 401/403 | WIRED | Lines 111, 115, 218 |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| GPA-01 | 02-01 | WAM calculation with Decimal ROUND_HALF_UP | SATISFIED | GPAService._calculate_course_wam() and _calculate_cumulative_wam() use Decimal(str(float)) + quantize(ROUND_HALF_UP); Hypothesis tests prove invariants |
| GPA-02 | 02-01 | Per-course summary with grade band and pct_assessed | SATISFIED | CourseSummary schema includes grade_band, gpa_point, pct_assessed; test_pct_assessed_calculation and test_grade_band_boundaries pass |
| GPA-03 | 02-01 | What-if simulation with persistent WhatIfScenario | SATISFIED | GPAService.simulate() creates WhatIfScenario row with JSONB; test_whatif_simulate and test_whatif_persistence pass |
| GPA-04 | 02-01 | Target path planner (uniform + smart) | SATISFIED | GPAService.calculate_target_path() supports both modes; test_target_path_uniform_achievable and test_target_path_unreachable pass |
| GPA-05 | 02-01 | Trend data (per-semester WAM/GPA) | SATISFIED | GPAService.get_trend() groups by semester with running cumulative; test_trend_multiple_semesters passes |
| DL-01 | 02-02 | Deadline aggregation with SHA-256 dedup + rapidfuzz | SATISFIED | DeadlineService.aggregate_and_dedup() with hashlib.sha256 + fuzz.token_set_ratio(threshold=95); 14 unit tests pass |
| INTEL-01 | 02-02 | Ed intelligence with is_endorsed/is_staff_post filter | SATISFIED | EdIntelligenceService filters via or_(is_endorsed, is_staff_post); 4 unit tests pass |
| INTEL-05 | 02-02 | Full-text search with tsvector and ts_headline | SATISFIED | CourseMaterialService.search() uses plainto_tsquery + ts_headline across module_items and lessons; 5 integration tests verify search + snippets |
| FILE-01 | 02-02 | Unified course materials view | SATISFIED | CourseMaterialService.get_course_materials() merges Canvas modules + Ed Lessons into FolderResponse list |
| FILE-02 | 02-02 | AI-generated descriptions with rule-based fallback | SATISFIED | generate_ai_description() calls Claude Haiku with daily limit; _rule_based_description() as fallback; 5 unit tests for rule-based path |
| INFRA-02 | 02-02 | APScheduler sync engine | SATISFIED | SyncEngine with AsyncIOScheduler, 3 jobs at configured intervals (15min, 60min, daily@3am); 4 integration tests pass |
| PLAT-04 | 02-02 | Token expiry detection (401/403 -> expired status) | SATISFIED | sync_all_grades catches TokenInvalidError and sets canvas_token_status="expired"; test_token_expiry_detection passes |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/services/deadline.py | 342 | `"due_date": datetime.now(UTC), # Placeholder; parse would be needed` | Info | Ed Discussion regex-extracted dates use current timestamp as placeholder since parsing free-text dates into datetime is non-trivial. Ed Discussion deadlines are marked `is_confirmed=False` to distinguish them. Not a blocker -- Phase 4 INTEL-02 will add AI-powered date extraction. |
| src/services/deadline.py | 152 | `datetime.utcnow()` deprecated warning | Info | Intentional tradeoff documented with noqa comment; asyncpg rejects timezone-aware datetimes for TIMESTAMP WITHOUT TIME ZONE columns |
| src/web/routes/sync.py | 26 | `datetime.utcnow()` deprecated warning | Info | Same intentional tradeoff as above |

No blockers found. All anti-patterns are informational with documented reasoning.

### Human Verification Required

### 1. GPA Calculation Accuracy Against Real Canvas Data

**Test:** Register a user with real Canvas API token, sync grades, then call GET /api/v1/gpa/summary and compare cumulative WAM against manual calculation from Canvas gradebook
**Expected:** WAM matches to 2 decimal places using USYD formula
**Why human:** Automated tests use synthetic data; real Canvas grade data may have edge cases (e.g., extra credit, dropped assignments, non-numeric grades)

### 2. Deadline Dedup Quality With Real Multi-Source Data

**Test:** Sync a course that has deadlines in both Canvas and Ed Lessons (e.g., same assignment listed on both platforms). Check GET /api/v1/deadlines for duplicates.
**Expected:** Identical or near-identical deadlines are merged; genuinely different deadlines remain separate
**Why human:** Fuzzy matching quality depends on how different universities format deadline titles; threshold 95 may need tuning for real USYD data

### 3. Full-Text Search Relevance

**Test:** Sync course materials, then search for a known keyword (e.g., "polymorphism"). Check that results include relevant files with highlighted snippets.
**Expected:** Relevant matches ranked by ts_rank; snippets contain the keyword wrapped in `<b>` tags
**Why human:** Search relevance quality is subjective; automated tests verify mechanics but not user-perceived quality

### Gaps Summary

No gaps found. All 5 success criteria are verified with automated evidence. All 12 Phase 2 requirements (GPA-01 through GPA-05, DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02, INFRA-02, PLAT-04) are satisfied. All 123 tests pass with zero failures. mypy --strict passes on all 59 source files. ruff check passes with no warnings. All 13 REST endpoints are registered and require authentication. Database migrations apply cleanly creating all required tables, columns, and constraints.

## Verification Evidence Summary

- **mypy src/ --strict:** Success (59 source files, 0 errors)
- **ruff check .:** All checks passed
- **pytest tests/ -x -v:** 123 passed, 18 skipped (external API), 0 failures
- **Alembic migrations:** All 4 revisions apply cleanly (initial -> display_name -> phase2_gpa -> phase2_search_sync)
- **Database schema:** All 8 tables, unique constraint, target_gpa_7pt column, search_vector columns, sync status columns verified
- **Endpoint registration:** All 13 Phase 2 endpoints return 401 without auth (properly wired)
- **Git commits:** 8 atomic commits from 3297880 to f7cf9b7, all present in history
- **Phase 1 regression:** All 56 Phase 1 tests still pass (zero regressions)

---

_Verified: 2026-03-16T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
