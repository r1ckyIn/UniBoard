# Phase 24: Build Health Green - Research

**Researched:** 2026-04-01
**Domain:** Build tooling / static analysis / test infrastructure
**Confidence:** HIGH

## Summary

Phase 24 targets zero errors across 5 build/quality tools. The current state was measured by running each tool and capturing actual output. The total error count is **105 issues** across all tools: ruff (54), mypy (20), pytest (26 collection errors + 3 integration import errors), tsc (8), and ESLint (23 warnings).

The good news: most issues are mechanical and auto-fixable. Ruff has 37 auto-fixable errors (69%). Mypy errors cluster in 5 files with clear patterns (unused type-ignores, missing annotations). TypeScript errors are concentrated in 2 test files with a single root cause (missing `course_id` property). ESLint warnings split cleanly between unused vars (10, trivial) and react-hooks/exhaustive-deps (13, need useMemo wrapping). Pytest errors are all DB-connection failures -- "unit" tests that actually require PostgreSQL.

**Primary recommendation:** Split into 3 plans: (1) Python lint+type fixes (ruff + mypy), (2) Python test fixes (pytest), (3) Frontend fixes (tsc + ESLint). Plan 1 is the quick win, Plan 3 is straightforward, Plan 2 requires architectural decisions about DB-dependent "unit" tests.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CRIT-02 | All build tools pass with zero errors (mypy --strict, ruff, tsc --noEmit, ESLint --max-warnings 0, pytest) | Full error inventory below with categorized fixes per tool |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Type checker: `mypy --strict`
- Linter: `ruff`
- Tests: `pytest + pytest-asyncio`
- Package management: `uv` (backend), `pnpm 9+` (frontend)
- Code comments in English only
- Backend: Python 3.12+, FastAPI, SQLAlchemy 2.0 async
- Frontend: Next.js, TanStack Query v5, Tailwind CSS

## Current Error Inventory

### Tool 1: ruff check (54 errors, 37 auto-fixable)

**Command:** `uv run python -m ruff check src/ tests/`
**Version:** ruff 0.15.6

| Rule Code | Count | Description | Auto-fixable | Fix Strategy |
|-----------|-------|-------------|--------------|--------------|
| E501 | 14 | Line too long (>100 chars) | No | Manual line wrapping |
| F401 | 13 | Unused imports | Yes (safe) | `ruff check --fix` |
| F841 | 10 | Local variable assigned but never used | Yes (safe) | `ruff check --fix` |
| I001 | 8 | Import block unsorted | Yes (safe) | `ruff check --fix` |
| UP017 | 4 | Use `datetime.UTC` alias | Yes (safe) | `ruff check --fix` |
| UP042 | 2 | Use `enum.StrEnum` instead of `(str, Enum)` | No (unsafe) | Manual: change base class |
| SIM117 | 2 | Combine `with` statements | Yes (safe) | `ruff check --fix` |
| B017 | 1 | `assertRaises(Exception)` too broad | No | Narrow exception type |

**Files affected:** 22 files (11 in tests/, 11 in src/)

**Top files by error count:**
- tests/unit/test_resilience.py: 7
- tests/unit/test_skill_service.py: 7
- tests/unit/test_sync_ed_discussions.py: 6
- tests/fixtures/seed_phase15.py: 5
- src/services/skill.py: 4

**Quick win:** `uv run python -m ruff check src/ tests/ --fix` resolves 37 of 54 errors instantly. Remaining 17 need manual fixes (14 line-length, 2 StrEnum migration, 1 broad exception).

### Tool 2: mypy --strict (20 errors in 5 files)

**Command:** `uv run python -m mypy --strict src/`
**Version:** mypy 1.19.1

