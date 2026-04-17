---
phase: 34-ai-features-live
plan: 01
subsystem: database
tags: [supabase, postgres, sqlalchemy, pydantic, rls, fastapi, schema-migration]

# Dependency graph
requires:
  - phase: 13-supabase-foundation
    provides: base Profile/Course ORM models + RLS pattern library
  - phase: 33-token-lifecycle-onboarding
    provides: migration numbering convention (00000000000007 latest) + handle_updated_at trigger pattern
provides:
  - Migration 00000000000008_phase34_ai_features.sql (1 ALTER profiles, 3 ALTER courses, 1 CREATE TABLE + 4 RLS policies)
  - Profile.remaining_credit_points column + ORM mapping
  - Course.last_qa_access_at / embedded_at / content_hash columns + ORM mappings
  - StudyRecommendationCache ORM model (mirrors Digest pattern, PK + FK(profiles.id) + uq_study_rec_user_date)
  - UserUpdateRequest / UserResponse Pydantic schemas extended with remaining_credit_points (Gemini review fix)
  - _build_user_response + update_profile route handler wired for remaining_credit_points (Gemini review fix)
affects: [34-02, 34-03, 34-04, 34-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deferred human-action gate: schema-push tasks downgrade gracefully from worktree executors when SUPABASE_ACCESS_TOKEN unset"
    - "Pydantic + FastAPI three-point wiring: every new persisted field must touch UserUpdateRequest (accept) + UserResponse (return) + update_profile (apply)"

key-files:
  created:
    - supabase/migrations/00000000000008_phase34_ai_features.sql
    - src/models/study_recommendation_cache.py
    - .planning/phases/34-ai-features-live/deferred-items.md
  modified:
    - src/models/user.py
    - src/models/course.py
    - src/models/__init__.py
    - src/schemas/user.py
    - src/web/routes/users.py

key-decisions:
  - "Course.content_hash (not Module.content_hash) -- embedding pipeline operates per-course (QAService.embed_course_materials(course_id)); per-module granularity would require rewriting the embedding pipeline (out of scope). Documented in migration header."
  - "ix_courses_last_qa_access is a partial index WHERE last_qa_access_at IS NOT NULL -- matches the worker hot-set scan predicate exactly, avoids indexing NULL-heavy new rows."
  - "RLS on study_recommendation_cache uses direct user_id ownership pattern (mirror whatif_scenarios), NOT via-FK pattern (content_embeddings) -- cache row knows its owner directly."
  - "Service role gets separate INSERT/UPDATE/DELETE policies (all WITH CHECK true) -- APScheduler daily job writes using service role, bypassing user-JWT RLS by design."
  - "remaining_credit_points validated at Pydantic layer with Field(ge=0, le=500) -- DB column is INTEGER and permits negatives; API-layer validation prevents unreasonable inputs (threat T-34-01-06)."
  - "New StudyRecommendationCache registered in src/models/__init__.py -- required so Base.metadata.create_all picks it up when running tests without migrations."
  - "Task 3 (supabase db push) deferred to human operator -- worktree executor cannot authenticate to live Supabase; downstream Plans 34-02/03/04 must wait for operator to apply migration + verify."

patterns-established:
  - "Deviation-with-rationale in migration headers: 8-line comment block explaining why Course vs Module for content_hash."
  - "Partial index on nullable timestamp columns -- pattern for hot-set worker scans."
  - "Three-point Pydantic wiring checklist: Request schema + Response schema + route handler must all be touched for a new persisted field, or the field silently fails."

requirements-completed:
  - AIFEAT-01
  - AIFEAT-02
  - AIFEAT-03

# Metrics
duration: 15min
completed: 2026-04-17
---

# Phase 34 Plan 01: Data Foundation Summary

**Phase 34 schema foundation -- migration 00000000000008 authored (profiles.remaining_credit_points, 3 course columns, study_recommendation_cache + 4 RLS policies) and matching ORM models, Pydantic schemas, and PATCH /users/me route handler wired end-to-end for Wave 1 parallel plans. Live-DB apply deferred to human operator.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-17T03:05:07Z
- **Completed:** 2026-04-17T03:20:12Z
- **Tasks:** 3 (2 executed, 1 deferred)
- **Files created:** 3
- **Files modified:** 5

## Accomplishments

- Migration 00000000000008 written with 5 sections (1 profiles ALTER, 3 courses ALTER, 1 CREATE TABLE, 4 CREATE POLICY, 2 CREATE INDEX, 1 trigger): 110 lines, pure ASCII, RESEARCH-approved deviation-with-rationale in header comment block.
- Profile ORM gains `remaining_credit_points: Mapped[int | None]` + `study_recommendations` back-populated relationship.
- Course ORM gains all 3 Phase 34 columns (`last_qa_access_at`, `embedded_at`, `content_hash`) with inline comment strings explaining their role in the RAG embedding pipeline.
- New `StudyRecommendationCache` ORM (mirrors `Digest` 1:1; registered in `src/models/__init__.py`).
- Gemini review MEDIUM concern closed: `remaining_credit_points` wired through all 3 layers (`UserUpdateRequest` accept + ge=0/le=500 validation, `UserResponse` return, `update_profile` apply, `_build_user_response` expose).
- mypy `--strict` passes on all 5 modified Python files (Success: no issues found in 5 source files).
- `ruff check` passes on `src/models/`, `src/schemas/user.py`, `src/web/routes/users.py` (All checks passed).
- Task 3 gracefully deferred via `deferred-items.md` with exact verification checklist for operator.

## Task Commits

Each task was committed atomically on branch `worktree-agent-a82f2b68`:

1. **Task 1: Write migration 00000000000008_phase34_ai_features.sql** -- `188d09b` (feat)
2. **Task 2: ORM + Pydantic schemas + route handler wiring** -- `018bc99` (feat)
3. **Task 3: [BLOCKING] supabase db push** -- `bcb9028` (docs, deferred documentation only)

_Note: TDD RED/GREEN cycles verified in-process (Python import asserts for state transition); no separate test-file commits created because the "tests" are the plan's embedded acceptance_criteria blocks, verified via shell grep + `uv run python -c` one-liners._

## Files Created/Modified

### Created

- `supabase/migrations/00000000000008_phase34_ai_features.sql` (110 lines) -- Phase 34 DDL: ALTER TABLE profiles/courses + CREATE TABLE study_recommendation_cache + 4 RLS policies + 2 indexes (1 partial) + 1 trigger.
- `src/models/study_recommendation_cache.py` (53 lines) -- `StudyRecommendationCache` ORM with `UniqueConstraint("user_id", "generated_for_date", name="uq_study_rec_user_date")`.
- `.planning/phases/34-ai-features-live/deferred-items.md` -- Operator handoff doc with exact commands to apply migration + verify schema.

### Modified

- `src/models/user.py` -- Added `Integer` import, `StudyRecommendationCache` TYPE_CHECKING import, `remaining_credit_points` column after `gpa_scale`, `study_recommendations` relationship at end of Profile class.
- `src/models/course.py` -- Added `datetime` import, `DateTime` SQLAlchemy import, 3 new columns (`last_qa_access_at`, `embedded_at`, `content_hash`) after `name_zh`.
- `src/models/__init__.py` -- Added `StudyRecommendationCache` to imports + `__all__` (alphabetically positioned).
- `src/schemas/user.py` -- Added `remaining_credit_points: int | None = None` to `UserResponse`, `remaining_credit_points: int | None = Field(default=None, ge=0, le=500)` to `UserUpdateRequest`.
- `src/web/routes/users.py` -- Added `remaining_credit_points=profile.remaining_credit_points` in `_build_user_response`, added PATCH branch `if body.remaining_credit_points is not None: profile.remaining_credit_points = body.remaining_credit_points` in `update_profile`.

## Decisions Made

(Key items; see frontmatter `key-decisions` for full list.)

1. **Course.content_hash over Module.content_hash** -- confirmed with user during planning (RESEARCH SS10 A1, HIGH severity flag). Embedding pipeline `QAService.embed_course_materials(course_id)` operates per-course; per-module granularity would require pipeline rewrite.
2. **Partial index on last_qa_access_at** -- worker scan is `WHERE last_qa_access_at >= now() - 7d`, partial index `WHERE last_qa_access_at IS NOT NULL` matches exactly, avoids indexing NULL-heavy new rows.
3. **RLS pattern: direct user_id (whatif_scenarios style), not via-FK (content_embeddings style)** -- cache rows own their user_id directly, no join needed.
4. **Service role gets 3 separate policies (INSERT/UPDATE/DELETE)** with `WITH CHECK (true)` -- APScheduler writes via service role, RLS bypassed by design; audit trail logs at application layer (Plan 34-02).
5. **Pydantic validation: `ge=0, le=500`** -- DB INTEGER allows negatives; API layer blocks them. USYD max Bachelor ~192cp; 500 accommodates double-degrees (threat T-34-01-06 mitigated).
6. **StudyRecommendationCache in `__init__.py`** -- required for `Base.metadata.create_all` in tests without migrations.

## Deviations from Plan

None -- plan executed as written within the worktree scope.

Task 3 (`supabase db push`) was not a "deviation" but an explicit fallback path documented in the plan itself: "If `SUPABASE_ACCESS_TOKEN` env var is unset... document this in the task output". The worktree executor prompt additionally forbids `supabase db push` inside a worktree. Task 3 therefore entered its own documented deferral path rather than being renegotiated.

## Issues Encountered

- **SUPABASE_ACCESS_TOKEN unset in worktree shell** -- expected per project-specific note in executor prompt. Handled via deferred-items.md with precise operator verification checklist (matches Task 3's own acceptance criteria queries).
- **Hook noise: PreToolUse:Edit READ-BEFORE-EDIT reminders fired after successful edits** -- each edit succeeded; the hook appears to be advisory rather than blocking. Work continued without regression.

## Known Stubs

None -- all columns/fields are persisted (INTEGER/TIMESTAMPTZ/VARCHAR/JSONB/TEXT) with real ORM wiring. No hardcoded placeholders reach UI layer from this plan.

## User Setup Required

**Operator must apply migration to Supabase before Wave 2 (Plans 34-02, 34-03, 34-04) executes.** See `.planning/phases/34-ai-features-live/deferred-items.md` for exact commands, including `supabase db push`, 3 schema verification queries, and RLS policy count check (expect >= 4).

## Next Phase Readiness

### Wave 2 unblocked IFF operator has run `supabase db push`

- **Plan 34-02 (study rec service)** -- can import `StudyRecommendationCache`, write daily UPSERTs keyed on `(user_id, generated_for_date)`, rely on `uq_study_rec_user_date` for idempotency.
- **Plan 34-03 (path planner)** -- can read `Profile.remaining_credit_points`, nullable-aware (UI prompts on first visit if NULL).
- **Plan 34-04 (embedding worker)** -- can scan `courses.last_qa_access_at`, compare `content_hash`, update `embedded_at`. Partial index `ix_courses_last_qa_access` lives.

### Plan 34-05 Task 3 unblocked

- **GpaTargetSection.tsx** -- `useUpdateProfile({ remaining_credit_points: value })` now persists correctly: backend schema accepts, route handler applies, response includes field. Previous plan version would have silently dropped the value under Pydantic strict mode.

### Blockers for downstream

- Human operator must execute Task 3 verification checklist before Wave 2 executors start. If Wave 2 executors are dispatched before migration applies, they will hit mypy-green-but-DB-missing failures on `StudyRecommendationCache` writes / `remaining_credit_points` reads.

## Self-Check: PASSED

- `supabase/migrations/00000000000008_phase34_ai_features.sql` -- FOUND
- `src/models/study_recommendation_cache.py` -- FOUND
- `src/models/user.py` (modified) -- FOUND, contains `remaining_credit_points`, `study_recommendations`
- `src/models/course.py` (modified) -- FOUND, contains `last_qa_access_at`, `embedded_at`, `content_hash`
- `src/schemas/user.py` (modified) -- FOUND, contains `remaining_credit_points` (2 occurrences)
- `src/web/routes/users.py` (modified) -- FOUND, contains `remaining_credit_points` (3 occurrences)
- `.planning/phases/34-ai-features-live/deferred-items.md` -- FOUND
- Commit `188d09b` -- FOUND in log
- Commit `018bc99` -- FOUND in log
- Commit `bcb9028` -- FOUND in log
- mypy --strict exit 0 on all 5 modified files -- VERIFIED
- ruff check exit 0 on all modified files -- VERIFIED

---

*Phase: 34-ai-features-live*
*Plan: 34-01*
*Completed: 2026-04-17*
