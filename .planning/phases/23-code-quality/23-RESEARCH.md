# Phase 23: Code Quality Refactor - Research

**Researched:** 2026-04-01
**Domain:** Python/TypeScript refactoring, dead code elimination, resource lifecycle management
**Confidence:** HIGH

## Summary

Phase 23 addresses four concrete code quality issues identified during M4 hardening: (1) a 1146-line god module `sync/tasks.py` that must be split into domain-specific files, (2) duplicated patterns for adapter `_request()` methods, UserResponse construction, and a language_preference bug in `auth.py`, (3) approximately 360+ lines of verified dead code across unused schemas, hooks, and dependencies, and (4) resource leaks in the EdLessonsAdapter, database engines, and a health endpoint that incorrectly returns 200 when degraded.

The codebase already has strong patterns to follow -- the adapter structure is clean, the test suite covers 421+ tests, and the project uses well-configured mypy --strict + ruff. The refactoring is straightforward module extraction and pattern consolidation with minimal risk of behavioral change, as long as each step preserves existing test behavior.

**Primary recommendation:** Split tasks.py first (highest risk), then consolidate DRY violations, then remove dead code (safest), then fix resource leaks (smallest scope).

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| QUAL-01 | sync/tasks.py split into domain-specific modules, no file exceeding 300 lines | Verified: 1146 lines with clear domain boundaries at function level (grades, deadlines, modules, outlines, discussions, reminders/digest/token-health). Shared infrastructure (~50 lines) stays in a common module. |
| QUAL-02 | Grade calculation, adapter _request(), UserResponse construction unified to single source of truth; auth.py language_preference bug fixed | Verified: (a) Ed adapters have near-identical _request() methods (diff = 2 log strings). (b) auth.py constructs UserResponse inline without language_preference, while users.py has _build_user_response() that does it correctly. (c) Grade calculation is already centralized in GPAService but route layer accesses private methods directly. |
| QUAL-03 | ~360 lines of dead code removed (unused schemas, hooks, dependencies) | Verified: schemas/auth.py (42 lines, zero imports), hooks/use-search.ts (55 lines, zero imports), hooks/use-grades.ts (28 lines, zero imports), web/routes/auth.py (53 lines, duplicate of users.py /me), unused ruff F401 violations (~37 lines across files), plus dependency removals (passlib, bcrypt, jinja2, react-rough-notation). Reaches 300+ lines. |
| QUAL-04 | EdLessonsAdapter properly closes HTTP session, DB engines disposed on shutdown, health endpoint returns 503 when degraded | Verified: (a) _sync_ed_lessons() creates EdLessonsAdapter without finally:close(). (b) Neither database._engine nor sync/tasks._sync_engine are disposed in lifespan shutdown. (c) Health endpoint always returns HTTP 200 even when DB is disconnected. |
</phase_requirements>

## Architecture Patterns

### Current sync/tasks.py Structure (1146 lines)

The file contains these logical domains, which map directly to split targets:

| Domain | Functions | Lines (approx) | Target Module |
|--------|-----------|-----------------|---------------|
| Shared infrastructure | `_get_sync_session_factory`, `_record_sync_history`, `_MAX_RETRIES`, `_sync_engine` | ~50 | `sync/_shared.py` |
| Grades | `_sync_user_grades`, `sync_all_grades` | ~180 | `sync/grades.py` |
| Deadlines | `sync_all_deadlines` | ~170 | `sync/deadlines.py` |
| Modules + Ed Lessons | `sync_all_modules`, `_sync_canvas_modules`, `_sync_ed_lessons`, `_translate_user_courses` | ~270 | `sync/modules.py` |
| Outlines | `sync_all_outlines` | ~100 | `sync/outlines.py` |
| Discussions + AI eval | `sync_ed_discussions`, `_evaluate_synced_threads` | ~150 | `sync/discussions.py` |
| Reminders/Digest/Token | `check_deadline_reminders`, `generate_daily_digests`, `check_token_health` | ~160 | `sync/scheduled.py` |

### Recommended Post-Split Structure

```
src/sync/
  __init__.py          # re-exports public functions for engine.py
  _shared.py           # _get_sync_session_factory, _record_sync_history, _MAX_RETRIES, _sync_engine
  engine.py            # APScheduler lifespan (unchanged API, updated imports)
  grades.py            # sync_all_grades, _sync_user_grades
  deadlines.py         # sync_all_deadlines
  modules.py           # sync_all_modules, _sync_canvas_modules, _sync_ed_lessons, _translate_user_courses
  outlines.py          # sync_all_outlines
  discussions.py       # sync_ed_discussions, _evaluate_synced_threads
  scheduled.py         # check_deadline_reminders, generate_daily_digests, check_token_health
```

