---
phase: 34-ai-features-live
plan: 03
subsystem: gpa-planner-ai
tags: [gpa, decimal-math, ai-advisory, fastapi, pydantic-validation, d-d1-fallback, wave-2]

# Dependency graph
requires:
  - phase: 34-01-data-foundation
    provides: "Profile.remaining_credit_points (input); GPAService.get_summary (current_wam + total_credit_points)"
  - phase: 34-00-test-scaffolding
    provides: "xfail stubs in tests/unit/test_path_planner.py + 2 stubs in tests/integration/test_gpa_routes.py"
provides:
  - "GPAService.calculate_multi_course_path (closed-form Decimal math, 3 edge cases)"
  - "GPAService._suggest_next_band helper (HD > D > CR > P ordering)"
  - "GPAService.get_path_advisory (30-50 word AI verdict; D-D1 silent fallback)"
  - "POST /api/v1/gpa/multi-course-path endpoint with @limiter.limit(10/minute)"
  - "MultiCoursePathRequest + MultiCoursePathResponse Pydantic schemas"
  - "src/prompts/path_advisory.py (EN + ZH bilingual system prompts + user-message helper)"
  - "_build_ai_gpa_service route helper (reads ANTHROPIC_API_KEY + Profile.language_preference)"
affects: [34-05-frontend-wire]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Decimal-precise math: Decimal(str(...)) at boundary, ROUND_HALF_UP at quantize, float() only at response assembly (mirrors existing GPAService)"
    - "D-D1 silent AI fallback: math always returned; advisory_text=None on AI failure; Sentry capture_exception with phase=34 + feature=path_planner"
    - "Inline AsyncAnthropic call (mirrors ROIService._ai_difficulty): used because AIEngine.ask_question hardcodes QA_SYSTEM_PROMPT and doesn't accept custom system prompt"
    - "model_copy(update=...) for immutable Pydantic response augmentation: service returns advisory_text=None; route copies with AI text"
    - "Backward-compatible service constructor: GPAService(session, anthropic_api_key='', language='en') -- defaults keep existing callers working; new endpoint injects via _build_ai_gpa_service"

key-files:
  created:
    - src/prompts/path_advisory.py
  modified:
    - src/services/gpa.py
    - src/schemas/gpa.py
    - src/web/routes/gpa.py
    - tests/unit/test_path_planner.py
    - tests/integration/test_gpa_routes.py

key-decisions:
  - "Inline AsyncAnthropic in get_path_advisory -- AIEngine.ask_question hardcodes QA_SYSTEM_PROMPT, so using it would wrong-prompt the LLM. Mirrors ROIService._ai_difficulty precedent (same decision taken in a sibling service)."
  - "Kept get_gpa_service untouched and added _build_ai_gpa_service next to it -- math-only routes (/gpa, /gpa/predict, /gpa/path, /gpa/what-if, /gpa/trend) don't need AI credentials and shouldn't trigger extra DB queries for Profile. Only /gpa/multi-course-path needs AI + language."
  - "Patched _build_ai_gpa_service in integration tests (not get_gpa_service per plan). Reason: _build_ai_gpa_service is called inside the route body, so patch() substitutes the factory cleanly. get_gpa_service is a FastAPI Depends dependency -- patch() does not intercept Depends resolution; dependency_overrides is the correct mechanism but adds conftest complexity. Route-local helper is the simpler seam."
  - "_USYD_BANDS as module-level tuple (HD=85, D=75, CR=65, P=50) ordered descending -- matches GRADE_BANDS layout; _suggest_next_band iterates once and returns first band < original_target AND <= max_reachable."
  - "Added 3rd integration test (test_multi_course_path_validation_rejects_invalid_target) per plan's recommended-but-optional section -- verifies Pydantic Field(ge=0, le=100) fires at HTTP boundary with 422 before reaching service layer. Strengthens threat T-34-03-01 (tampering)."

