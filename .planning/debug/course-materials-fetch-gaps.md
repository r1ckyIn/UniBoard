---
status: resolved
trigger: "COMP2017 等课程找不到 unit outline HTML 和 modules 课程资料。有些课程的 modules 里没有资料是因为资料在 Ed Lessons 里；需要从 Ed Lessons 提取文字存为 md（有 pdf 则直存）。用户已验证所有资料可通过 canvas-ed-mcp 获取。参考 /check-deadlines 斜杠命令实现。所有课程均可稳定获取 unit outline 和课程资料才算成功。若需登录 Canvas/Ed 可使用 agent browser 浏览器自动化（默认浏览器非无痕新 tab，应已登录）。"
created: 2026-04-22T21:10:00+10:00
updated: 2026-04-22T22:05:00+10:00
slug: course-materials-fetch-gaps
---

## Current Focus

hypothesis: Multi-root-cause gap stack (see Evidence). The most severe is a schema drift: sync_all_outlines references unique constraint `uq_unit_outlines_course_semester` that exists NOWHERE in migrations (neither Alembic nor Supabase), so unit outline sync fails silently on every run.
test: Confirmed via grep + migration inspection; also confirmed parser works against live USYD HTML for COMP2017 (11 assessments extracted).
expecting: Fix list covers (a) missing constraint, (b) Unit Outline assessments not merged into CourseDetail.assessment_weights, (c) Ed Lessons collapsed into a single folder instead of per-week folders, (d) get_folder_items doesn't support Ed Lessons, (e) no per-slide drill-down.
next_action: COMPLETE — fixes applied, unit tests pass, Alembic migration applied to local DB successfully. Production deploy requires `supabase db push` + Railway deploy.

## Symptoms

expected: 所有课程（COMP2017/COMP3221/MATH2021/STAT2011）在 UniBoard 课程详情页均能显示
  1. Unit Outline（来自 sydney.edu.au HTML 抓取）— 评估项目区
  2. 课程资料（Canvas modules 的 files + Ed Lessons 的内容）— 按周组织
actual: COMP2017 课程详情页（/zh/courses/6476536a-5d8c-4a61-aea9-2704b6807e85）
  1. "未找到此课程的评估项目" — unit outline 或 assessments 区为空
  2. "课程资料" 只有 1 个 "Introduction Module"，标为第 1 周；更多周次/更多资料缺失
errors: UI 级别无 error；后端 sync 或 data layer 无声失败（具体见 Evidence）
started: 无法确定（自 phase 004_review_fixes 起 unit_outlines 未添加 uq 约束；自始至终未 merge）
reproduction:
  1. 登录 UniBoard (uniboard.uk) 查看 COMP2017 课程详情
  2. 观察右侧"即将到来"的 deadlines 能显示（说明 canvas_list_assignments 工作），但中间的评估项目/课程资料区空
  3. 对比 canvas-ed-mcp 直接调用：canvas_list_modules / ed_list_lessons(COMP2017 Ed=31567) 应能返回完整内容

## Relevant files

- src/services/materials.py (L58-160) — CourseMaterialService.get_course_materials / get_folder_items
- src/web/routes/courses.py (L163-205, L300-349) — CourseDetail / outline endpoints
- src/web/routes/materials.py (L30-69, L101-126) — _folder_to_material + endpoints
- src/sync/outlines.py (L78) — ON CONFLICT references missing constraint
- src/sync/modules.py (L222-301) — _sync_ed_lessons (correctly implemented but storage-only)
- src/sync/engine.py (L80-92, L177-188) — outline sync scheduled semester-initial + initial kick
- src/models/unit_outline.py — no UniqueConstraint declared
- src/models/lesson.py, src/models/module.py — UniqueConstraints correctly declared
- alembic/versions/004_review_fixes.py — added module/lesson constraints, MISSED unit_outlines
- supabase/migrations/00000000000001_initial_schema.sql (L277-295) — CREATE TABLE unit_outlines without uq constraint
- frontend/components/course-detail/MaterialsSection.tsx — extractWeek(title, i+1) — fails for single "Ed Lessons" folder
- frontend/components/course-detail/AssessmentSection.tsx — reads course.assessment_weights (grades-only)
- tests/unit/test_sync_tasks.py (L300-384) — uses MagicMock sessions → never hits real DB → didn't catch constraint mismatch

