---
slug: ed-lessons-sync-degraded
status: resolved
trigger: "Ed Lessons sync degraded: _sync_ed_lessons silent failure after PR #113; MCP ed_list_lessons(31567) returns 26 lessons but DB lessons table stays empty; check Railway logs for ed_lessons_error / ed_lessons_network_error"
created: "2026-04-23"
updated: "2026-04-23"
tdd_mode: false
goal: find_and_fix
---

# Debug Session: ed-lessons-sync-degraded

## Symptoms

<!-- DATA_START: symptoms -->
- **Expected behavior:** `_sync_ed_lessons` should sync Ed Lessons to the DB `lessons` table. For course with ed_course_id=31567, 26 lessons should be persisted.
- **Actual behavior:** Silent failure. DB `lessons` table stays empty after sync runs. No rows inserted.
- **Error messages:** Unknown — possibly suppressed. User directs investigation toward Railway logs for error markers `ed_lessons_error` / `ed_lessons_network_error`.
- **Timeline:** Started after PR #113 (commit 717271f, merged 2026-04-23). Prior sync behavior unknown but implicitly worked before this change.
- **Reproduction:**
  - Evidence that API source works: MCP `ed_list_lessons(31567)` returns 26 lessons successfully.
  - So the issue is downstream of Ed API call — either in _sync_ed_lessons invocation, error swallowing, or course linking.
<!-- DATA_END: symptoms -->

## Relevant Context (pre-investigation)

- PR #113 (717271f) rewrote `_upsert_courses` to:
  - Use (user_id, code) grouped by canvas_course_id instead of (user_id, code, semester).
  - Merge duplicate rows with blank semester into populated ones, deleting duplicates.
  - Skip Ed-only courses (canvas_course_id=None) — COMP2123 / INFO1113 were being orphaned.
- Recent sync PRs chain: #109 (outline due_date) → #110 (USYD parser) → #111 (Canvas no semester) → #112 (Ed /user nesting) → #113 (dedupe + skip Ed-only).
- PR #113 specifically: `link_courses` previously appended unmatched Ed courses; now filtered out. If `_sync_ed_lessons` depended on the un-filtered list or on a specific DB row UUID that was merged/deleted, that would break silently.

## Current Focus

- hypothesis: Two-part chain bug. (1) PR #113 deletes Row B via `await session.delete(dup)`; its 26 lessons cascade-delete. (2) Subsequent `sync_all_modules` tries to re-populate lessons against Row A, but `_sync_ed_lessons` at src/sync/modules.py:274 passes `lesson_data.get("due_at")` raw into a DateTime column. Ed API returns due_at as an ISO8601 string (per EdLessonResponse.due_at: str | None), and asyncpg rejects string→datetime implicit coercion. The single failing lesson mid-loop causes the whole transaction to roll back → 0 lessons persisted.
- test: CONFIRMED by running /tmp/repro_full_pipeline2.py. Phase 1 shows cascade deletes 3 seeded lessons (lessons count = 0). Phase 2 calls _sync_ed_lessons with 3 mocked lessons where one has due_at="2026-05-08T23:59:00+10:00". asyncpg raises `DataError: invalid input for query argument $8: '2026-05-08T23:59:00+10:00' (expected a datetime.date or datetime.datetime instance, got 'str')`. Session rollback → 0 lessons in DB after phase 2.
- expecting: confirmed.
- next_action: (done) Applied fix — added `_normalise_ed_due_at` helper + SAVEPOINT-scoped per-lesson guard in `_sync_ed_lessons`.

## Evidence

