---
phase: 01-foundation-data-acquisition
plan: "01"
subsystem: database, infra
tags: [sqlalchemy, asyncpg, postgresql, alembic, fastapi, pydantic, structlog, aes-gcm, docker]

# Dependency graph
requires: []
provides:
  - "11 SQLAlchemy 2.0 async ORM models (User, Course, Grade, DiscussionThread, UnifiedDeadline, UnitOutline, Module, ModuleItem, Lesson, Slide, PushRecord)"
  - "Alembic async migration (001_initial_schema) with all tables and indexes"
  - "AES-256-GCM token encryption (TokenEncryption, get_encryption())"
  - "pydantic-settings configuration (Settings, get_settings())"
  - "structlog JSON logging with sensitive field redaction"
  - "FastAPI app factory with health endpoint, request_id middleware, UniboardError handlers"
  - "Unified response envelope (SuccessResponse[T], ErrorResponse, MetaInfo)"
  - "Exception hierarchy (UniboardError, TokenInvalidError, UpstreamAPIError, etc.)"
  - "Docker Compose with PostgreSQL 16-alpine and healthcheck"
affects: [01-02-auth, 01-03-adapters, 02-services-api]

# Tech tracking
tech-stack:
  added: [fastapi, sqlalchemy, asyncpg, alembic, pydantic-settings, structlog, cryptography, pyjwt, httpx, beautifulsoup4, lxml, pytest, pytest-asyncio, mypy, ruff]
  patterns: [async-engine-lazy-init, session-per-request, mapped-column-annotations, computed-tsvector, unified-error-envelope, request-id-middleware]

key-files:
  created:
    - pyproject.toml
    - docker-compose.yml
    - src/config.py
    - src/logging.py
    - src/database.py
    - src/models/base.py
    - src/models/user.py
    - src/models/course.py
    - src/models/grade.py
    - src/models/discussion.py
    - src/models/deadline.py
    - src/models/unit_outline.py
    - src/models/module.py
    - src/models/lesson.py
    - src/models/push_record.py
    - src/schemas/common.py
    - src/web/main.py
    - src/security/encryption.py
    - alembic/env.py
    - alembic/versions/729bc00dc08d_initial_schema.py
    - tests/conftest.py
    - tests/integration/test_models.py
    - tests/integration/test_migrations.py
    - tests/integration/test_encryption.py
  modified:
    - .gitignore

key-decisions:
  - "Lazy engine initialization to avoid import-time side effects and enable test fixture overrides"
  - "Single initial migration (001_initial_schema) for all 11 tables -- no existing data to migrate"
  - "DiscussionThread.search_vector uses SQLAlchemy Computed() for GENERATED ALWAYS tsvector column"
  - "Alembic versions excluded from ruff checks (auto-generated code)"
  - "Session-scoped event loop for pytest-asyncio to avoid cross-loop connection issues"
  - "Same database (uniboard_dev) for tests with per-test transaction rollback for isolation"

patterns-established:
  - "Mapped[] + mapped_column() for all ORM models (SQLAlchemy 2.0, no legacy Column())"
  - "UUIDMixin + TimestampMixin for consistent id/created_at/updated_at across all models"
  - "get_settings() cached singleton for configuration access"
  - "configure_logging() with structlog processors and sensitive field redaction"
  - "create_app() factory for FastAPI with middleware and exception handlers"
  - "TokenEncryption with fresh nonce per encrypt() and canary_check()"
  - "Per-test rollback via nested session.begin() + session.rollback()"

requirements-completed: [INFRA-01, INFRA-07, INFRA-09]

# Metrics
duration: 13min
completed: 2026-03-16
---

# Phase 1 Plan 01: Database & Infrastructure Summary

**11 SQLAlchemy 2.0 async ORM models with Alembic migration, AES-256-GCM encryption, FastAPI app with unified error handling, structlog, and 21 passing integration tests against real PostgreSQL**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-16T05:16:03Z
- **Completed:** 2026-03-16T05:29:11Z
- **Tasks:** 8/8
- **Files modified:** 37

## Accomplishments

- Complete backend foundation: pyproject.toml with all dependencies, Docker Compose with PostgreSQL 16
- All 11 ORM models with Mapped[] annotations, all 12 indexes from TRD SS15.5, and tsvector GENERATED column
- FastAPI app factory with GET /api/v1/health, X-Request-ID middleware, UniboardError exception handlers
- AES-256-GCM encryption with fresh nonce per operation and startup canary check
- 21 integration tests passing against real PostgreSQL (12 model CRUD, 3 migration lifecycle, 6 encryption)
- Full verification chain passes: mypy --strict (0 errors), ruff check (0 warnings), pytest (21 green)

## Task Commits

Each task was committed atomically:

1. **Task 1: Project scaffolding + pyproject.toml + Docker Compose** - `03c21ad` (chore)
2. **Task 2: pydantic-settings configuration** - `0f48626` (feat)
3. **Task 3: structlog JSON logging with redaction** - `d0c1b71` (feat)
4. **Task 4: Unified API response wrapper + exception hierarchy + FastAPI app** - `8dad9dc` (feat)
5. **Task 5: SQLAlchemy 2.0 async ORM models** - `50c70f9` (feat)
6. **Task 6: Alembic async migration** - `0f26558` (feat)
7. **Task 7: AES-256-GCM token encryption** - `4dc3713` (feat)
8. **Task 8: Integration tests** - `ecc8c87` (test)

## Files Created/Modified