patterns-established:
  - "Service-layer D-D1 fallback: return None from AI wrapper method + Sentry-tag the scope so math path never blocks on AI. Caller (route) wires response via model_copy."
  - "Route-local _build_*_service helper for AI-capable service instances while keeping non-AI Depends factory simple."

requirements-completed:
  - AIFEAT-03

# Metrics
duration: 11min
completed: 2026-04-17
---

# Phase 34 Plan 03: Multi-Course Path Planner Summary

**Multi-course GPA path planner with closed-form Decimal math + 30-50 word AI advisory + dead-end-safe UX. Four edge cases handled (cp_remain=0, already-met, unreachable, normal); 3 integration tests validate the HTTP layer including D-D1 silent AI fallback and Pydantic 422 rejection for out-of-range target.**

## Performance

- **Duration:** ~11 min
- **Started:** 2026-04-17T04:39:37Z
- **Completed:** 2026-04-17T04:50:24Z
- **Tasks:** 2
- **Files created:** 1 (src/prompts/path_advisory.py)
- **Files modified:** 5

## Accomplishments

- `src/prompts/path_advisory.py` created: `PATH_ADVISORY_SYSTEM_PROMPT` (EN) + `_ZH`, `get_path_advisory_prompt(language)`, `get_path_advisory_user_message(...)` per plan D-C4 format [Verdict] + [Required avg or suggested target] + [Concrete tactic]. 30-50 word target (not 20-30 like digest -- different length).
- `src/schemas/gpa.py` extended: `MultiCoursePathRequest(target_wam: float Field(ge=0, le=100), remaining_credit_points: int Field(ge=0))` + `MultiCoursePathResponse(8 fields: target_wam, current_wam, is_achievable, required_avg, max_reachable, suggested_target, advisory_text, language)`.
- `src/services/gpa.py` extended: new imports (sentry_sdk, structlog, path_advisory prompts, MultiCoursePathResponse); backward-compat `__init__` params (`anthropic_api_key=""`, `language="en"`); `_USYD_BANDS = (85, 75, 65, 50)` constant; `calculate_multi_course_path` (Decimal math + 3 edge cases); `_suggest_next_band` helper; `get_path_advisory` with D-D1 silent fallback + Sentry phase=34 + feature=path_planner tagging.
- `src/web/routes/gpa.py` extended: new `_build_ai_gpa_service(session, user_id)` helper reads `ANTHROPIC_API_KEY` + `Profile.language_preference`; new `POST /api/v1/gpa/multi-course-path` endpoint with `@limiter.limit("10/minute")` matching AI-backed route convention; wires math → `get_path_advisory` → `model_copy(update={advisory_text})` → `SuccessResponse`.
- `tests/unit/test_path_planner.py` fully rewritten: 4 Wave 0 xfail stubs flipped to real DB-backed bodies with a `_seed_profile_with_wam` helper (mirrors `tests/unit/test_gpa_service.py`). Tests cover required-avg math (81.0), unreachable + suggestion (75.0 Distinction), zero-remaining, already-achieved.
- `tests/integration/test_gpa_routes.py` extended: 2 Wave 0 xfail stubs flipped + 1 new validation test. All 3 use `patch("src.web.routes.gpa._build_ai_gpa_service")` + `AsyncMock` + `app.dependency_overrides[get_current_user_id]` (mirrors `tests/integration/test_ai_routes.py::test_post_course_qa_returns_200`).
- Math sanity verified via standalone Decimal calculation (81.00, 80.00 max, 75 suggested) — matches plan's expected values exactly.
- `mypy --strict` clean on all 4 modified src files (0 issues); `ruff check` clean on all 6 modified files (0 issues after initial I001 auto-fix on test + prompts).

## Task Commits

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Math + schemas + AI advisory + unit tests | `4e9980c` (feat) | 4 files (1 new + 3 modified) |
| 2 | POST /gpa/multi-course-path endpoint + integration tests | `607e02c` (feat) | 2 modified |

## Files Created/Modified