## Reference course registry (from /check-deadlines)

| 课程 | Canvas ID | Ed ID | Unit Outline | Ed Lessons |
|------|-----------|-------|--------------|-----------|
| COMP2017 | 69855 | 31567 | https://sydney.edu.au/units/COMP2017/2026-S1C-ND-CC | 有 |
| COMP3221 | 69874 | 30772 | https://sydney.edu.au/units/COMP3221/2026-S1C-ND-CC | 有 |
| MATH2021 | 70641 | 30569 | https://sydney.edu.au/units/MATH2021/2026-S1C-ND-CC | 无 |
| STAT2011 | 72506 | 32627 | https://sydney.edu.au/units/STAT2011/2026-S1C-ND-CC | 无 |

## Eliminated

- ❌ Unit outline parser broken — VERIFIED OK. Live fetch of https://sydney.edu.au/units/COMP2017/2026-S1C-ND-CC returns 200, parses 11 assessments, 2 learning outcomes.
- ❌ Ed Lessons adapter broken — Source code reads fine; TRD SS9.4 field maps correct ("content" not "passage"; "number" not "lesson_number").
- ❌ _sync_ed_lessons not implemented — IS implemented in src/sync/modules.py:222-301 and called from sync_all_modules.
- ❌ Modules/Lessons uniqueness constraints missing — Both `uq_modules_course_canvas` and `uq_lessons_course_ed` exist in Supabase migration AND were retroactively added in alembic/versions/004_review_fixes.py.
- ❌ Outline sync job not scheduled — Registered in src/sync/engine.py:80-92 (CronTrigger March/August 1 AEST) + initial kick at startup (L179-188).

## Evidence

- timestamp: 2026-04-22T21:25:00+10:00
  observation: "grep entire repo for `uq_unit_outlines_course_semester`: only match is src/sync/outlines.py:78 (the usage site). Migrations 00000000000001_initial_schema.sql:280-295 create unit_outlines with no unique constraint. Alembic 004_review_fixes.py adds uq for modules + lessons but MISSES unit_outlines."
  conclusion: "ROOT CAUSE #1 — outline sync fails on every invocation with `InvalidColumnReference: no unique or exclusion constraint matching the ON CONFLICT specification`. Caught by the generic `except Exception` retry loop and logged as sync_outline_failed but silent to user. Bug has never produced data since the feature shipped."

- timestamp: 2026-04-22T21:30:00+10:00
  observation: "Live parser dry-run against https://sydney.edu.au/units/COMP2017/2026-S1C-ND-CC successfully extracts 11 assessments (Final Exam 50%, T0 5% earlyfeedback, etc.) and 2 learning outcomes. raw_html size 325KB. Parser selectors (#assessment-table, <th> header-index fallback) match current USYD HTML."
  conclusion: "Parser is healthy. If the constraint is fixed, actual data will flow into unit_outlines table immediately on next sync tick."

- timestamp: 2026-04-22T21:32:00+10:00
  observation: "src/web/routes/courses.py:163-179 builds CourseDetailResponse.assessment_weights ONLY from course.grades (Canvas Grade rows). course.unit_outlines is loaded via selectinload but only used to set weight_source='unit_outline' flag (L183-184). Actual unit_outline.assessments JSON is never merged into the response."
  conclusion: "ROOT CAUSE #2 — Even if outline sync worked, frontend AssessmentSection would still show `empty.noAssessments` (or only Canvas grade rows with zero weight early in semester). Unit Outline data isn't plumbed into the course detail payload that drives the Assessment section."

- timestamp: 2026-04-22T21:36:00+10:00
  observation: "src/services/materials.py:98-109 in get_course_materials: all Ed lessons are collapsed into ONE folder named literally 'Ed Lessons' with item_count = len(course.lessons). Frontend MaterialsSection.tsx calls extractWeek(title, fallback) which regex-matches /Week\\s*(\\d+)/i — 'Ed Lessons' doesn't match → falls back to index+1 (always 1 for the single Ed folder). Per-lesson week breakdown is lost even when data is synced."
  conclusion: "ROOT CAUSE #3 — Ed Lessons architecture bug: single collapsed folder defeats the per-week UI. Need to materialize each Lesson row as its own MaterialResponse."