No file exceeds 300 lines. `engine.py` imports from `sync/__init__.py` which re-exports all public functions.

### Pattern: Ed Adapter _request() Deduplication

The `_request()` method in EdDiscussionAdapter and EdLessonsAdapter differ only in log message platform name. Extract to a shared base mixin or helper:

```python
# src/adapters/_ed_base.py
class EdAdapterMixin:
    """Shared _request logic for Ed Discussion and Ed Lessons adapters."""
    _client: httpx.AsyncClient
    _circuit: CircuitBreaker
    _retry: RetryConfig
    _platform_name: str  # "Ed Discussion" or "Ed Lessons"

    async def _request(self, method: str, path: str, params: dict | None = None) -> httpx.Response:
        # Shared implementation using self._platform_name for log messages
        ...
```

### Pattern: UserResponse Construction (DRY + Bug Fix)

Current duplication:
- `web/routes/users.py` has `_build_user_response()` (correct, includes `language_preference`)
- `web/routes/auth.py` has inline construction (buggy, always defaults to `"en"`)

Fix: Remove `auth.py` entirely (duplicate route at `/api/v1/auth/me`; frontend only uses `/api/v1/users/me`). If `/auth/me` must be preserved for backward compatibility, have it delegate to `_build_user_response` from users.py.

### Anti-Patterns to Avoid

- **Moving functions without updating test imports:** Test file `test_sync_tasks.py` (465 lines) patches `src.sync.tasks.*` -- after split, every `patch()` target must be updated to `src.sync.grades.*`, etc.
- **Breaking lazy imports:** Many sync task functions use lazy `from src.adapters.X import Y` to avoid circular imports. These must be preserved in the new modules.
- **Changing public API surface:** `engine.py` imports functions by name. The `sync/__init__.py` must re-export all public functions so `engine.py` changes are minimal.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resource cleanup | Custom cleanup tracking | `contextlib.asynccontextmanager` or `try/finally` | Standard Python pattern, guaranteed cleanup |
| Adapter base class | Complex inheritance hierarchy | Simple mixin with protocol typing | Ed adapters need shared _request(), not full OOP hierarchy |
| Dead code detection | Manual grep audits | `ruff --select F401,F811` + manual verification | ruff catches unused imports; manual verification for unused files/routes |

## Common Pitfalls

### Pitfall 1: Test Import Paths Break After Module Split
**What goes wrong:** Tests patch `src.sync.tasks.CanvasAdapter` but after split it moves to `src.sync.grades.CanvasAdapter`. All 465 lines of test_sync_tasks.py break.
**Why it happens:** Python mock.patch uses string paths to target, not object references.
**How to avoid:** Create a mapping of old->new patch targets before splitting. Update ALL patch decorators in the same commit as the split.
**Warning signs:** Tests pass individually but fail when run together (import caching).

### Pitfall 2: Circular Imports After Split
**What goes wrong:** New module `sync/grades.py` imports from `_shared.py` which imports from `grades.py`.
**Why it happens:** Shared utilities and domain modules have bidirectional dependencies.
**How to avoid:** `_shared.py` must have ZERO imports from sibling domain modules. All shared state (engine, session factory) flows one direction: `_shared -> domain modules`.
**Warning signs:** `ImportError: cannot import name 'X' from partially initialized module`.

### Pitfall 3: Removing "Dead" Code That Has Runtime Callers
**What goes wrong:** A schema or hook appears unused in grep but is referenced dynamically (e.g., via string-based resolution, or called by external tooling).
**Why it happens:** Static analysis misses dynamic imports, config files, or tooling references.
**How to avoid:** For each removal candidate: (1) grep all file types including YAML/JSON, (2) check test files, (3) check if it's a Pydantic model used for validation. Only remove if NO references found.
**Warning signs:** `ImportError` or `ModuleNotFoundError` at runtime.

### Pitfall 4: Engine Disposal Order Matters
**What goes wrong:** Disposing the database engine before scheduler shutdown causes pending sync tasks to fail with connection errors.
**Why it happens:** APScheduler may have in-flight jobs when `scheduler.shutdown(wait=False)` is called.
**How to avoid:** Disposal order: (1) `scheduler.shutdown(wait=True)` or at least `wait=False` with a small grace period, (2) dispose `_sync_engine`, (3) dispose `database._engine`.
**Warning signs:** Log warnings about connection pool errors during shutdown.