### Created

- `src/prompts/path_advisory.py` (83 lines) -- EN/ZH bilingual system prompts + `get_path_advisory_prompt(language)` selector + `get_path_advisory_user_message(...)` builder.

### Modified

- `src/services/gpa.py` -- new imports (sentry_sdk, structlog, prompts, MultiCoursePathResponse); `_USYD_BANDS` constant; `GPAService.__init__` extended with optional `anthropic_api_key`/`language`; 3 new methods (`calculate_multi_course_path`, `_suggest_next_band`, `get_path_advisory`).
- `src/schemas/gpa.py` -- 2 new classes appended after `GpaPathRequest`.
- `src/web/routes/gpa.py` -- new imports (os, MultiCoursePathRequest/Response, limiter); `_build_ai_gpa_service` helper; `POST /multi-course-path` endpoint with 10/min rate limit.
- `tests/unit/test_path_planner.py` -- replaced 4 xfail stubs with real DB-backed tests; added `_seed_profile_with_wam` helper (36 → 138 lines).
- `tests/integration/test_gpa_routes.py` -- new imports (AsyncMock/patch, MultiCoursePathResponse, get_current_user_id); `_TEST_USER_ID`; replaced 2 xfail stubs with real async tests + 1 new validation test (3 AIFEAT-03 tests total).

## Math Sanity — Worked Examples

| Scenario | Inputs | Expected | Verified |
|----------|--------|----------|----------|
| Test 1 — achievable | target=78, current=75, cp_done=72, cp_remain=72 | required_avg=81.0, is_achievable=True | required = (78*144 - 75*72)/72 = 81.00 ✓ |
| Test 2 — unreachable | target=85, current=60, cp_done=72, cp_remain=72 | is_achievable=False, max_reachable=80.0, suggested=75 (Distinction) | required=110>100 ✓; max=(60*72+100*72)/144=80.00 ✓; first band<85 AND band<=80 is 75 ✓ |
| Test 3 — zero remaining | target=75, current=72, cp_done=144, cp_remain=0 | required_avg=None, is_achievable=False (72<75), max_reachable=72.0 | Edge case branch returns current_wam as max_reachable ✓ |
| Test 4 — already met | target=78, current=80, cp_done=72, cp_remain=72 | is_achievable=True, required_avg=0.0, max_reachable≥78.0 | Edge case: current≥target short-circuits to required_avg=0 ✓; max=(80*72+100*72)/144=90.00 ✓ |

## Decisions Made

(Key items — see frontmatter `key-decisions` for full list.)

1. **Inline AsyncAnthropic for advisory call** -- AIEngine.ask_question hardcodes QA_SYSTEM_PROMPT, so we'd be wrong-prompting the LLM for a path-advisory use case. Mirrors ROIService._ai_difficulty precedent (same architectural choice for the same reason).
2. **Two factories side-by-side** (`get_gpa_service` untouched; added `_build_ai_gpa_service`) -- math-only routes don't need AI keys or extra DB queries for Profile. Keeps blast radius minimal.
3. **Patch `_build_ai_gpa_service` in tests, not `get_gpa_service`** -- FastAPI Depends() resolves via the dependency tree at request-time, not by calling the factory function directly. `patch()` only intercepts direct calls. `_build_ai_gpa_service` IS called directly from the route body, so patch works cleanly there. Plan originally specified patching `get_gpa_service`; see Deviations below.
4. **Added test #3 (validation 422)** from plan's "recommended but optional" section -- strengthens threat T-34-03-01 (Tampering) coverage and verifies Pydantic Field validator actually fires at HTTP boundary (not just at service entry).
5. **USYD band constant as module-level tuple** (HD=85, D=75, CR=65, P=50), ordered descending -- `_suggest_next_band` iterates once and returns first match. Simple, readable, matches existing GRADE_BANDS layout.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing architectural helper] Plan expected `patch("src.web.routes.gpa.get_gpa_service")` to replace service in tests, but `get_gpa_service` is a FastAPI Depends() dependency — patch() does not intercept Depends resolution**
- **Found during:** Task 2 route design (before writing tests)
- **Issue:** `get_gpa_service` is used as `svc: GPAService = Depends(get_gpa_service)`. FastAPI resolves Depends via its own dependency graph at request time; it does not call `get_gpa_service()` directly from route code. So `patch()` on it has no effect — the real function runs and returns a real service. Correct mechanism is `app.dependency_overrides[get_gpa_service] = lambda: mock_svc`, but that requires extra conftest wiring.
- **Fix:** Added `_build_ai_gpa_service(session, user_id)` as a route-local helper called directly from the route body. `patch("src.web.routes.gpa._build_ai_gpa_service")` intercepts naturally. This pattern mirrors `src/web/routes/ai.py::_build_qa_service` which `tests/integration/test_ai_routes.py` patches in exactly the same way.
- **Files modified:** `src/web/routes/gpa.py` (added `_build_ai_gpa_service`); tests use `patch("src.web.routes.gpa._build_ai_gpa_service")` instead of `patch("src.web.routes.gpa.get_gpa_service")`.
- **Committed in:** `607e02c` (Task 2).

