# Phase 16: Sync Engine - Research

**Researched:** 2026-03-27
**Domain:** Background data synchronization (APScheduler + SQLAlchemy async + external API adapters)
**Confidence:** HIGH

## Summary

Phase 16 fills the gaps in an already-substantial sync engine codebase. The core infrastructure is in place: `src/sync/engine.py` manages APScheduler lifespan with 5 registered jobs, `src/sync/tasks.py` has ~600 lines implementing grade, deadline, and module sync. The three primary gaps are: (1) deadline sync passes empty lists for Ed sources instead of actual adapter data, (2) Unit Outline sync task is entirely missing, and (3) a `sync_history` audit trail table does not exist yet.

The existing code follows a clear pattern: singleton engine, per-user iteration with 3-retry + exponential backoff, `TokenInvalidError` as immediate retry-break, and `pg_insert().on_conflict_do_update()` for upserts. All platform adapters (Canvas, Ed Discussion, Ed Lessons, UnitOutlineParser) are battle-tested from Phase 14 with circuit breakers and defensive parsing. The Supabase migration pattern uses raw SQL files in `supabase/migrations/`.

**Primary recommendation:** Wire Ed adapter data into existing deadline sync, add a Unit Outline sync task + cron job, create a `sync_history` table (migration + model), and write integration tests following the Phase 15 mock-adapter + real-DB pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Deadline Data Sources**: Three-source full aggregation (Canvas + Ed Lessons + Ed Discussion). Wire Ed adapters into `sync_all_deadlines()` which currently passes empty lists.
- **Unit Outline Sync Strategy**: Semester-initial CronTrigger (March + August) + manual trigger via `POST /sync/trigger` with `scope=outline`.
- **Sync Status Tracking**: New `sync_history` table with schema: `id, user_id, domain, status, records_updated, error_message, started_at, completed_at`. Profile fields remain for quick status. Retention: 30 days or 100 records per user per domain.
- **Sync Testing Strategy**: Mock adapter + real DB, consistent with Phase 15 integration test pattern. Test failure modes: TokenInvalidError stops retry, transient errors retry 3x, circuit breaker propagation. Use `UNIBOARD_DISABLE_SYNC=true` env var.

### Claude's Discretion
- sync_history table migration details (column types, indexes)
- Exact CronTrigger schedule for semester-initial outline sync (March 1st vs first Monday)
- Whether to run initial outline sync on app startup for new users
- Concurrency limit for parallel user syncs (currently sequential per-user)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-02 | Background sync engine: grades every 15 min, deadlines hourly, modules daily, Unit Outline per semester | Existing engine.py has grades/deadlines/modules jobs. Gaps: Ed source wiring for deadlines, Unit Outline sync task + cron job, sync_history table for status tracking. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| APScheduler | 3.11.2 | Background job scheduling | Already installed, used in engine.py with AsyncIOScheduler |
| SQLAlchemy | 2.0+ (async) | ORM + async DB access | Project standard; async_sessionmaker for sync tasks |
| asyncpg | 0.30+ | PostgreSQL async driver | Project standard; used by all DB operations |
| structlog | 24.0+ | Structured logging | Project standard; all sync tasks log with structlog |
| httpx | 0.28+ | Async HTTP client | Used by all adapters (Canvas, Ed Discussion, Ed Lessons, UnitOutlineParser) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| rapidfuzz | 3.14+ | Fuzzy string matching | Already used in DeadlineService for near-duplicate detection |
| beautifulsoup4 | 4.13+ | HTML parsing | Already used by UnitOutlineParser |
| lxml | 5.3+ | HTML parser backend | Already used as BS4 parser |
| pydantic | 2.10+ | Schema validation | Ed adapter response models, SyncHistory schema |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| APScheduler 3.x | APScheduler 4.x | v4 has breaking API changes (async-first), project pins `<4.0` |
| Raw SQL migration | Alembic | Project uses Supabase CLI migration pattern, not Alembic for schema changes |

**No installation needed** -- all dependencies are already in `pyproject.toml`.

## Architecture Patterns

