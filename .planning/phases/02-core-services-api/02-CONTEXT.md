# Phase 2: Core Services & API - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Compose Phase 1 adapters into user-facing business services (GPA engine, deadline aggregation, course materials, Ed intelligence) and expose them via REST API. Implement background sync engine to keep data fresh. Handle token expiration warnings.

Requirements: GPA-01, GPA-02, GPA-03, GPA-04, GPA-05, DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02, INFRA-02, PLAT-04

</domain>

<decisions>
## Implementation Decisions

### GPA/WAM Calculation Logic
- Display BOTH WAM (weighted average mark) and GPA (7-point scale) simultaneously
- WAM formula: Σ(credit_points × mark) / Σ(credit_points), using raw percentage marks
- GPA 7-point scale mapping uses USYD official thresholds: HD≥85→7, D≥75→6, CR≥65→5, P≥50→4, F<50→0
- Incomplete courses: only calculate from published grades, show "X% assessed" indicator
- Include historical semesters in cumulative WAM/GPA; provide per-semester filtering view
- Per-semester WAM/GPA trend data for frontend trend chart (each semester WAM + cumulative WAM)
- Display granularity: course-level summary + expandable per-assessment breakdown (score + weight)
- Assessment weight source priority: Unit Outline first → Canvas assignment_groups fallback (Phase 1 three-level fallback chain)

### What-if Simulator
- Input granularity: per-assessment (user inputs hypothetical score for each ungraded assessment)
- **Persistent scenarios**: new `whatif_scenarios` table (user_id, name, scores_json JSONB, result_wam, result_gpa, created_at)
- Users can name, save, and compare multiple What-if scenarios
- API: POST /api/v1/gpa/what-if (create scenario), GET /api/v1/gpa/what-if (list scenarios)

### Target GPA Path Planner
- Returns minimum required score **per individual assessment** (not per-course average)
- Uniform distribution as default mode; smart allocation (prioritize high-credit-point courses) as optional mode
- When target is unreachable: clearly state "target unreachable" AND calculate/display "maximum achievable WAM" as alternative
- GPA target stored in User table: target_wam (Float|None), target_gpa (Float|None) — single target per user

### Sync Engine Architecture
- Framework: APScheduler 4.x (async) embedded in FastAPI startup — mature, supports cron/interval triggers, built-in retry and task skip. Architecture designed with clean interface for future migration to distributed queue (Celery/Redis) when scaling
- Scope: per-user sync — each user has independent sync tasks using their own API tokens. New user registration triggers immediate first sync
- Startup behavior: trigger full sync for all active users on service start, then scheduled intervals
- Failure handling: retry 3× (exponential backoff), then mark user/platform as "degraded" — next scheduled cycle retries
- Concurrency: parallel by platform (Canvas sync and Ed sync run concurrently for same user), but same-platform sync never overlaps
- Manual trigger: POST /api/v1/sync/trigger with throttle protection (max 1 per 5 minutes per user)
- Sync status: API returns last_synced_at and status (success/failed/syncing) per data source — frontend shows "Last synced: 5 min ago"
- Data write strategy: Upsert (INSERT ON CONFLICT UPDATE) — incremental, no data wipe
- First sync (new user): full sync with progress feedback — API returns syncing/complete status, frontend shows "Fetching your course data..."
- Observability: detailed metrics — API call count, average response time, rate limit remaining, data change volume (diff), logged via structlog
- Intervals configurable via environment variables (defaults from TRD: grades 15min, deadlines 1h, modules daily, Unit Outline per semester)
- Every API response includes last_synced_at field for data freshness awareness
- Code location: `src/sync/` as independent top-level module (not under services/)

### Token Expiration Detection (PLAT-04)
- Detect during sync: if API returns 401/403, mark token as "expired/invalid"
- Expose warning status via API for frontend to show re-authentication prompt
- No separate proactive check — rely on sync cycle detection

### Deadline Aggregation & Deduplication
- Hash: SHA-256(course_code + normalize(title) + due_date) — title normalization: lowercase, strip whitespace, remove punctuation
- Near-duplicate handling: exact hash dedup first, then Levenshtein distance for fuzzy matching (same course + similar title + same due date) — auto-merge near-duplicates
- Source priority for merged deadlines: **most recently updated source** takes precedence for time/details
- All sources tracked: each deadline tagged with origin platforms [Canvas] [Ed Lessons] [Ed Discussion]
- Expired deadlines: retained in database, marked as "past_due" — API defaults to future-only, supports ?include_past=true
- Conflict detection: API marks dates with 2+ deadlines as "conflict day" — frontend can highlight
- Urgency auto-grading: urgent(≤24h), warning(24-72h), normal(>72h) — calculated server-side, included in API response
- Default sort: due_at ascending (most urgent first), supports ?sort=due_at&order=asc|desc
- Multi-dimensional filtering: ?course_code=COMP2017&urgency=urgent&from=2026-03-16&to=2026-04-01
- Ed Discussion deadline extraction: Phase 2 uses regex rules for common patterns ("due by Oct 15", "deadline: Friday 5pm"); Phase 4 AI enhances with NLP for complex/ambiguous cases
- Ed Lessons: use official fields (close_at/lock_at/due_at)