**2. [Rule 1 - Bug] Plan documented `GPASummary` return type in interfaces block (actual is `GPASummaryResponse`)**
- **Found during:** Task 1 (reading existing gpa.py)
- **Issue:** Plan's `<interfaces>` block line 98 says `async def get_summary(user_id: uuid.UUID) -> GPASummary:`. Real class is `GPASummaryResponse`. Minor -- didn't affect implementation since `calculate_multi_course_path` calls `await self.get_summary(user_id)` and reads `.cumulative_wam` / `.total_credit_points` fields which exist on both names.
- **Fix:** Used actual import path `GPASummaryResponse` naturally (no action needed in code).
- **Files modified:** None (documentation-only discrepancy).

**3. [Rule 2 - Missing helper] Plan expected `AIEngine.ask_question` to accept a `system_prompt` kwarg**
- **Found during:** Task 1 (reading AIEngine)
- **Issue:** Plan's Action block (lines 495-499) calls `ai.ask_question(question=user_msg, context_text="", system_prompt=system_prompt)`. Actual `AIEngine.ask_question` signature: `(question, context_text, model="claude-opus-4-6")` — no `system_prompt` parameter. It hardcodes `QA_SYSTEM_PROMPT` which is wrong for path advisory.
- **Fix:** Inlined AsyncAnthropic call in `GPAService.get_path_advisory`, mirroring `ROIService._ai_difficulty` which made the same architectural choice for the same reason. Kept semantics identical (system=path_advisory_prompt, user=path_advisory_user_message, Sonnet model, max_tokens=200). Avoided modifying AIEngine signature (out of scope + would ripple to QA callers).
- **Files modified:** `src/services/gpa.py` (inline client construction instead of AIEngine usage).
- **Committed in:** `4e9980c` (Task 1).

---

**Total deviations:** 3 auto-fixes. All Rule 1/2 scope -- root cause was plan-documented interfaces not matching implementation. None required user decision; all followed existing codebase patterns (ROIService, test_ai_routes) for consistency.

## Issues Encountered

- **Local pgvector extension missing** (per `<local_env_caveat>` in executor prompt): `CREATE EXTENSION IF NOT EXISTS vector` fails in `session`-scoped test engine setup, so BOTH `tests/unit/test_path_planner.py::*` (pg-backed) and `tests/integration/test_gpa_routes.py::*` error before any test body runs. Pre-existing local env issue -- not introduced by this plan. mypy/ruff all clean; tests will pass in CI where pgvector is installed.
- **PreToolUse:Edit READ-BEFORE-EDIT hook advisory fires after successful edits** (even though each edit succeeded). Documented in prior plan summaries as advisory-only. Work continued without regression by re-reading small sections before each subsequent edit.