### Existing Sync Architecture (DO NOT change)
```
src/
├── sync/
│   ├── engine.py      # APScheduler lifespan + job registration
│   └── tasks.py       # sync_all_grades, sync_all_deadlines, sync_all_modules, etc.
├── adapters/
│   ├── canvas.py      # CanvasAdapter (rate limit + circuit breaker)
│   ├── ed_discussion.py  # EdDiscussionAdapter
│   ├── ed_lessons.py     # EdLessonsAdapter
│   └── resilience.py     # CircuitBreaker, RetryConfig, CanvasRateLimiter
├── parsers/
│   └── usyd_outline.py   # UnitOutlineParser
├── services/
│   └── deadline.py    # DeadlineService.aggregate_and_dedup()
├── models/
│   └── (all ORM models)
├── schemas/
│   └── sync.py        # SyncSourceStatus, SyncStatusResponse, SyncTriggerResponse
└── web/
    └── routes/sync.py # POST /sync/trigger, GET /sync/status
```

### New Files to Create
```
src/
├── models/
│   └── sync_history.py    # SyncHistory ORM model (NEW)
├── schemas/
│   └── sync.py            # Add SyncHistoryResponse schema (EXTEND)
├── sync/
│   ├── engine.py          # Add outline sync job (MODIFY)
│   └── tasks.py           # Add sync_all_outlines + wire Ed sources (MODIFY)
└── web/
    └── routes/sync.py     # Extend GET /sync/status with history (MODIFY)

supabase/migrations/
└── 00000000000003_sync_history.sql  # New migration (NEW)

tests/
├── unit/
│   └── test_sync_tasks.py           # Unit tests for sync task logic (NEW)
└── integration/
    └── test_sync_engine.py          # Extend existing sync integration tests (MODIFY)
```

### Pattern 1: Singleton Engine + Per-User Iteration
**What:** Module-level `_sync_engine` variable creates one connection pool, reused across all sync calls. Each sync task iterates over users with their own session.
**When to use:** All sync tasks follow this pattern.
**Example:**
```python
# Source: src/sync/tasks.py (existing pattern)
_sync_engine: AsyncEngine | None = None

def _get_sync_session_factory() -> async_sessionmaker[AsyncSession]:
    global _sync_engine
    if _sync_engine is None:
        settings = get_settings()
        _sync_engine = create_async_engine(settings.database_url, pool_size=3)
    return async_sessionmaker(_sync_engine, class_=AsyncSession, expire_on_commit=False)
```

### Pattern 2: Retry with TokenInvalidError Break
**What:** 3 retries with exponential backoff for transient errors; immediate break on `TokenInvalidError` (no point retrying auth failures).
**When to use:** Every sync task that calls external APIs.
**Example:**
```python
# Source: src/sync/tasks.py (existing pattern)
for attempt in range(_MAX_RETRIES):
    try:
        # ... adapter calls + DB writes ...
        break  # Success
    except TokenInvalidError:
        break  # Don't retry on auth errors
    except Exception:
        if attempt < _MAX_RETRIES - 1:
            await asyncio.sleep(2 ** attempt)
        else:
            # Mark sync as failed
```

### Pattern 3: pg_insert().on_conflict_do_update() Upsert
**What:** PostgreSQL-specific upsert using conflict constraints.
**When to use:** Grades, modules, lessons, deadlines -- any entity that may already exist from a previous sync.
**Example:**
```python
# Source: src/sync/tasks.py (existing pattern)
insert_stmt = pg_insert(Grade).values(**values)
insert_stmt = insert_stmt.on_conflict_do_update(
    constraint="uq_grades_course_assessment",
    set_={"score": values["score"], "max_score": values["max_score"]},
)
await session.execute(insert_stmt)
```

### Pattern 4: Adapter Close in finally
**What:** All adapters must be closed to release httpx connections.
**When to use:** Every adapter usage in sync tasks.
**Example:**
```python
adapter = CanvasAdapter(token)
try:
    # ... use adapter ...
finally:
    await adapter.close()
```