- 2026-04-23 finding: `sync_all_courses` is NOT registered in APScheduler (engine.py). Only `sync_all_modules`, `sync_all_grades`, `sync_all_deadlines`, `sync_all_outlines`, `sync_ed_discussions` are scheduled. `sync_all_courses` runs ONLY via manual `/sync/trigger` scope=all, which blocks on `sync_all_courses` then fires modules sync in background.
- 2026-04-23 finding: `Course` model has `lessons` relationship with `cascade="all, delete-orphan"` (src/models/course.py:87-90). Alembic migration 729bc00dc08d line 138 creates `lessons.course_id` FK as `sa.ForeignKeyConstraint(['course_id'], ['courses.id'], )` — NO `ondelete=CASCADE`. ORM-level cascade works but requires loading child collection during flush.
- 2026-04-23 finding: `_sync_ed_lessons` at line 234 filters `if not course.ed_course_id: continue`. So only courses with ed_course_id populated are processed.
- 2026-04-23 finding: Data progression across PRs:
  - Pre-#111: Row A created (canvas=69855, ed=NULL, semester='')
  - Post-#111: link_courses now matches Canvas-no-semester. _upsert_courses (old key) didn't find by semester → created Row B (canvas=69855, ed=31567, semester='2026-S1'). Lessons written attached to Row B (initially when due_at was None or on a version of Ed API before due_at was populated).
  - Post-#113: _upsert_courses on same linked data → finds canvas_matches=[A,B] → keeps blank (Row A) as existing → merges Row B's ed/semester into Row A → `session.delete(Row B)` → cascade deletes Row B's lessons → Row A now has (canvas=69855, ed=31567, semester='2026-S1') but 0 lessons.
- 2026-04-23 cascade-repro: /tmp/repro_cascade2.py confirms _upsert_courses successfully merges+deletes Row B, cascade-deletes its lessons. 1 course (Row A) survives with ed_course_id='31567'. 0 lessons remain.
- 2026-04-23 happy-path-repro: /tmp/repro_full_pipeline.py confirms that IF _sync_ed_lessons runs cleanly against Row A (mocked lessons with due_at=None), 26 lessons are repopulated successfully. This rules out the cascade itself as the bug.
- 2026-04-23 root-cause-repro: /tmp/repro_full_pipeline2.py confirms that IF any Ed-returned lesson has due_at as a string (which EdLessonResponse.due_at: str | None explicitly allows), asyncpg raises DataError mid-upsert. `_sync_ed_lessons` has no per-lesson try/except around `await session.execute(lesson_stmt)` (src/sync/modules.py:277-290). Error propagates out of _sync_ed_lessons → outer retry loop fails 3 times → session rolls back → lessons table stays empty.
- 2026-04-23 due_at-type-repro: /tmp/test_due_at.py isolates the type issue: inserting a Lesson with due_at=None works; inserting with due_at="2026-05-01T10:00:00Z" raises `asyncpg.exceptions.DataError: invalid input for query argument $8: ... expected a datetime.date or datetime.datetime instance, got 'str'`. ISO8601 with / without Z both fail.
- 2026-04-23 tz-aware-datetime-repro: /tmp/test_tz_datetime.py confirms asyncpg ALSO rejects timezone-aware `datetime` objects into `TIMESTAMP WITHOUT TIME ZONE` columns. Fix must coerce to naive UTC.
- 2026-04-23 why-it-worked-before: Pre-#113, the pre-existing lessons table rows survived each sync cycle because the failing upsert raised DataError mid-iteration, rolling back the re-upsert transaction but NOT deleting anything that had been committed on a prior sync cycle. PR #113's cascade-delete was the catalyst — it committed the deletion of the 26 pre-existing lessons BEFORE `_sync_ed_lessons` attempted re-insert. Once re-insert failed, the rollback no longer had the pre-#113 data to fall back on.
- 2026-04-23 fix-verification: /tmp/verify_fix.py confirms all 5 due_at shapes (None, naive ISO, UTC Z, AEST +10, unparseable) are handled correctly end-to-end. AEST 23:59 is correctly converted to naive UTC 13:59. Unparseable values log a warning and persist as NULL without aborting the batch.

## Eliminated Hypotheses