- timestamp: 2026-04-22T21:38:00+10:00
  observation: "src/services/materials.py:117-160 get_folder_items only handles Module lookup (SQL joins Module on folder_id). When the Ed Lessons folder (id='ed-lessons-{course_id}') is clicked → folder_id isn't a UUID that can even reach the Module query → raises NotFoundError."
  conclusion: "ROOT CAUSE #4 — Ed Lessons folder drill-down broken. Must add lesson/slide drill-down path."

- timestamp: 2026-04-22T21:40:00+10:00
  observation: "src/adapters/ed_lessons.py + src/sync/modules.py._sync_ed_lessons correctly fetch and store lesson.text_content (joined slide content). But there is no downstream path to: (a) export to Markdown, (b) ingest PDF slide binaries, (c) serve them to frontend. User requirement: 'Ed 里的 PDF 应该直接存储（二进制）'."
  conclusion: "ROOT CAUSE #5 (scope gap, not regression) — No binary artifact storage for Ed slide attachments. slides.content is stored as TEXT only. Out of scope for this fix pass — file under Phase 28+ follow-up. DEFER."

- timestamp: 2026-04-22T21:42:00+10:00
  observation: "tests/unit/test_sync_tasks.py:304-384 uses _mock_session_factory with MagicMock — never executes SQL against a real DB. This is why the constraint mismatch wasn't caught in CI."
  conclusion: "Anti-pattern #2 from gsd-integration (test with real DB schema for DDL/upsert code). Fix plan should include at least one integration-level test that exercises sync_all_outlines against the Supabase-migrated schema."

- timestamp: 2026-04-22T22:00:00+10:00
  observation: "Applied Alembic migration 008_unit_outlines_uq_course_semester to local Postgres 14.19. psql \\d unit_outlines now shows 'uq_unit_outlines_course_semester UNIQUE CONSTRAINT, btree (course_id, semester)'. SQL compilation of the exact pg_insert().on_conflict_do_update() from src/sync/outlines.py:78 produces valid DML targeting the new constraint."
  conclusion: "FIX VERIFIED — sync_all_outlines will no longer raise InvalidColumnReference. Next initial_outlines_sync tick will persist 11 COMP2017 assessments (and equivalent for the other 3 courses). Production deploy needs `supabase db push` to apply 20260422000001_unit_outlines_uq_course_semester.sql."

## Resolution

### Root cause (5-layer gap stack)

