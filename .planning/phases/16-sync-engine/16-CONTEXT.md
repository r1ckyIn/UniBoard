# Phase 16: Sync Engine - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Automated background data synchronization that keeps all data fresh. Grades sync every 15 minutes, deadlines hourly (3-source aggregation), modules daily, Unit Outlines per semester. Sync status is trackable via a dedicated sync_history table. This phase fills the existing `src/sync/` skeleton with hardened adapter integration and missing tasks.

Requirements: INFRA-02

</domain>

<decisions>
## Implementation Decisions

### Deadline Data Sources
- **Three-source full aggregation**: Canvas assignments + Ed Lessons (due_at) + Ed Discussion (deadline mentions) — matches TRD spec
- `DeadlineService.aggregate_and_dedup()` already supports 3-source input with SHA-256 dedup
- Current `sync_all_deadlines()` passes empty lists for Ed sources — wire up Ed adapters
- Ed Discussion adapter calls `get_threads()` filtered by category; extract deadline-like dates from thread metadata
- Ed Lessons adapter calls `get_lessons()` and uses `due_at` field for deadline extraction

### Unit Outline Sync Strategy
- **Semester-initial + manual trigger**: CronTrigger fires at semester start (early March + early August) to auto-scrape
- Users can also trigger outline sync manually via POST /sync/trigger with `scope=outline`
- UnitOutlineParser (Phase 14) handles the HTML scraping and weight-sum validation
- Store parsed assessment weights in `unit_outlines` table (already exists)
- Outline rarely changes — no need for frequent re-scraping

### Sync Status Tracking
- **New `sync_history` table** instead of Profile field-only approach
- Schema: `id, user_id, domain (grades|deadlines|modules|outlines), status (success|failed|partial), records_updated, error_message, started_at, completed_at`
- Profile fields (`canvas_sync_status`, `ed_sync_status`, `last_synced_at`) remain for quick status checks in API
- sync_history provides audit trail for debugging and user-facing "last synced" detail
- Keep retention: last 30 days or 100 records per user per domain

### Sync Testing Strategy
- **Mock adapter + real DB** — consistent with Phase 15 integration test pattern
- Mock external API return values (adapter layer), use real SQLAlchemy async session
- Verify upsert correctness: grades update on re-sync, deadlines dedup via SHA-256, modules items refresh
- Test failure modes: TokenInvalidError stops retry, transient errors retry 3x, circuit breaker propagation
- Use `UNIBOARD_DISABLE_SYNC=true` env var (already exists) to prevent scheduler in test environment

### Claude's Discretion
- sync_history table migration details (column types, indexes)
- Exact CronTrigger schedule for semester-initial outline sync (March 1st vs first Monday)
- Whether to run initial outline sync on app startup for new users
- Concurrency limit for parallel user syncs (currently sequential per-user)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Sync Architecture
- `docs/UniBoard_TRD_v2.md` §3 — System architecture, sync engine placement
- `docs/UniBoard_TRD_v2.md` §15 — Database management, migration strategy
- `docs/UniBoard_TRD_v2.md` §18 — Local development environment

### Sync Frequencies & Data Model
- `docs/UniBoard_BRD_v2.md` — Business requirements for sync frequencies (grades 15min, deadlines 1h, modules daily, outline per semester)
- `docs/UniBoard_TRD_v2.md` §4 — Data model definitions (grades, deadlines, modules, unit_outlines tables)

### Existing Sync Code (read before planning)
- `src/sync/engine.py` — APScheduler lifespan, job registration (already has 5 jobs)
- `src/sync/tasks.py` — Grade/deadline/module sync + reminders + digest tasks (~600 lines, mostly implemented)
- `src/schemas/sync.py` — SyncSourceStatus, SyncStatusResponse, SyncTriggerResponse schemas
- `src/web/routes/sync.py` — POST /sync/trigger and GET /sync/status endpoints

### Adapters (Phase 14 — use these, don't reinvent)
- `src/adapters/canvas.py` — CanvasAdapter with rate limiter + circuit breaker
- `src/adapters/ed_discussion.py` — EdDiscussionAdapter with defensive parsing
- `src/adapters/ed_lessons.py` — EdLessonsAdapter for lesson content + assignments
- `src/parsers/usyd_outline.py` — UnitOutlineParser for HTML scraping + weight validation

### Deadline Aggregation
- `src/services/deadline.py` — DeadlineService.aggregate_and_dedup() with SHA-256 dedup logic

### Phase 15 Test Pattern
- `tests/integration/conftest.py` — JWT auth fixture, async client setup (reuse for sync tests)
- `tests/fixtures/seed_phase15.py` — Seed data factory pattern to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/sync/engine.py`: APScheduler lifespan with all 5 scheduled jobs — needs Unit Outline job added
- `src/sync/tasks.py`: Grade, deadline, module sync fully implemented — needs Ed source wiring + outline task
- `src/adapters/resilience.py`: CircuitBreaker + RetryConfig + execute_with_retry — use in sync tasks
- `DeadlineService.aggregate_and_dedup()`: 3-source deadline aggregation with SHA-256 dedup — pass Ed data instead of empty lists
- `src/security/encryption.py`: Token decryption already used in sync tasks

### Established Patterns
- Singleton `_sync_engine` for connection pool reuse across sync calls
- `_get_sync_session_factory()` creates sessions outside HTTP request context
- Per-user iteration with 3-retry + exponential backoff for transient failures
- `TokenInvalidError` immediately breaks retry loop (no point retrying auth failures)
- `pg_insert().on_conflict_do_update()` for upsert pattern (grades, modules, lessons)

### Integration Points
- `src/sync/engine.py` lifespan → `src/web/main.py` FastAPI app
- Profile model fields: `canvas_sync_status`, `ed_sync_status`, `last_synced_at` (quick status)
- New: `sync_history` table for detailed audit trail
- `UNIBOARD_DISABLE_SYNC=true` env var disables scheduler in tests

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The existing sync code provides a strong foundation; this phase focuses on closing gaps (Ed sources, outline sync, sync_history table, tests).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 16-sync-engine*
*Context gathered: 2026-03-27*