| Error Code | Count | Description |
|------------|-------|-------------|
| unused-ignore | 10 | Unnecessary `# type: ignore` comments |
| arg-type | 2 | Incompatible argument type (str \| None vs str) |
| assignment | 2 | Incompatible types in assignment |
| var-annotated | 2 | Missing type annotation for variable |
| call-overload | 1 | No matching overload for `int()` |
| call-arg | 1 | Unexpected keyword argument |
| attr-defined | 1 | Attribute not found on type |
| type-arg | 1 | Missing type parameters for generic |

**Files affected:**
- src/services/skill.py: 9 errors (7 unused-ignore, 2 var-annotated)
- src/services/tool_executor.py: 5 errors (call-overload, call-arg, arg-type x2, assignment)
- src/services/ai_engine.py: 3 errors (all unused-ignore)
- src/services/qa.py: 2 errors (assignment, attr-defined)
- src/web/routes/gpa.py: 1 error (type-arg)

**Error patterns:**
1. **Stale type-ignores (10):** Previous fixes made `# type: ignore` comments unnecessary. Fix: remove them.
2. **Optional vs required args (3):** Functions called with `str | None` where `str` is expected. Fix: add None guard or widen parameter type.
3. **Type narrowing (4):** Variables assigned incorrect types. Fix: proper type annotations and casts.
4. **Missing generic params (1):** Bare `list` instead of `list[SomeType]`. Fix: add type parameter.

### Tool 3: pytest (290 passed, 26 errors, 3 integration collection errors)

**Command:** `uv run python -m pytest tests/ --tb=short -q`
**Total collected:** 423 tests

**Unit test errors (26) -- all DB connection failures:**
- tests/unit/test_gpa_service.py: 11 errors
- tests/unit/test_notification_service.py: 5 errors
- tests/unit/test_risk_alert_service.py: 4 errors
- tests/unit/test_intelligence_service.py: 4 errors
- tests/unit/test_digest_service.py: 2 errors

**Root cause:** These "unit" tests use real `AsyncSession` from SQLAlchemy and attempt to connect to PostgreSQL on localhost:5432. They are mis-categorized -- they are actually integration tests that need a running database. When no local PostgreSQL is available, they fail with `OSError: [Errno 61] Connect call failed`.

**Integration test collection errors (3) -- import failures:**
- tests/integration/test_ai_routes.py: imports `get_current_user` from `src.web.deps` (actual export is `get_current_user_id`)
- tests/integration/test_auth.py: imports `create_access_token` from `src.security.auth` (function does not exist -- Supabase Auth replaced custom JWT creation)
- tests/integration/test_search.py: imports `hash_password` from `src.security.password` (module does not exist)

**Passing tests:** 290 tests pass when DB-dependent tests are excluded.

### Tool 4: tsc --noEmit (8 errors in 2 files)

**Command:** `cd frontend && npx tsc --noEmit`

| Error Code | Count | Description |
|------------|-------|-------------|
| TS2322 | 7 | Type not assignable -- missing `course_id` property |
| TS2304 | 1 | Cannot find name `beforeEach` |

**Files affected:**
- `__tests__/deadlines/DeadlineCard.test.tsx`: 7 errors (all TS2322, same root cause)
- `__tests__/courses/CourseCard.test.tsx`: 1 error (TS2304)

**Root cause analysis:**
1. **DeadlineCard.test.tsx (7 errors):** The `DeadlineWithCourse` type was updated to require `course_id` field, but all 7 test fixtures still use the old shape without `course_id`. Fix: add `course_id: "some-uuid"` to each fixture.
2. **CourseCard.test.tsx (1 error):** Missing `beforeEach` in scope. Likely missing `@types/jest` or `vitest` global type import. Fix: add type reference or import.

### Tool 5: ESLint --max-warnings 0 (23 warnings in 9 files)

**Command:** `cd frontend && npx next lint --max-warnings 0`

| Rule | Count | Description |
|------|-------|-------------|
| react-hooks/exhaustive-deps | 13 | Logical expressions creating unstable hook dependencies |
| @typescript-eslint/no-unused-vars | 10 | Defined but never used variables |