### Course Materials & Search
- Unified view: top-level grouped by course, each course merges Canvas Modules and Ed Lessons into unified "folder" list with source tags
- AI folder descriptions: Claude API (Haiku model) generates one-sentence descriptions during sync; cached in database
- AI generation timing: after each module sync, generate descriptions for new/changed folders
- AI error handling: fallback to rule-based description ("Contains 12 files, mainly PDF and PPT") when Claude API fails/times out
- AI cost control: per-user daily limit (e.g., 100 calls/day), excess degrades to rule-based
- Claude API Key: single server-side key in .env via pydantic-settings, shared by all users
- Search implementation: PostgreSQL tsvector — extend existing pattern to ModuleItem and Lesson tables
- Search scope: file names, module titles, course names + Ed Lessons text content (NOT PDF/PPT content — deferred to Phase 4 AI Q&A)
- Search results: return matching file name, course, file type, and context snippet with highlighted keywords (Google-style)

### Ed Discussion Intelligence (Rule-based)
- Filter criteria: is_endorsed=true OR has_staff_answer=true (per TRD)
- Display: title, category, content summary (first 200 chars), endorsement status, link to original Ed post
- Phase 4 adds AI extraction for complex intelligence (exam hints, rubric details, deadline changes)

### REST API Design
- GPA routes (hierarchical):
  - GET /api/v1/gpa/summary — WAM + GPA + per-course overview
  - GET /api/v1/gpa/courses/{id} — single course detail with assessment breakdown
  - POST /api/v1/gpa/what-if — create What-if scenario
  - GET /api/v1/gpa/what-if — list saved scenarios
  - POST /api/v1/gpa/target — calculate target path (uniform or smart allocation)
  - GET /api/v1/gpa/trend — per-semester WAM/GPA trend
- Deadline routes (independent resource):
  - GET /api/v1/deadlines — unified list with multi-dimensional filters
  - GET /api/v1/deadlines/{id} — single deadline detail
  - GET /api/v1/deadlines/conflicts — conflict day list
- Course material routes (hierarchical):
  - GET /api/v1/courses/{id}/materials — folder list with AI descriptions
  - GET /api/v1/courses/{id}/materials/{folder_id} — file list in folder
  - GET /api/v1/search — cross-course keyword search
- Sync routes:
  - POST /api/v1/sync/trigger — manual sync trigger (throttled)
  - GET /api/v1/sync/status — per-source sync status
- Ed intelligence routes:
  - GET /api/v1/courses/{id}/discussions — high-value posts (endorsed/staff-answered)
- Pagination: cursor-based (existing PaginationMeta schema)
- Response wrapper: existing SuccessResponse/ErrorResponse from Phase 1

### Service Layer Architecture
- Organization: by functional domain — GPAService, DeadlineService, CourseMaterialService, EdIntelligenceService
- SyncService in `src/sync/` (separate from services/)
- Dependency injection: FastAPI Depends() — consistent with Phase 1 pattern
- Services call adapters for data, write to database, expose via routes

### Testing Strategy (Phase 2 Specific)
- GPA calculation: property-based testing with Hypothesis (WAM always 0-100, GPA always 0-7, Decimal precision)
- Deduplication: scenario-driven tests — same assignment in Canvas+Ed, slight title differences, same course/day/different assignments, exact duplicates
- Sync engine: real API integration tests (continue Phase 1 strategy — real tokens, real PostgreSQL)
- All tests use real I/O, no mocks (Phase 1 global decision)

### Claude's Discretion
- Exact APScheduler configuration and task registration
- Levenshtein distance threshold for fuzzy dedup
- Claude API prompt template for folder descriptions
- Exact tsvector column configuration for new tables
- Internal service method signatures and return types
- Alembic migration strategy for new tables (WhatIfScenario, User table changes)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### GPA/WAM Calculation
- `docs/UniBoard_TRD_v2.md` §3 — System architecture (GPAService definition)
- `docs/UniBoard_TRD_v2.md` §4 — Data model (Grade, Course tables with credit_points, marks)
- `docs/UniBoard_BRD_v2.md` — GPA/WAM requirements, What-if simulator, target planner specs

### Sync Engine
- `docs/UniBoard_TRD_v2.md` §3 — Sync frequencies (grades 15min, deadlines 1h, modules daily)
- `docs/UniBoard_TRD_v2.md` §15 — Database management (connection pooling, async sessions)