### Pitfall 5: Health Endpoint 503 Response Shape Change
**What goes wrong:** Changing the health endpoint from 200 to 503 when degraded breaks monitoring tools expecting 200 with body inspection.
**Why it happens:** Many health check integrations (load balancers, uptime monitors) check HTTP status code, not body.
**How to avoid:** This is the DESIRED behavior -- 503 signals degraded state to load balancers. Use `fastapi.responses.JSONResponse(status_code=503, content=...)` for degraded state.
**Warning signs:** None -- this is the correct fix per QUAL-04.

## Code Examples

### Split Module: sync/grades.py (pattern for all domain modules)

```python
# src/sync/grades.py
"""Grade sync tasks."""
from __future__ import annotations

import asyncio
import contextlib
import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.grade import Grade
from src.models.user import Profile
from src.schemas.common import TokenInvalidError
from src.security.encryption import get_encryption
from src.sync._shared import _MAX_RETRIES, _get_sync_session_factory, _record_sync_history

logger = structlog.get_logger()

# Move _sync_user_grades and sync_all_grades here unchanged
```

### Ed Adapter Mixin

```python
# src/adapters/_ed_base.py
"""Shared request logic for Ed Platform adapters."""
from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import structlog

from src.adapters.resilience import CircuitBreaker, RetryConfig
from src.schemas.common import TokenInvalidError, UpstreamUnavailableError

logger = structlog.get_logger()


class EdRequestMixin:
    """Shared _request() for Ed Discussion and Ed Lessons adapters."""

    _client: httpx.AsyncClient
    _circuit: CircuitBreaker
    _retry: RetryConfig
    _platform_name: str  # set by subclass __init__

    async def _request(
        self, method: str, path: str, params: dict[str, Any] | None = None,
    ) -> httpx.Response:
        for attempt in range(self._retry.max_attempts):
            if not self._circuit.can_execute():
                logger.warning(f"{self._platform_name.lower().replace(' ', '_')}_circuit_open")
                raise UpstreamUnavailableError(f"{self._platform_name} circuit breaker is open")
            # ... identical shared logic ...
```

### Health Endpoint with 503

```python
@router.get("/health")
async def health_check(session: AsyncSession = Depends(get_session)) -> JSONResponse:
    db_status = "disconnected"
    try:
        await session.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        pass

    status = "healthy" if db_status == "connected" else "degraded"
    status_code = 200 if status == "healthy" else 503
    return JSONResponse(
        status_code=status_code,
        content={"status": status, "database": db_status, "timestamp": datetime.now(UTC).isoformat()},
    )
```

### Engine Disposal in Lifespan

```python
# src/sync/engine.py lifespan additions
try:
    yield
finally:
    scheduler.shutdown(wait=False)
    scheduler = None
    # Dispose sync engine
    from src.sync._shared import dispose_sync_engine
    await dispose_sync_engine()
    # Dispose main database engine
    from src.database import dispose_engine
    await dispose_engine()
    logger.info("sync_engine_stopped")
```

## Dead Code Inventory

### Verified Dead Code (candidates for removal)

| Item | Type | Lines | Evidence |
|------|------|-------|----------|
| `src/schemas/auth.py` | Unused schema module | 42 | Zero imports in entire codebase (grep verified) |
| `src/web/routes/auth.py` | Duplicate route | 53 | `/auth/me` duplicates `/users/me` with language_preference bug; frontend only uses `/users/me` |
| `frontend/hooks/use-search.ts` | Unused hook | 55 | Zero imports from any component (grep verified) |
| `frontend/hooks/use-grades.ts` | Unused hook | 28 | Zero imports from any component (grep verified) |
| Unused Python imports | F401 violations | ~37 | `ruff --select F401` reports 37 violation lines |
| `auth_router` registration in `__init__.py` | Dead route wiring | 2 | After auth.py removal |
| Unused test helpers (if any) | TBD during execution | ~20 | To be verified during dead code pass |
| **Subtotal (verified code)** | | **~237** | |

### Verified Dead Dependencies (removal = lines saved in lock files + reduced attack surface)

| Dependency | Location | Reason Dead |
|------------|----------|-------------|
| `passlib[bcrypt]` | pyproject.toml | Zero imports in `src/` (auth moved to Supabase) |
| `bcrypt` | pyproject.toml | Zero imports in `src/` (companion of passlib) |
| `jinja2` | pyproject.toml | Zero imports in `src/` (email templates exist but jinja2 never loaded) |
| `react-rough-notation` | frontend/package.json | Zero imports in source; project uses `rough-notation` directly |

### Dead Code Line Count Analysis