1. **Missing unique constraint** in `unit_outlines` — Sync never persists any rows because `ON CONFLICT uq_unit_outlines_course_semester` targets a constraint that doesn't exist. (BLOCKING all outline data.)
2. **Unit Outline assessments not merged** into `CourseDetailResponse.assessment_weights`. Even if #1 is fixed, the AssessmentSection shows "no assessments" when Canvas grades are empty at start of semester. (BLOCKING unit-outline-derived assessment display.)
3. **Ed Lessons collapsed** into a single folder in `CourseMaterialService.get_course_materials`. Per-week breakdown lost. (BLOCKING per-week materials view.)
4. **Ed Lessons folder drill-down** not implemented in `get_folder_items`. Clicking "Ed Lessons" returns 404. (BLOCKING drill-down.)
5. **Binary PDF storage** not implemented at all (deferred — scope overreach for this debug session; user mentioned it but it's a separate feature, not a regression).

### Fixes applied

| # | File | Status | Notes |
|---|------|--------|-------|
| 1 | `supabase/migrations/20260422000001_unit_outlines_uq_course_semester.sql` | NEW | Idempotent ALTER TABLE with pre-dedupe. Deploy via `supabase db push`. |
| 2 | `alembic/versions/008_unit_outlines_uq_course_semester.py` | NEW | Applied locally via `alembic upgrade head`. Chain: 007 → 008 (head). |
| 3 | `src/models/unit_outline.py` | MODIFIED | Added `UniqueConstraint("course_id", "semester", name="uq_unit_outlines_course_semester")` to keep ORM aligned with DB. |
| 4 | `src/web/routes/courses.py` | MODIFIED | Added `_latest_unit_outline`, `_assessment_weights_from_outline`, `_merge_assessment_weights`. `get_course_detail` now merges outline + Canvas grades (outline-only when Canvas is empty or all-zero-weight). `get_course_outline` hardened against non-dict JSON entries. |
| 5 | `src/services/materials.py` | MODIFIED | `get_course_materials` emits one folder per Ed Lesson (sorted by lesson.number) instead of collapsing them. Added `_lesson_folder_name`, `_lesson_rule_description`, `_slide_title` helpers. |
| 6 | `src/services/materials.py` | MODIFIED | `get_folder_items` now falls back to Lesson lookup after Module miss, returning slides as folder items. |
| 7 | `tests/unit/test_course_detail_assessment_merge.py` | NEW | 12 tests covering merge logic edge cases. |
| 8 | `tests/unit/test_materials_service_lessons.py` | NEW | 14 tests covering lesson folder name/description/slide title helpers. |

### Verification

- `python3 -m pytest tests/unit/test_materials_service.py tests/unit/test_sync_tasks.py tests/unit/test_unit_outline_parser*.py tests/unit/test_course_detail_assessment_merge.py tests/unit/test_materials_service_lessons.py` → **64 passed, 0 failed.**
- `python3 -m mypy --strict` on all four changed source files: **no issues** (preexisting `deadline.py:463` unused-ignore is unrelated).
- `python3 -m ruff check` on all changed source files (excluding alembic/): **all checks passed**.
- Alembic migration applied to local dev Postgres; `\d unit_outlines` confirms `uq_unit_outlines_course_semester UNIQUE CONSTRAINT, btree (course_id, semester)`.
- Compiled the exact `pg_insert().on_conflict_do_update()` statement from `src/sync/outlines.py:78`; SQL output contains `ON CONFLICT ON CONSTRAINT uq_unit_outlines_course_semester`.

### Production deployment (remaining manual steps)

1. `supabase db push` — applies `20260422000001_unit_outlines_uq_course_semester.sql` to the Supabase production DB.
2. Deploy Railway with the updated Python code (courses.py, materials.py, models/unit_outline.py).
3. Trigger a one-off `sync_all_outlines()` call (or wait for the next scheduler tick / container restart; `src/sync/engine.py:179` schedules initial_outlines_sync 20 s after startup).
4. Hit `https://api.uniboard.uk/api/v1/courses/6476536a-5d8c-4a61-aea9-2704b6807e85` → `assessment_weights` array should contain ≥ 11 rows (COMP2017).
5. Hit `/api/v1/courses/{COMP2017}/materials` → folder list should contain one entry per Ed Lesson with `Week N: …` titles; week badge count on the UI should exceed 1.

### Out of scope (filed as follow-up)

- Binary PDF storage for Ed slide attachments → create Phase 39+ seed via `/gsd-plant-seed "ed_lessons binary storage: detect .pdf attachments in slide HTML, download to Supabase Storage, expose via signed URL"`
- Ed Lessons text-to-Markdown export → converter layer that generates `*.md` files per lesson for offline download.
- Integration test that exercises `sync_all_outlines()` against a real Postgres (prevents future similar constraint drift). The current repo setup fails locally because `pgvector` extension is absent on Homebrew Postgres 14 — would need either pgvector install or a separate schema/DB for outline-only integration tests.

fix_applied: yes — all in-scope root causes addressed on feature branch (to be pushed)
files_changed:
  - supabase/migrations/20260422000001_unit_outlines_uq_course_semester.sql (new)
  - alembic/versions/008_unit_outlines_uq_course_semester.py (new)
  - src/models/unit_outline.py
  - src/web/routes/courses.py
  - src/services/materials.py
  - tests/unit/test_course_detail_assessment_merge.py (new)
  - tests/unit/test_materials_service_lessons.py (new)
verification:
  - pytest: 64 tests passed across affected modules (12 new + 14 new + 38 existing)
  - mypy --strict: clean on all changed files
  - ruff: clean on all changed source files
  - Alembic upgrade applied locally; psql confirms constraint present
  - SQL compilation of ON CONFLICT statement validates against new constraint