### Deadline Aggregation
- `docs/UniBoard_TRD_v2.md` §2 — MCP tool specs (deadline data structures)
- `docs/UniBoard_TRD_v2.md` §4 — UnifiedDeadline table schema

### REST API
- `docs/UniBoard_TRD_v2.md` §12 — REST API specification (endpoint patterns, response format)
- `docs/UniBoard_TRD_v2.md` §14 — Error handling patterns

### Platform Adapters (Phase 1 output — services will call these)
- `src/adapters/canvas.py` — Canvas adapter (courses, grades, assignments, modules)
- `src/adapters/ed_discussion.py` — Ed Discussion adapter (threads, posts)
- `src/adapters/ed_lessons.py` — Ed Lessons adapter (lessons, slides, assignments)
- `src/parsers/usyd_outline.py` — Unit Outline HTML parser (assessment weights)
- `src/adapters/resilience.py` — CircuitBreaker, CanvasRateLimiter, RetryConfig

### Existing Infrastructure (Phase 1 output)
- `src/web/routes/` — Existing routes (auth, health, users) for pattern reference
- `src/schemas/common.py` — SuccessResponse, ErrorResponse, PaginationMeta, exception hierarchy
- `src/web/deps.py` — get_session, get_current_user, get_encryption, get_request_meta
- `src/models/` — All 11 ORM models (Course, Grade, Deadline, Module, etc.)
- `src/services/course_linking.py` — Course cross-platform linking utility

### Research & Stack
- `.planning/research/STACK.md` — Library versions, httpx choice, dependency pinning
- `.planning/research/PITFALLS.md` — Known pitfalls for Canvas/Ed/async patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/adapters/canvas.py` — CanvasAdapter with rate limiting, pagination, circuit breaker. Services will call its methods (get_courses, get_grades, get_assignments, get_modules)
- `src/adapters/ed_discussion.py` — EdDiscussionAdapter with defensive Pydantic parsing. Services will call get_threads, get_thread_detail
- `src/adapters/ed_lessons.py` — EdLessonsAdapter for lesson content. Services will call get_lessons, get_slides
- `src/parsers/usyd_outline.py` — UnitOutlineParser with weight-sum validation
- `src/adapters/resilience.py` — CircuitBreaker, CanvasRateLimiter, RetryConfig — reuse for sync engine error handling
- `src/services/course_linking.py` — link_courses() for cross-platform course matching
- `src/schemas/common.py` — SuccessResponse[T], ErrorResponse, PaginationMeta, UniboardError exception hierarchy
- `src/web/deps.py` — get_session, get_current_user dependency injection pattern
- `src/models/` — All 11 ORM models with UUIDMixin, TimestampMixin

### Established Patterns
- FastAPI Depends() for dependency injection (routes → deps → services)
- Pydantic v2 schemas with ConfigDict(from_attributes=True)
- async SQLAlchemy sessions via get_session()
- structlog JSON logging for all external calls
- AES-256-GCM token encryption via TokenEncryption class

### Integration Points
- New services import and call existing adapters
- New routes register on existing FastAPI app (src/web/main.py)
- Sync engine starts as FastAPI lifespan event
- New Alembic migration for WhatIfScenario table + User table changes (target_wam, target_gpa)
- tsvector columns need to be added to ModuleItem and Lesson models

</code_context>

<specifics>
## Specific Ideas

- Ed Discussion has NO official deadline fields — teachers describe deadlines in post text. Phase 2 uses regex extraction for common patterns; Phase 4 AI handles complex cases
- Ed Lessons has official close_at/lock_at/due_at fields — use these directly
- AiStudyMate integration (classmate's multimodal AI) is post-v1: user will first build a finished product to demonstrate, then negotiate for source code access
- Sync engine should be designed with clean interfaces for future migration to Celery/Redis when user base grows
- GPA calculation should use Decimal type for precision (avoid float rounding issues)
- Hypothesis property testing for GPA to ensure mathematical invariants hold

</specifics>

<deferred>
## Deferred Ideas

- AiStudyMate multimodal AI integration — post-v1 (build finished product first → negotiate with classmate → get source code → integrate)
- Ed Discussion NLP deadline extraction — Phase 4 AI enhancement (Phase 2 uses regex rules)
- PDF/PPT content indexing for search — Phase 4 AI Q&A
- AI-enhanced high-value post extraction (exam hints, rubric, deadline changes) — Phase 4
- User-customizable GPA grade thresholds (per-faculty differences) — future enhancement
- Distributed sync with Celery/Redis — when scaling beyond single instance

</deferred>

---

*Phase: 02-core-services-api*
*Context gathered: 2026-03-16*