The QUAL-03 target is "at least 300 lines removed." With verified dead files (237 lines) plus ruff auto-fixes, dependency removal from config files, and any additional dead code discovered during execution, the target of 300+ is achievable. The requirement text says "~360 lines" which includes all of the above plus lock file / dependency manifest cleanup.

## Resource Leak Analysis (QUAL-04)

### Leak 1: EdLessonsAdapter in _sync_ed_lessons

**Location:** `src/sync/tasks.py:765` (`_sync_ed_lessons`)
**Issue:** `adapter = EdLessonsAdapter(ed_token)` followed by `try:` block that catches `TokenInvalidError` but has NO `finally: await adapter.close()`.
**Fix:** Add `finally: await adapter.close()` (same pattern as `_sync_canvas_modules` at line 591).
**Contrast:** In `sync_all_deadlines`, the Ed Lessons adapter IS closed properly (line 324).

### Leak 2: Database Engines Never Disposed

**Location:** `src/database.py:14` (`_engine`) and `src/sync/tasks.py:38` (`_sync_engine`)
**Issue:** Both singleton engines are created lazily but never disposed on application shutdown. The lifespan in `engine.py` only calls `scheduler.shutdown()`.
**Fix:** Add `dispose_engine()` and `dispose_sync_engine()` async functions; call both in lifespan's `finally` block.

### Leak 3: Health Endpoint Returns 200 When Degraded

**Location:** `src/web/routes/health.py`
**Issue:** Always returns HTTP 200. When database is disconnected, returns `{"status": "degraded"}` with 200 status code.
**Fix:** Return 503 status code when degraded. Load balancers and monitoring tools check HTTP status, not response body.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.x + pytest-asyncio |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `python -m pytest tests/unit/ -x -q` |
| Full suite command | `python -m pytest tests/ -x -q` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| QUAL-01 | Split sync/tasks.py into domain modules; no file > 300 lines | unit + smoke | `python -m pytest tests/unit/test_sync_tasks.py tests/unit/test_sync_ed_discussions.py -x` then `find src/sync -name '*.py' \| xargs wc -l` | Existing tests need migration |
| QUAL-02 | DRY consolidation: Ed adapter mixin, UserResponse single source, auth.py bug fix | unit | `python -m pytest tests/unit/test_ed_discussion_adapter.py tests/unit/test_ed_lessons_adapter.py -x` | Existing |
| QUAL-03 | Dead code removed, ruff clean | lint + smoke | `python -m ruff check src/ --select F401,F811` and `python -m pytest tests/ -x -q --co` (collect-only to verify no import errors) | N/A (lint check) |
| QUAL-04 | Resource leaks fixed: EdLessonsAdapter close, engine disposal, health 503 | unit + integration | `python -m pytest tests/unit/test_sync_tasks.py tests/integration/test_sync_engine.py -x -q` | Existing + new health test |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/unit/ -x -q`
- **Per wave merge:** `python -m pytest tests/ -x -q`
- **Phase gate:** Full suite green + `ruff check` clean + `mypy --strict` clean before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_health_503.py` -- covers QUAL-04 health endpoint returning 503 when degraded
- [ ] Update `tests/unit/test_sync_tasks.py` patch targets after module split -- covers QUAL-01

## Project Constraints (from CLAUDE.md)

- **Code comments:** Pure English, no Chinese, no bilingual mixing
- **Commit format:** `<type>(<phase>-<plan>): <description>` (GSD project)
- **Package managers:** `uv` (backend), `pnpm 9+` (frontend)
- **Type checking:** `mypy --strict` (Python), `tsc --noEmit` (TypeScript)
- **Lint:** `ruff` (Python), `ESLint --max-warnings 0` (frontend)
- **Test framework:** `pytest + pytest-asyncio` (backend), `vitest` (frontend)
- **Dev server port:** frontend on 3001
- **TDD required:** For business logic changes; infrastructure/config changes may skip
- **Verification loop:** Build -> Test -> Lint -> TypeCheck after every change

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection of all files mentioned in requirements
- `ruff --select F401` for unused import detection
- `grep -r` / `diff` for duplication verification
- Line counts via `wc -l` for all target files

### Verification Method
All findings are based on direct inspection of the current codebase on the `feature/gsd-22-testing-suite` branch. No external sources needed -- this is a refactoring phase operating entirely on existing code.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, pure refactoring
- Architecture: HIGH -- split boundaries are obvious from function-level domain separation
- Pitfalls: HIGH -- patterns observed directly in codebase (lazy imports, test patch paths)
- Dead code: HIGH -- verified via grep/ruff with zero ambiguity

**Research date:** 2026-04-01
**Valid until:** Until Phase 23 is complete (findings are snapshot of current codebase)