**Files affected (by warning count):**
- components/timetable/TimetablePage.tsx: 6 (4 exhaustive-deps, 1 unused-var, 1 unused-import)
- components/predict/PredictPage.tsx: 6 (5 exhaustive-deps, 1 unused-var)
- components/deadlines/DeadlinesPage.tsx: 2 (2 exhaustive-deps)
- components/digest/HighlightItem.tsx: 2 (2 unused-vars)
- components/course-detail/AiCourseChat.tsx: 1 (1 unused-var)
- components/course-detail/QuickLinksPanel.tsx: 1 (1 unused-var)
- components/course-detail/UnitReviewSection.tsx: 1 (1 unused-var)
- components/setup/GuideCard.tsx: 1 (1 unused-var)
- components/timetable/TimetableGrid.tsx: 1 (1 unused-var)
- src/test/setup.ts: 1 (1 unused-var)

**Fix patterns:**
1. **unused-vars (10):** Remove unused destructured variables, imports, or prefix with `_`. Trivial one-liner fixes.
2. **exhaustive-deps (13):** Variables like `const courses = data?.courses || []` create new array references on every render. Fix: wrap in `useMemo()` or move inside the dependent hook callback.

## Effort Estimation

| Tool | Errors | Effort | Auto-fixable | Manual Work |
|------|--------|--------|--------------|-------------|
| ruff | 54 | LOW | 37 (one command) | 17 (line wrapping, StrEnum, broad exception) |
| mypy | 20 | LOW-MEDIUM | 0 | 20 (remove type-ignores, add guards, fix types) |
| tsc | 8 | LOW | 0 | 8 (add course_id to fixtures, add beforeEach type) |
| ESLint | 23 | MEDIUM | 0 | 23 (useMemo wrapping needs care, unused vars trivial) |
| pytest | 29 | MEDIUM-HIGH | 0 | 29 (architectural decision + refactoring or test rewrite) |

**Total estimated effort:** ~2-3 hours of focused work.

## Dependencies Between Errors

1. **ruff F401 (unused imports) might overlap with ESLint unused-vars** -- but they are in different codebases (Python vs TypeScript), so no actual dependency.
2. **mypy unused-ignore errors** -- removing `# type: ignore` comments will NOT cause new ruff errors (ruff does not check type-ignore comments).
3. **pytest integration import errors** -- these are independent of all other tools. The imported functions were removed/renamed during Supabase Auth migration.
4. **pytest DB-connection errors** -- these require a decision: (a) mock the DB in tests, (b) mark tests as integration and skip without DB, or (c) use testcontainers/fixture with real DB. Option (b) is fastest.
5. **tsc DeadlineCard errors** -- all 7 are the same root cause (missing `course_id`), so fixing one fixture template fixes all.

## Recommended Plan Split

### Plan 24-01: Python Lint & Type Fixes (ruff + mypy)

**Scope:** 54 ruff errors + 20 mypy errors = 74 issues
**Files:** ~27 files across src/ and tests/
**Effort:** LOW (30-45 min)

Tasks:
1. Run `uv run python -m ruff check src/ tests/ --fix` (resolves 37 errors)
2. Fix remaining 17 ruff errors manually (line length, StrEnum, broad exception)
3. Remove 10 unused `# type: ignore` comments in skill.py and ai_engine.py
4. Fix 5 type errors in tool_executor.py (add None guards, fix argument types)
5. Fix 2 type errors in qa.py (correct variable types for SQLAlchemy result)
6. Fix 1 type error in gpa.py (add generic parameter to bare `list`)
7. Add 2 type annotations in skill.py (trace_a, trace_b)
8. Verify: `uv run python -m ruff check src/ tests/` and `uv run python -m mypy --strict src/`

### Plan 24-02: Python Test Fixes (pytest)

**Scope:** 26 unit test DB errors + 3 integration import errors = 29 issues
**Files:** 8 files (5 unit, 3 integration)
**Effort:** MEDIUM (45-60 min)