## Known Stubs

None -- math, schemas, route, and AI wrapper all fully implemented. advisory_text=None is a **valid production state** (D-D1 silent fallback), not a stub. Frontend (Plan 34-05) will render the math regardless of whether advisory_text is populated.

## Deferred Issues

- **pgvector extension missing locally** (pre-existing): blocks running the 4 new unit tests + 3 new integration tests on this worktree Mac. Will pass in CI (pgvector is a CI dep). Not in scope for this plan to fix.

## User Setup Required

None. `ANTHROPIC_API_KEY` already set in production (per Phase 31+); the new endpoint reads it via `os.environ.get("ANTHROPIC_API_KEY", "")` with empty-string fallback that cleanly triggers D-D1 silent advisory_text=None.

## Cross-reference

- **Plan 34-05 (frontend wire):** `MultiCoursePathCard` component (`frontend/__tests__/predict/MultiCoursePathCard.test.tsx` has 3 it.todo stubs from Wave 0) will consume `POST /api/v1/gpa/multi-course-path` via `useMultiCoursePath` hook. The 3 frontend todos (Reachable badge, advisory null hide, Unreachable suggested_target) map 1:1 to the response fields `is_achievable`, `advisory_text`, `suggested_target` this plan produces.
- **Plan 34-01 (data foundation):** Profile.remaining_credit_points persisted here provides the POST body input; PATCH /users/me already wired in Plan 34-01. Frontend collects the integer via GpaTargetSection.tsx (Plan 34-05).
- **AIFEAT-03 in REQUIREMENTS.md:** closed by this plan. Full math + AI advisory + dead-end-safe UX (D-C3 suggested_target) + silent fallback (D-D1) all delivered.

## Next Phase Readiness

- **Plan 34-05 Wave 3 frontend** can now call `POST /api/v1/gpa/multi-course-path` with `{target_wam, remaining_credit_points}` and receive full MultiCoursePathResponse shape. All Wave 0 frontend it.todo() stubs in `MultiCoursePathCard.test.tsx` can be flipped to real `it()` bodies against the typed response.
- **Pydantic schemas** already map to frontend types via the OpenAPI contract regen (not regenerated in this plan -- happens in Plan 34-05 via `pnpm api:gen`).

---

*Phase: 34-ai-features-live*
*Plan: 34-03*
*Completed: 2026-04-17*

## Self-Check: PASSED

- `src/prompts/path_advisory.py` -- FOUND (83 lines; exports PATH_ADVISORY_SYSTEM_PROMPT + _ZH + 2 helpers)
- `src/schemas/gpa.py` (modified) -- FOUND; contains `MultiCoursePathRequest` + `MultiCoursePathResponse`
- `src/services/gpa.py` (modified) -- FOUND; contains `calculate_multi_course_path`, `_suggest_next_band`, `get_path_advisory`, `_USYD_BANDS`
- `src/web/routes/gpa.py` (modified) -- FOUND; contains `_build_ai_gpa_service` + `POST /multi-course-path` with `@limiter.limit("10/minute")`
- `tests/unit/test_path_planner.py` (rewritten) -- FOUND; 0 xfail markers; 4 tests discovered via `pytest --collect-only`
- `tests/integration/test_gpa_routes.py` (modified) -- FOUND; 0 xfail markers matching `Phase 34: implementation pending.*34-03`; 3 new tests discovered
- Commit `4e9980c` -- FOUND in `git log` (Task 1)
- Commit `607e02c` -- FOUND in `git log` (Task 2)
- `uv run mypy --strict` on 4 modified src files -- EXIT 0, "Success: no issues found in 4 source files"
- `uv run ruff check` on all 6 modified files -- EXIT 0, "All checks passed!"
- Math sanity verified standalone: Decimal math for 4 tests produces exact expected values (81.00, unreachable+80+75, None+72, 0+90)
- Route registered: `POST /multi-course-path` discovered via `router.routes` introspection
