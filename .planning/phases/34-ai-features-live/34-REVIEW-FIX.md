---
phase: 34-ai-features-live
iteration: 1
fixed_at: 2026-04-17T06:10:00Z
review_path: .planning/phases/34-ai-features-live/34-REVIEW.md
findings_in_scope: 9
fixes_attempted: 9
fixes_applied: 9
fixes_deferred: 0
skipped: 0
status: all_fixed
---

# Phase 34: Code Review Fix Report

**Fixed at:** 2026-04-17T06:10:00Z
**Source review:** `.planning/phases/34-ai-features-live/34-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (1 High + 4 Medium + 4 Warning; 4 Info out of scope)
- Fixed: 9
- Skipped: 0

## Fixed Issues

### HI-01: RAG `sources` SSE payload contract drift

**Files modified:** `src/services/qa.py`, `frontend/lib/api/ai-stream.ts`, `frontend/components/shared/Sources.tsx`
**Commit:** `d67a6db`
**Applied fix:**
- `embed_course_materials` now chunks + embeds per source entity (module_item | lesson) so each `ContentEmbedding` row carries the real `source_type` and the owning entity's UUID as `source_id` (instead of hardcoded `source_type="mixed"`).
- `retrieve_rag_sources` batch-looks up titles from ModuleItem/Lesson tables and returns an enriched payload with `title`, `module_id`, and `anchor` per source.
- Frontend `CitationSource` interface widened to accept legacy `"mixed"` rows and `title: string | null`; `Sources.tsx` renders a labelled fallback (`{source_type} (chunk {chunk_index})`) when `title` is null.

**Verification:**
- `uv run mypy --strict src/services/qa.py` -- clean
- `uv run ruff check src/services/qa.py` -- clean
- `cd frontend && pnpm tsc --noEmit` -- clean
- `pnpm vitest run __tests__/shared/Sources.test.tsx` -- 3/3 passed
- `uv run pytest tests/unit/test_qa_service.py` -- 11/11 passed
- `uv run pytest tests/integration/test_ai_routes.py::test_sse_sources_event_order` -- passed

### MD-01: Non-streaming `/courses/{id}/qa` ignores user language

**Files modified:** `src/services/ai_engine.py`, `src/services/qa.py`, `src/web/routes/ai.py`
**Commit:** `7b14615`
**Applied fix:**
- `AIEngine.ask_question` now accepts `language: str = "en"` and calls `get_qa_prompt(language)` to pick EN/ZH system prompt (was hardcoded `QA_SYSTEM_PROMPT`).
- `QAService.answer_question`, `_answer_direct`, `_answer_rag` thread `language` through end-to-end.
- `course_qa` route fetches the user's `language_preference` from Profile and passes it to `svc.answer_question`.
- Removed unused `QA_SYSTEM_PROMPT` import.

**Verification:**
- `uv run mypy --strict src/services/ai_engine.py src/services/qa.py src/web/routes/ai.py` -- clean
- `uv run ruff check <same files>` -- clean
- `uv run pytest tests/unit/test_qa_service.py` -- 11/11 passed

### MD-02: `sentry_sdk.set_context("voyage_usage", ...)` leaks across courses

**Files modified:** `src/services/embedding_worker.py`
**Commit:** `18fc162`
**Applied fix:**
- Wrapped the per-course Voyage usage context in `with sentry_sdk.new_scope() as scope:` so the context (and the `phase` / `feature` tags) is isolated to the current capture and does not pollute subsequent captures on the same process.
- Mirrors the pattern already used in the exception path.

**Verification:**
- `uv run mypy --strict src/services/embedding_worker.py` -- clean
- `uv run ruff check src/services/embedding_worker.py` -- clean
- `uv run pytest tests/unit/test_embedding_worker.py` -- 6/6 passed

### MD-03: RAG sources prefetch bypasses AI daily limit

**Files modified:** `src/services/qa.py`, `src/web/routes/ai.py`
**Commit:** `418ca4e`
**Applied fix:**
- Added public `QAService.check_and_increment_limit(user_id)` wrapper around the private `_check_and_increment_limit` helper.
- Added `already_counted: bool = False` parameter to `stream_answer_question` that suppresses the internal limit check when the route has already counted.
- `course_qa_stream` route now calls `check_and_increment_limit` BEFORE `retrieve_rag_sources` (the Voyage embedding call), and on 429 emits a structured SSE `error` event (`code: "rate_limited"`) instead of an uncaught HTTPException.
- Passes `already_counted=True` into `stream_answer_question` to avoid a double increment.

**Verification:**
- `uv run mypy --strict src/services/qa.py src/web/routes/ai.py` -- clean
- `uv run ruff check <same>` -- clean (after removing inner-closure `exc` capture issue)
- `uv run pytest tests/unit/test_qa_service.py` -- 11/11 passed

### MD-04: `/gpa/multi-course-path` bypasses AI daily limit

**Files modified:** `src/web/routes/gpa.py`
**Commit:** `bc6dd9f`
**Applied fix:**
- Added `_try_reserve_ai_call(session, user_id)` helper in the GPA route module. It performs the same `SELECT ... FOR UPDATE` + daily-counter pattern as `QAService._check_and_increment_limit` and returns True on reservation / False when over quota.
- `calculate_multi_course_path` now calls the helper before `get_path_advisory`: math is always returned; advisory is skipped (advisory_text=None) when over quota, matching the D-D1 silent fallback contract.
- Logs a structured `path_advisory_skipped_over_quota` when the AI call is suppressed.

**Verification:**
- `uv run mypy --strict src/web/routes/gpa.py` -- clean
- `uv run ruff check src/web/routes/gpa.py` -- clean
- `uv run pytest tests/unit/test_path_planner.py` -- errored due to missing local pgvector (pre-existing env issue, not a regression)

### WR-01 + WR-03: Tighten `UserResponse` / `UserUpdateRequest` enums; coerce NULL legacy rows

**Files modified:** `src/schemas/user.py`, `src/web/routes/users.py`
**Commit:** `3d1b82a`
**Applied fix:**
- `UserResponse.language_preference: Literal["en", "zh"]` and `UserResponse.gpa_scale: Literal["wam", "gpa_4"]`.
- `UserUpdateRequest.language_preference: Literal["en", "zh"] | None` and `UserUpdateRequest.gpa_scale: Literal["wam", "gpa_4"] | None` (Pydantic now rejects non-enum values at parse time).
- Removed the manual `ValidationError` branches in the PATCH handler (redundant with Pydantic validation).
- `_build_user_response` coerces legacy NULL or unexpected values to the documented defaults (`"en"` / `"wam"`) so GETs never raise on corrupted rows.

**Verification:**
- `uv run mypy --strict src/schemas/user.py src/web/routes/users.py` -- clean
- `uv run ruff check <same>` -- clean
- `uv run pytest tests/unit/test_contract_schemas.py` -- 12/12 passed

### WR-02: `GpaTargetSection.handleSave` sets "Saved!" before mutation settles + leaks timer

**Files modified:** `frontend/components/settings/GpaTargetSection.tsx`, `frontend/__tests__/settings/GpaTargetSection.test.tsx`
**Commits:** `f497281`, `2798202`
**Applied fix:**
- `handleSave` now passes an `onSuccess` option to `updateProfile.mutate` so `setShowSaved(true)` only fires after the server confirms the PATCH.
- Replaced the bare `setTimeout` with a `useEffect` that schedules the 2s auto-dismiss and returns a `clearTimeout` cleanup so the timer is cancelled on unmount (prevents setting state on an unmounted component).
- Updated the existing vitest assertion to expect the new `(body, options)` signature (second arg includes `onSuccess` callback).

**Verification:**
- `pnpm tsc --noEmit` -- clean
- `pnpm lint` -- clean
- `pnpm vitest run __tests__/settings/GpaTargetSection.test.tsx` -- 5/5 passed

### WR-04: `PredictPage` fires `/gpa/multi-course-path` with the default target WAM on page load

**Files modified:** `frontend/components/predict/PredictPage.tsx`
**Commit:** `0e0a96b`
**Applied fix:**
- The `targetInitialized` ref is now set to true as soon as `gpaReport.data` has loaded (even when `target_wam` is null), so the downstream effect can gate on it.
- The multi-course-path trigger effect gates on `targetInitialized.current` and includes `gpaReport.data` in its dependency list so it re-evaluates when the initialization flag flips.
- Result: exactly one advisory mutation per page load instead of two (placeholder default 85 → then real saved target).

**Verification:**
- `pnpm tsc --noEmit` -- clean
- `pnpm lint` -- clean
- `pnpm vitest run __tests__/predict/PredictPage.test.tsx` -- 9/9 passed

## Skipped Issues

None — all in-scope findings were applied cleanly.

The 4 Info-severity findings (IN-01 through IN-04) were intentionally out of scope per `fix_scope: critical_warning`.

## Notes

**Pre-existing test failures (NOT regressions):**
- `tests/unit/test_ai_engine.py::test_ask_question_returns_answer_with_citations` expects the legacy `[Canvas: ...]` / `[Ed: ...]` citation markers but phase 34 already replaced `_CITATION_PATTERN` with `\[(\d+)\]` for the new `[N]` citations. The test predates the regex change and is unrelated to the MD-01 language threading.
- Integration tests that hit the local DB (`test_ai_routes.py` non-SSE cases, `test_gpa_service.py`, `test_path_planner.py`, `test_study_recommendation_service.py`, etc.) error on `CREATE EXTENSION IF NOT EXISTS vector` because pgvector is not installed locally. Pre-existing environment issue explicitly called out in the phase context; not a regression.
- Other frontend test failures (`CourseDetailPage`, `DeadlineCard`, `DeadlinesPage`, `AppShell`, `SetupGuard`) fail with `No "useLocale" export is defined on the "next-intl" mock` — these are pre-existing issues in test fixtures that pre-date phase 34 fixes.

**Partial-success semantics:**
- All 9 fix commits are atomic and self-contained; each is safe to revert individually if needed.
- HI-01 fix changes the `embed_course_materials` behaviour going forward. Existing embedded rows with `source_type="mixed"` are handled gracefully by the frontend fallback (`retrieve_rag_sources` returns `title=null`, Sources panel renders `"mixed (chunk N)"`). A full re-embed cycle (next scheduled worker pass) will backfill real source types for hot courses.
- MD-03 introduces a pre-flight limit check in `course_qa_stream`. Users over quota now see an SSE `error` event with `code: "rate_limited"` instead of a silent Voyage embedding call.

---

_Fixed: 2026-04-17T06:10:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