Tasks:
1. Fix 3 integration test import errors:
   - test_ai_routes.py: change `get_current_user` to `get_current_user_id`
   - test_auth.py: remove/update `create_access_token` import (Supabase Auth)
   - test_search.py: remove `hash_password` import (module deleted)
2. Fix 26 unit tests that require PostgreSQL:
   - Option A (recommended): Add `@pytest.mark.db` marker + conftest skip logic so they are skipped when no DB is available, and mark them as integration tests
   - Option B: Refactor to use mock AsyncSession (more work but better isolation)
3. Verify: `uv run python -m pytest tests/ -q`

### Plan 24-03: Frontend Fixes (tsc + ESLint)

**Scope:** 8 tsc errors + 23 ESLint warnings = 31 issues
**Files:** ~11 files in frontend/
**Effort:** LOW-MEDIUM (30-45 min)

Tasks:
1. Fix 7 DeadlineCard.test.tsx errors: add `course_id` to all test fixtures
2. Fix 1 CourseCard.test.tsx error: add `beforeEach` type reference
3. Fix 10 ESLint unused-vars: remove or prefix with `_`
4. Fix 13 ESLint exhaustive-deps: wrap logical expressions in `useMemo()`
5. Verify: `cd frontend && npx tsc --noEmit && npx next lint --max-warnings 0`

## Common Pitfalls

### Pitfall 1: ruff --fix Breaking Imports
**What goes wrong:** `ruff --fix` removes "unused" imports that are actually re-exported (e.g., `from x import y as y` pattern).
**Why it happens:** Ruff may not detect re-exports unless the `as` alias pattern or `__all__` is used.
**How to avoid:** Run `ruff check --fix --diff` first to preview changes. Check that `__all__` exports are preserved.
**Warning signs:** Import errors after running --fix.

### Pitfall 2: useMemo Dependency Cycles
**What goes wrong:** Wrapping a variable in useMemo to fix exhaustive-deps but introducing a new dependency cycle.
**Why it happens:** Moving `const x = data || []` into useMemo requires `data` as a dependency, which might be unstable itself.
**How to avoid:** Use `useMemo(() => data?.items || [], [data])` -- the `data` from TanStack Query is stable between renders when unchanged.
**Warning signs:** Infinite re-render loops in the browser.

### Pitfall 3: Silencing Tests Instead of Fixing Them
**What goes wrong:** Marking DB-dependent unit tests as "skip" without a plan to run them anywhere.
**Why it happens:** It is the fastest path to green, but leaves test coverage gaps.
**How to avoid:** If skipping, add a conftest that auto-skips when DB is unavailable but runs in CI where DB is available. Document the skip condition.
**Warning signs:** Tests that are permanently skipped and never run.

### Pitfall 4: Stale Integration Tests After Auth Migration
**What goes wrong:** Integration tests reference old auth functions (create_access_token, hash_password) that no longer exist after Supabase Auth migration.
**Why it happens:** Auth was migrated to Supabase but integration tests were not updated.
**How to avoid:** Either update tests to use Supabase JWT mocking, or delete tests that test functionality now handled by Supabase Auth (a managed service).
**Warning signs:** ImportError on test collection.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio |
| Config file | pyproject.toml `[tool.pytest.ini_options]` |
| Quick run command | `uv run python -m pytest tests/unit/ -q --tb=short -x` |
| Full suite command | `uv run python -m pytest tests/ -q --tb=short` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CRIT-02 | ruff zero errors | lint | `uv run python -m ruff check src/ tests/` | N/A (tool run) |
| CRIT-02 | mypy zero errors | type-check | `uv run python -m mypy --strict src/` | N/A (tool run) |
| CRIT-02 | pytest zero failures | unit+integration | `uv run python -m pytest tests/ -q` | tests/ exists |
| CRIT-02 | tsc zero errors | type-check | `cd frontend && npx tsc --noEmit` | N/A (tool run) |
| CRIT-02 | ESLint zero warnings | lint | `cd frontend && npx next lint --max-warnings 0` | N/A (tool run) |