- Ed API / adapter bug: Eliminated by user's confirmation that MCP `ed_list_lessons(31567)` returns 26 lessons (adapter+token work).
- `_sync_ed_lessons` logic regression: Eliminated — file has not been modified since Phase 34 (f505d37). Bug is latent type coercion; triggered only when cascade-delete wiped the safety net.
- `link_courses` filtering bug: Eliminated — `link_courses` still emits Ed-only LinkedCourses at lines 275-286; the Ed-only filter happens in `_upsert_courses` only. COMP2017 has canvas_course_id="69855" so it is NOT Ed-only.
- PR #113 cascade itself as ROOT cause: Narrowed to "trigger" not "cause" — cascade works correctly and the subsequent sync would repopulate lessons IF _sync_ed_lessons could handle the Ed API shape.

## Resolution

- root_cause: `_sync_ed_lessons` (src/sync/modules.py:274) passes `lesson_data.get("due_at")` straight into a DateTime column. EdLessonResponse.due_at is typed as `str | None` (src/adapters/ed_lessons.py:54), so the value is an ISO8601 string when Ed provides a due date. asyncpg refuses implicit string→datetime coercion into `TIMESTAMP WITHOUT TIME ZONE` and raises `DataError`. It also rejects timezone-aware datetimes into the same column. Because the upsert loop had no per-lesson exception handling, the first lesson with a due_at string killed the entire `_sync_ed_lessons` run, `sync_all_modules` rolled back, and after 3 retries the whole modules sync reported failed. The bug was LATENT until PR #113's cascade-delete removed the previously-synced lessons; before then, failed re-upserts left existing rows intact because rollback doesn't touch already-committed rows.
- fix:
  - Added `_normalise_ed_due_at(raw)` helper in `src/sync/modules.py` that coerces strings / datetimes / None into naive UTC datetimes (unparseable inputs log a warning and return None rather than raising).
  - Rewrote `_sync_ed_lessons`'s per-lesson upsert to call `_normalise_ed_due_at(lesson_data.get("due_at"))` before building the insert values.
  - Wrapped `await session.execute(lesson_stmt)` in a `session.begin_nested()` SAVEPOINT so any single malformed lesson (unexpected coercion failure, constraint surprise, etc.) rolls back just that row and continues the batch instead of poisoning the whole modules-sync transaction. Prevents a future latent bug from combining with cascade-delete to wipe the lessons table again.
  - Added `tests/unit/test_sync_ed_lessons_due_at.py` with 14 cases covering None, empty/whitespace strings, naive ISO, Z-suffixed UTC, +10/+11/-05/+00 offsets, naive datetime passthrough, aware datetime coercion, unparseable strings, and non-string/non-datetime garbage inputs.
- verification:
  - Unit tests: 14/14 pass (`uv run pytest tests/unit/test_sync_ed_lessons_due_at.py -v` → all green).
  - Regression: existing merge tests still green (`tests/unit/test_upsert_courses_merge.py` 7/7).
  - Lint + typecheck clean: `uv run ruff check src/sync/modules.py tests/unit/test_sync_ed_lessons_due_at.py` → All checks passed. `uv run mypy src/sync/modules.py` → Success.
  - End-to-end repro (`/tmp/verify_fix.py`) against a live Postgres schema: cascade-delete wipes stale lessons (phase 1 count=0), then `_sync_ed_lessons` with five mixed due_at shapes (None, naive ISO, Z, +10:00, bogus) persists all 5 lessons with correctly coerced due_at values. AEST 23:59 → naive UTC 13:59. Bogus string → NULL with warning log.
  - No breakage: 423 unit tests pass after the patch (30 pre-existing environment-only errors on pgvector, unrelated to this fix).
- files_changed:
  - `src/sync/modules.py` — added `_normalise_ed_due_at`, swapped raw due_at passthrough for normalised value, added SAVEPOINT-guarded per-lesson upsert.
  - `tests/unit/test_sync_ed_lessons_due_at.py` — new unit test covering the helper's full input space.