### Anti-Patterns to Avoid
- **Creating new adapters per course:** Create ONE adapter per user per platform, iterate over courses with it.
- **Committing inside per-course loop:** Commit once after all courses are processed for a user, not per-course.
- **Using aware datetimes with asyncpg TIMESTAMP WITHOUT TIME ZONE:** Per Phase 15 lesson -- use naive datetimes for TIMESTAMP columns. The `canvas_last_synced_at` and `ed_last_synced_at` columns use TIMESTAMPTZ so aware is fine there, but be careful with column type.
- **Forgetting to add Ed TokenInvalidError handling:** Ed adapters can also raise TokenInvalidError; handle it the same way as Canvas.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Deadline dedup | Custom dedup logic | `DeadlineService.aggregate_and_dedup()` | Already implements SHA-256 + fuzzy matching with rapidfuzz |
| Retry + backoff | Custom retry loop | Follow existing `_MAX_RETRIES` pattern in tasks.py | Pattern is battle-tested, handles TokenInvalidError correctly |
| Circuit breaker | Custom circuit breaker | `src/adapters/resilience.CircuitBreaker` | Already used by all adapters, threshold=5, cooldown=60s |
| HTML parsing | Custom parser | `UnitOutlineParser.fetch_and_parse()` | Already handles multiple table formats, weight validation |
| Token decryption | Raw crypto calls | `get_encryption().decrypt()` | AES-256-GCM wrapper already exists |
| Session management | Ad-hoc engine creation | `_get_sync_session_factory()` | Singleton engine prevents connection pool leaks |

**Key insight:** The primary work is WIRING existing components together, not building new capabilities. The adapters, parser, dedup service, and resilience utilities are all ready.

## Common Pitfalls

### Pitfall 1: Ed Discussion deadline extraction passes wrong data format
**What goes wrong:** `aggregate_and_dedup()` expects `ed_discussion_texts` as `list[tuple[str, str]]` (text_content, source_id), but Ed Discussion adapter returns `list[dict[str, object]]`.
**Why it happens:** API returns dicts, but DeadlineService expects tuples.
**How to avoid:** Transform Ed Discussion thread data to the expected tuple format before passing to `aggregate_and_dedup()`.
**Warning signs:** Type errors or empty deadline extraction from Ed Discussion.

### Pitfall 2: Ed Lessons adapter returns tuple, not list
**What goes wrong:** `EdLessonsAdapter.get_lessons()` returns `tuple[list[dict], list[dict]]` (lessons, modules), not just lessons.
**Why it happens:** The adapter returns both lessons and modules from the same endpoint.
**How to avoid:** Always unpack: `lessons_data, _ = await adapter.get_lessons(course.ed_course_id)`.
**Warning signs:** Passing the full tuple to `aggregate_and_dedup()` instead of just the lessons list.

### Pitfall 3: Naive vs aware datetimes in sync tasks
**What goes wrong:** `asyncpg.DataError` when inserting tz-aware datetimes into TIMESTAMP WITHOUT TIME ZONE columns.
**Why it happens:** Phase 15 established that naive datetimes are required for columns typed as TIMESTAMP (not TIMESTAMPTZ).
**How to avoid:** Use `datetime.now(UTC).replace(tzinfo=None)` for TIMESTAMP columns. Use `datetime.now(UTC)` for TIMESTAMPTZ columns. Check the migration SQL to determine which type each column uses.
**Warning signs:** `DataError: cannot convert 'aware' datetime to 'naive'`.

### Pitfall 4: UnitOutlineParser uses httpx internally
**What goes wrong:** `fetch_and_parse()` creates its own httpx.AsyncClient and makes HTTP requests -- this means it could fail with network errors that need retry handling.
**Why it happens:** The parser is designed as a standalone utility, not integrated into the adapter resilience pattern.
**How to avoid:** Wrap `fetch_and_parse()` calls in try/except with retry logic, similar to how other sync tasks handle transient failures.
**Warning signs:** Outline sync fails silently on network errors.

### Pitfall 5: APScheduler timezone pitfall for semester cron
**What goes wrong:** Using UTC hour for semester-based outline sync leads to wrong trigger times during DST transitions.
**Why it happens:** USYD operates in AEST/AEDT (UTC+10/+11), and semester start dates are in local time.
**How to avoid:** Use `timezone="Australia/Sydney"` in CronTrigger for outline sync, same pattern as the daily digest job already does.
**Warning signs:** Outline sync fires at unexpected times during daylight saving transitions.

### Pitfall 6: sync_history table needs user_id FK reference
**What goes wrong:** If `sync_history.user_id` references `profiles.id`, but `profiles.id` references `auth.users(id)`, need to ensure the FK chain is correct.
**Why it happens:** Supabase Auth manages user creation; profiles are auto-created via trigger.
**How to avoid:** FK `sync_history.user_id REFERENCES profiles(id) ON DELETE CASCADE` is correct (same pattern as notifications and digests tables which use `auth.users(id)` directly).
**Warning signs:** FK constraint violation if referencing wrong table.

## Code Examples

### Example 1: Wiring Ed Sources into Deadline Sync (gap in tasks.py)