### Sampling Rate
- **Per task commit:** Run the specific tool being fixed (e.g., `ruff check` after ruff fixes)
- **Per wave merge:** All 5 tools in sequence
- **Phase gate:** All 5 tools report zero errors/warnings

### Wave 0 Gaps
None -- all tools and test infrastructure already exist. This phase is about fixing errors, not setting up infrastructure.

## Code Examples

### Fixing StrEnum (ruff UP042)
```python
# Before (ruff UP042 violation)
class SkillStatus(str, enum.Enum):
    DRAFT = "draft"

# After
class SkillStatus(enum.StrEnum):
    DRAFT = "draft"
```

### Fixing exhaustive-deps (ESLint react-hooks/exhaustive-deps)
```typescript
// Before (warning: 'courses' logical expression could make dependencies change)
const courses = data?.courses || [];
const filtered = useMemo(() => courses.filter(...), [courses]);

// After
const courses = useMemo(() => data?.courses || [], [data]);
const filtered = useMemo(() => courses.filter(...), [courses]);
```

### Fixing Optional arg-type (mypy arg-type)
```python
# Before (mypy error: str | None not assignable to str)
course_id = params.get("course_id")
await adapter.get_modules(course_id)

# After
course_id = params.get("course_id")
if course_id is None:
    raise ValueError("course_id is required")
await adapter.get_modules(course_id)
```

### Fixing test fixture type (tsc TS2322)
```typescript
// Before (missing course_id)
const deadline = {
  id: "1", title: "Essay", due_date: "2026-04-01",
  course_code: "INFO1110", course_name: "Intro to Programming",
  source: "canvas", weight: 30, status: "upcoming" as const,
  days_remaining: 5, is_confirmed: true,
};

// After (add course_id)
const deadline = {
  id: "1", title: "Essay", due_date: "2026-04-01",
  course_id: "course-uuid-1",
  course_code: "INFO1110", course_name: "Intro to Programming",
  source: "canvas", weight: 30, status: "upcoming" as const,
  days_remaining: 5, is_confirmed: true,
};
```

## Open Questions

1. **DB-dependent "unit" tests: skip or refactor?**
   - What we know: 5 test files (26 tests) in tests/unit/ connect to real PostgreSQL. They pass when a local DB is running but fail in environments without one.
   - What is unclear: Will CI have a PostgreSQL service? Should these be moved to tests/integration/?
   - Recommendation: Mark with `@pytest.mark.db` and add conftest auto-skip. Move to integration/ directory for clarity. This unblocks the phase while preserving the tests for CI.

2. **Stale integration tests: update or delete?**
   - What we know: 3 integration tests import functions that no longer exist after Supabase Auth migration (create_access_token, hash_password, get_current_user).
   - What is unclear: Are the underlying test scenarios still valuable under Supabase Auth?
   - Recommendation: Update test_ai_routes.py (just a rename). Delete or rewrite test_auth.py and test_search.py since they test custom auth that was replaced by Supabase.

## Sources

### Primary (HIGH confidence)
- Direct tool output: ruff 0.15.6, mypy 1.19.1, pytest, tsc, next lint -- all run locally
- pyproject.toml -- ruff/mypy/pytest configuration
- Source code inspection -- src/web/deps.py, src/security/auth.py exports

### Secondary (MEDIUM confidence)
- N/A -- all findings are from direct tool execution

### Tertiary (LOW confidence)
- N/A

## Metadata

**Confidence breakdown:**
- Error counts: HIGH -- captured from actual tool execution
- Fix strategies: HIGH -- standard patterns for each error type
- Effort estimates: MEDIUM -- depends on edge cases during actual fixes
- Pytest architecture decision: MEDIUM -- depends on CI setup

**Research date:** 2026-04-01
**Valid until:** 2026-04-15 (error counts will change if other work lands on the branch)