- `pyproject.toml` - Project definition with all backend deps, pytest/mypy/ruff config
- `docker-compose.yml` - PostgreSQL 16-alpine with healthcheck
- `.env.example` - All required environment variables
- `src/config.py` - pydantic-settings Settings class with get_settings() singleton
- `src/logging.py` - structlog JSON logging with sensitive field redaction processor
- `src/database.py` - Lazy-init async engine, session factory, get_session() FastAPI dep
- `src/models/base.py` - DeclarativeBase with UUIDMixin and TimestampMixin
- `src/models/user.py` - User model with encrypted token fields
- `src/models/course.py` - Course model with Canvas/Ed ID linking
- `src/models/grade.py` - Grade model with assessment scores and weights
- `src/models/discussion.py` - DiscussionThread with Computed tsvector for full-text search
- `src/models/deadline.py` - UnifiedDeadline with SHA-256 dedup_key
- `src/models/unit_outline.py` - UnitOutline with JSON assessments and raw HTML
- `src/models/module.py` - Module + ModuleItem for Canvas modules
- `src/models/lesson.py` - Lesson + Slide for Ed Lessons
- `src/models/push_record.py` - PushRecord for notification dedup
- `src/schemas/common.py` - SuccessResponse[T], ErrorResponse, exception hierarchy
- `src/web/main.py` - FastAPI create_app() with middleware and exception handlers
- `src/security/encryption.py` - AES-256-GCM TokenEncryption class
- `alembic/env.py` - Async Alembic env reading DATABASE_URL from Settings
- `alembic/versions/729bc00dc08d_initial_schema.py` - Initial migration for all 11 tables
- `tests/conftest.py` - Session-scoped engine, per-test rollback, encryption fixtures
- `tests/integration/test_models.py` - 12 CRUD + constraint tests
- `tests/integration/test_migrations.py` - 3 alembic lifecycle tests
- `tests/integration/test_encryption.py` - 6 encryption tests

## Decisions Made

- **Lazy engine init**: Engine created on first `get_session()` call, not at module import. Avoids import-time side effects and allows test fixtures to work independently.
- **Single initial migration**: One migration file (001_initial_schema) with all 11 tables. Simpler to reason about since there's no existing data.
- **Computed tsvector**: Used SQLAlchemy `Computed()` for `search_vector` column so INSERT/UPDATE exclude it automatically. PostgreSQL auto-populates from title + content.
- **Alembic versions excluded from ruff**: Auto-generated migration code doesn't need to follow our style rules.
- **Session-scoped event loop**: Set `asyncio_default_test_loop_scope=session` to avoid asyncpg "attached to a different loop" errors.
- **Same DB for tests**: Using `uniboard_dev` with per-test rollback instead of a separate `uniboard_test` database. Simpler setup.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DiscussionThread search_vector INSERT error**
- **Found during:** Task 8 (Integration tests)
- **Issue:** PostgreSQL GENERATED ALWAYS column rejects explicit INSERT values. The ORM model declared `search_vector` as a regular TSVECTOR nullable column, which SQLAlchemy tried to INSERT.
- **Fix:** Changed `search_vector` to use `Computed()` with the tsvector expression, telling SQLAlchemy to exclude it from INSERT/UPDATE.
- **Files modified:** `src/models/discussion.py`
- **Verification:** `test_create_discussion_thread` passes, tsvector auto-populated by PostgreSQL
- **Committed in:** `ecc8c87` (Task 8 commit)

**2. [Rule 1 - Bug] Fixed timezone-naive/aware datetime mismatch in tests**
- **Found during:** Task 8 (Integration tests)
- **Issue:** Test data used `datetime(..., tzinfo=UTC)` but DB columns use `DateTime()` without timezone. asyncpg rejects mixing naive and aware datetimes.
- **Fix:** Removed `tzinfo=UTC` from test datetime constructors since DB schema uses timezone-naive datetimes.
- **Files modified:** `tests/integration/test_models.py`
- **Verification:** All model tests pass without timezone errors
- **Committed in:** `ecc8c87` (Task 8 commit)

**3. [Rule 3 - Blocking] Fixed pytest-asyncio event loop scope mismatch**
- **Found during:** Task 8 (Integration tests)
- **Issue:** Session-scoped `test_engine` fixture created connections on one event loop, but function-scoped tests used a different loop, causing "attached to a different loop" RuntimeError.
- **Fix:** Set `asyncio_default_test_loop_scope=session` in pyproject.toml and used `loop_scope="session"` on fixtures.
- **Files modified:** `pyproject.toml`, `tests/conftest.py`
- **Verification:** All 21 tests pass consistently
- **Committed in:** `ecc8c87` (Task 8 commit)

---

**Total deviations:** 3 auto-fixed (2 bug fixes, 1 blocking issue)
**Impact on plan:** All fixes necessary for correctness. No scope creep.

## Issues Encountered

- **Docker Desktop not running**: Docker daemon was not started. Resolved by opening Docker Desktop and waiting for it to become ready.
- **Alembic migration tests flaky on state**: `test_engine` teardown drops all model tables but not `alembic_version`, leaving stale migration state. Resolved by having migration tests reset state with explicit `DROP TABLE ... CASCADE` before each test.

## User Setup Required

None - Docker Compose handles PostgreSQL. Copy `.env.example` to `.env` when adding real API tokens.

## Next Phase Readiness

- All ORM models ready for auth endpoints (01-02) and adapter implementations (01-03)
- `get_settings()`, `get_session()`, `get_encryption()` factories available for dependency injection
- Exception hierarchy in `src/schemas/common.py` ready for adapter error handling
- FastAPI app factory ready to add auth routes and adapter endpoints

---
*Phase: 01-foundation-data-acquisition*
*Completed: 2026-03-16*