Current code at `sync_all_deadlines()` line 244-249:
```python
# CURRENT (empty lists)
await svc.aggregate_and_dedup(
    course,
    canvas_assignments=assignments,
    ed_lessons_data=[],         # <-- GAP: needs Ed Lessons data
    ed_discussion_texts=[],     # <-- GAP: needs Ed Discussion data
)
```

Required change pattern:
```python
# Wire in Ed Lessons deadlines
ed_lessons_data: list[dict[str, object]] = []
if user_in_session.ed_api_token_encrypted:
    ed_token = encryption.decrypt(str(user_in_session.ed_api_token_encrypted))
    ed_adapter = EdLessonsAdapter(ed_token)
    try:
        lessons, _ = await ed_adapter.get_lessons(course.ed_course_id)
        ed_lessons_data = [l for l in lessons if l.get("due_at")]
    except TokenInvalidError:
        user_in_session.ed_token_status = "expired"
    except Exception:
        logger.warning("sync_ed_lessons_deadline_error", course=course.code)
    finally:
        await ed_adapter.close()

# Wire in Ed Discussion deadline mentions
ed_discussion_texts: list[tuple[str, str]] = []
if user_in_session.ed_api_token_encrypted and course.ed_course_id:
    ed_disc_adapter = EdDiscussionAdapter(ed_token)
    try:
        threads = await ed_disc_adapter.get_threads(course.ed_course_id)
        ed_discussion_texts = [
            (str(t.get("content", "")), str(t.get("id", "")))
            for t in threads
            if t.get("content")
        ]
    except (TokenInvalidError, Exception):
        pass
    finally:
        await ed_disc_adapter.close()

await svc.aggregate_and_dedup(
    course,
    canvas_assignments=assignments,
    ed_lessons_data=ed_lessons_data,
    ed_discussion_texts=ed_discussion_texts,
)
```

### Example 2: sync_history Model Pattern
```python
# Source: follows existing model patterns in src/models/
class SyncHistory(UUIDMixin, Base):
    """Audit trail for sync operations."""
    __tablename__ = "sync_history"
    __table_args__ = (
        Index("ix_sync_history_user_domain", "user_id", "domain"),
        Index("ix_sync_history_started_at", "started_at"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    domain: Mapped[str] = mapped_column(String(20))  # grades|deadlines|modules|outlines
    status: Mapped[str] = mapped_column(String(20))   # success|failed|partial
    records_updated: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column()
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
```

### Example 3: Unit Outline Sync Task Pattern
```python
async def sync_all_outlines() -> None:
    """Sync Unit Outlines for all courses with outline_url."""
    session_factory = _get_sync_session_factory()
    parser = UnitOutlineParser()

    async with session_factory() as session:
        result = await session.execute(
            select(Course).where(Course.unit_outline_url.isnot(None))
        )
        courses = list(result.scalars().all())

    for course in courses:
        try:
            result = await parser.fetch_and_parse(str(course.unit_outline_url))
            async with session_factory() as session:
                # Upsert UnitOutline
                # ... pg_insert pattern ...
                await session.commit()
        except Exception:
            logger.error("sync_outline_failed", course=course.code, exc_info=True)
```

### Example 4: Supabase Migration Pattern
```sql
-- Source: follows existing pattern in supabase/migrations/
CREATE TABLE sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  domain VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  records_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_sync_history_user_domain ON sync_history (user_id, domain);
CREATE INDEX ix_sync_history_started_at ON sync_history (started_at);

CREATE TRIGGER sync_history_updated_at
  BEFORE UPDATE ON sync_history
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| APScheduler 4.x (alpha) | APScheduler 3.11.x (stable) | Project pins `<4.0` | Stick with 3.x API: AsyncIOScheduler, add_job(), IntervalTrigger/CronTrigger |
| Alembic migrations | Supabase CLI migrations (raw SQL) | Phase 13 decision | New tables use `supabase/migrations/*.sql`, not Alembic |
| Per-user auth (bcrypt) | Supabase Auth (JWT) | Phase 13 | Sync tasks decrypt tokens from Profile, don't manage auth |

**Key version notes:**
- APScheduler 3.11.2 installed -- uses `AsyncIOScheduler`, NOT the v4 async-first API
- SQLAlchemy 2.0 async -- `async_sessionmaker`, not `sessionmaker`
- The test file `test_sync_engine.py` still references `User` model (old Phase 13 model); needs update to `Profile` model

## Open Questions

1. **sync_history FK target: profiles.id vs auth.users(id)**
   - What we know: Existing tables (notifications, digests, push_records, whatif_scenarios) use `auth.users(id)` directly. Courses use `profiles.id` indirectly.
   - What's unclear: Which FK pattern to follow for sync_history.
   - Recommendation: Use `profiles(id)` since sync operations are tied to profile data (encrypted tokens live in profiles). This matches the Course model pattern.

2. **Semester detection for outline CronTrigger**
   - What we know: USYD semesters start ~early March (S1) and ~early August (S2).
   - What's unclear: Exact trigger dates.
   - Recommendation: Use March 1 and August 1 as safe triggers (CronTrigger with month=3,8 and day=1). Outlines are available before semester start.

3. **Existing test_sync_engine.py references obsolete User model**
   - What we know: Phase 13 replaced `User` with `Profile` + Supabase Auth. The sync integration test still imports `from src.models.user import User` and `from src.security.password import hash_password`.
   - What's unclear: Whether these tests currently pass.
   - Recommendation: Fix these tests as part of Phase 16 to use `Profile` + JWT auth pattern from Phase 15 conftest.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio 0.25+ |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `uv run pytest tests/unit/test_sync_tasks.py -x` |
| Full suite command | `uv run pytest tests/ -x --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INFRA-02a | Grade sync runs every 15min, updates DB | integration | `uv run pytest tests/integration/test_sync_engine.py -x -k "grades"` | Partial (needs Profile fix) |
| INFRA-02b | Deadline sync wires Ed sources, dedup | unit+integration | `uv run pytest tests/unit/test_sync_tasks.py -x -k "deadline"` | No (Wave 0) |
| INFRA-02c | Module sync runs daily | integration | `uv run pytest tests/integration/test_sync_engine.py -x -k "modules"` | No (Wave 0) |
| INFRA-02d | Outline sync runs per-semester | unit+integration | `uv run pytest tests/unit/test_sync_tasks.py -x -k "outline"` | No (Wave 0) |
| INFRA-02e | Sync history tracking (last run, success/fail, records updated) | integration | `uv run pytest tests/integration/test_sync_engine.py -x -k "history"` | No (Wave 0) |

### Sampling Rate
- **Per task commit:** `uv run pytest tests/unit/ -x --timeout=30`
- **Per wave merge:** `uv run pytest tests/ -x --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/models/sync_history.py` -- SyncHistory ORM model
- [ ] `supabase/migrations/00000000000003_sync_history.sql` -- sync_history table migration
- [ ] `tests/unit/test_sync_tasks.py` -- unit tests for sync task wiring logic
- [ ] Fix `tests/integration/test_sync_engine.py` -- update User->Profile, password->JWT

## Sources

### Primary (HIGH confidence)
- `src/sync/engine.py` -- existing APScheduler lifespan with 5 jobs
- `src/sync/tasks.py` -- existing grade/deadline/module sync implementation (~600 lines)
- `src/adapters/ed_discussion.py` -- EdDiscussionAdapter.get_threads() API
- `src/adapters/ed_lessons.py` -- EdLessonsAdapter.get_lessons() returns `tuple[list, list]`
- `src/parsers/usyd_outline.py` -- UnitOutlineParser.fetch_and_parse() API
- `src/services/deadline.py` -- DeadlineService.aggregate_and_dedup() signature: `(course, canvas_assignments, ed_lessons_data, ed_discussion_texts)`
- `src/models/unit_outline.py` -- UnitOutline ORM model (already exists)
- `src/config.py` -- Settings with sync interval configs
- `supabase/migrations/00000000000001_initial_schema.sql` -- confirmed no sync_history table exists
- `tests/conftest.py` -- test infrastructure with session-scoped engine, transaction rollback
- `tests/integration/conftest.py` -- Phase 15 JWT auth pattern for integration tests
- `pyproject.toml` -- APScheduler 3.11, all deps already installed

### Secondary (MEDIUM confidence)
- APScheduler 3.11 docs -- CronTrigger API with month/day/timezone parameters

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed and in use
- Architecture: HIGH -- existing code patterns are clear and well-established
- Pitfalls: HIGH -- identified from direct code reading, not speculation
- Ed source wiring: HIGH -- exact gap locations identified (tasks.py lines 244-249)
- sync_history design: MEDIUM -- new table, but follows established migration pattern

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable codebase, no fast-moving dependencies)
