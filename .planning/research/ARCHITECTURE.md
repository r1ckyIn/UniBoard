# Architecture Patterns

**Domain:** University Academic Dashboard with LMS Integration (GPA Maximization)
**Researched:** 2026-03-16

## Recommended Architecture

UniBoard's architecture is a **sync-and-serve data aggregation system** -- a pattern common in dashboard products that pull from multiple upstream APIs with varying rate limits and data freshness requirements. The system collects data from Canvas LMS, Ed Discussion, Ed Lessons, and USYD Unit Outline HTML pages, normalizes it into a local PostgreSQL store, and serves it to both a web dashboard (Next.js) and an MCP server (Claude Desktop).

The TRD v2.5 already defines a solid dual-layer architecture. This document validates, refines, and annotates it with build-order implications for roadmap phasing.

```
                    +--------------------------+
                    |     User Entry Points    |
                    |  Browser / Claude / Email |
                    +-----------+--------------+
                                |
               +----------------+----------------+
               |                                 |
      +--------v--------+            +----------v----------+
      |   Web API Layer  |            |   MCP Server Layer   |
      |   (FastAPI REST) |            |   (stdio/SSE)        |
      +--------+---------+            +----------+-----------+
               |                                 |
               +----------------+----------------+
                                |
                    +-----------v-----------+
                    |    Service Layer       |
                    |  (Shared Business Logic)|
                    |                        |
                    | GPAService             |
                    | UnitOutlineService     |
                    | DeadlineService        |
                    | CourseMaterialService  |
                    | IntelligenceService    |
                    | RiskAlertService       |
                    | NotificationService    |
                    | AIEngine               |
                    +-----------+-----------+
                                |
                    +-----------v-----------+
                    | Platform Adapter Layer |
                    |  (Abstract interfaces) |
                    |                        |
                    | LMSAdapter (Canvas)    |
                    | DiscussionAdapter (Ed) |
                    | LessonAdapter (Ed)     |
                    | UnitOutlineParser      |
                    +-----------+-----------+
                                |
               +----------------+----------------+
               |                |                |
      +--------v------+ +------v------+ +-------v--------+
      | Canvas LMS API| | Ed API      | | USYD HTML      |
      | (sydney.edu)  | | (edstem.org)| | (sydney.edu.au)|
      +---------------+ +-------------+ +----------------+

                    +-----------+-----------+
                    |     Data Layer         |
                    |  PostgreSQL (Docker)   |
                    |  + File Cache (local)  |
                    +-----------------------+

                    +-----------+-----------+
                    |   Sync Engine          |
                    |  (Background Tasks)    |
                    |  Grades: 15min         |
                    |  Deadlines: 1h         |
                    |  Modules/Lessons: 24h  |
                    |  UnitOutline: semester  |
                    +-----------------------+
```

### Component Boundaries

| Component | Responsibility | Communicates With | I/O Boundary |
|-----------|---------------|-------------------|--------------|
| **Web API Layer** (FastAPI) | REST endpoints, JWT auth, request validation, response formatting | Service Layer, Auth middleware | HTTP in, JSON out |
| **MCP Server Layer** | MCP tool definitions, stdio/SSE transport for Claude Desktop | Service Layer (same instances) | MCP protocol in/out |
| **Service Layer** | All business logic: GPA calculation, deadline aggregation, AI evaluation, digest generation | Adapter Layer (data fetch), Data Layer (read/write), AIEngine (LLM calls) | Internal function calls |
| **Platform Adapter Layer** | Abstract interfaces to external APIs; handle pagination, rate limiting, auth headers | External APIs (Canvas, Ed, USYD HTML) | HTTPS out, structured data in |
| **Data Layer** (PostgreSQL) | Persistent storage: users, courses, grades, threads, outlines, deadlines, push records | Accessed by Service Layer via SQLAlchemy async ORM | SQL queries |
| **Sync Engine** | Periodic background jobs that pull fresh data from adapters into DB | Adapter Layer (fetch), Data Layer (upsert) | Timer-triggered |
| **AIEngine** | LLM-powered evaluation (thread relevance, digest generation, material summarization) | Anthropic API (Claude) | HTTPS out |
| **Frontend** (Next.js) | SPA dashboard UI, client-side routing, data visualization | Web API Layer via HTTP | Fetch API |

### Data Flow

**Primary data flow (sync cycle):**

```
External APIs ──[Adapter fetches]──> Raw Data
  ──[Service Layer normalizes/deduplicates]──> PostgreSQL
  ──[Service Layer reads + computes]──> API Response
  ──[Frontend renders]──> User sees dashboard
```

**Detailed flow for key operations:**

1. **Grade Sync (every 15 min):**
   ```
   SyncEngine timer fires
     -> GPAService.sync_grades()
       -> CanvasAdapter.get_grades(course_id) for each course
       -> Compare with existing Grade rows (graded_at timestamp)
       -> Upsert new/changed grades to PostgreSQL
       -> GPAService.recalculate_wam() if grades changed
       -> RiskAlertService.check_gpa_risk() if deviation detected
   ```

2. **Deadline Aggregation (every 1h):**
   ```
   SyncEngine timer fires
     -> DeadlineService.sync_all_deadlines()
       -> CanvasAdapter.get_assignments_with_dates() -> deadlines from Canvas
       -> EdLessonsAdapter.get_lessons() -> deadlines from Ed Lessons (due_at field)
       -> EdDiscussionAdapter.get_threads() + AIEngine -> deadline mentions from Ed posts
       -> DeadlineService._merge_and_deduplicate() (SHA-256 dedup_key)
       -> Upsert to UnifiedDeadline table
       -> NotificationService.schedule_reminders() for new deadlines
   ```

3. **GPA What-if Prediction (on-demand):**
   ```
   User adjusts sliders in frontend
     -> POST /gpa/predict with what_if_scores[]
       -> GPAService.predict_gpa()
         -> Read current Grade rows from DB
         -> Merge with hypothetical scores
         -> Apply UnitOutline weights (primary) or Canvas weights (fallback)
         -> Calculate projected WAM using USYD formula
       -> Return prediction to frontend immediately (no sync needed)
   ```

4. **Unit Outline Fetch (once per semester):**
   ```
   First sync or manual trigger
     -> UnitOutlineService.get_assessment_structure(course_id)
       -> CanvasAdapter.get_tab_url(course_id, "Unit Outline")
       -> HTTP GET USYD HTML page (no auth needed)
       -> BeautifulSoup4 parse #assessment-table
       -> Store parsed assessments + raw HTML in UnitOutline table
       -> Cache entire semester (won't refetch unless manually triggered)
   ```

5. **MCP Tool Call (on-demand from Claude Desktop):**
   ```
   Claude Desktop sends MCP tool call (e.g., "canvas_list_courses")
     -> MCP Server receives via stdio
       -> Routes to same Service Layer used by Web API
         -> Service reads from DB (cached data) or Adapter (fresh fetch)
       -> Returns structured JSON via MCP protocol
   ```

## Patterns to Follow

### Pattern 1: Adapter Abstraction (Strategy Pattern)

**What:** Abstract interfaces (LMSAdapter, DiscussionAdapter, LessonAdapter) with concrete implementations per platform. Each adapter handles its own auth, pagination, rate limiting, and data mapping.

**When:** Always -- this is the core extensibility mechanism. If UniBoard expands to Moodle, Blackboard, or other Ed-like platforms, only new adapter implementations are needed.

**Why it matters for build order:** Adapters are the foundation. Without them, no service can function. Build adapters first, services second.

```python
# Abstract interface -- defined once
class LMSAdapter(ABC):
    @abstractmethod
    async def get_courses(self) -> list[Course]: ...
    @abstractmethod
    async def get_grades(self, course_id: str) -> list[Grade]: ...

# Concrete implementation -- Canvas-specific
class CanvasAdapter(LMSAdapter):
    async def get_grades(self, course_id: str) -> list[Grade]:
        # Handle Canvas pagination (Link header)
        # Handle rate limiting (700 req/10s)
        # Map Canvas enrollment.grades -> internal Grade model
        ...
```

### Pattern 2: Shared Service Layer (Facade Pattern)

**What:** Both the Web API (FastAPI routes) and MCP Server call into the same Service Layer instances. No duplicate business logic.

**When:** Always. This is a key architectural decision already made in the TRD.

**Why it matters:** Ensures consistency between MCP and Web responses. A grade calculation or deadline aggregation works identically regardless of entry point.

```python
# Service is created once, injected into both layers
gpa_service = GPAService(lms=canvas_adapter, outline_service=outline_service)

# FastAPI route uses it
@router.get("/gpa")
async def get_gpa(user: User = Depends(get_current_user)):
    return await gpa_service.get_current_gpa(user.id)

# MCP tool uses the same instance
@mcp_server.tool()
async def canvas_get_grades(course_id: str):
    return await gpa_service.get_course_grades(course_id)
```

### Pattern 3: Sync-and-Serve with Stale Cache Fallback

**What:** Background sync jobs populate the database on fixed intervals. API requests serve from the database, never directly from upstream APIs (except on-demand triggers). When upstream APIs fail, serve stale cached data with an `is_stale` flag.

**When:** For all data that has defined sync frequencies (grades, deadlines, discussions, modules).

**Why it matters:** Decouples API response time from upstream latency. Users get instant responses. Upstream outages become graceful degradation, not hard failures.

```python
class DegradedResponse(Generic[T]):
    data: T
    is_stale: bool
    stale_since: datetime | None
    source: Literal["live", "cache"]
```

### Pattern 4: Circuit Breaker per Upstream

**What:** Each external API (Canvas, Ed) has an independent circuit breaker. After 5 consecutive failures, the breaker opens for 60 seconds, routing all requests directly to cache. One failing API does not cascade to the other.

**When:** All adapter-level external calls.

**Why it matters:** Canvas can go down without affecting Ed data, and vice versa. Prevents thundering herd on a recovering upstream.

### Pattern 5: Deduplication via Content Fingerprint

**What:** SHA-256 hash of `(source_type, source_id, content)` stored in PushRecord table. Before pushing any notification/digest item, check if fingerprint exists. For deadlines, use normalized `(course + assignment_name)` as dedup_key.

**When:** All notification/push operations and deadline merging across sources.

**Why it matters:** Three sources (Canvas, Ed Lessons, Ed Discussion) may report the same deadline. Without dedup, users get triple notifications.

### Pattern 6: Weight Source Priority Chain

**What:** Assessment weights are fetched with a clear priority: Unit Outline (authoritative USYD source) > Canvas assignment_groups (teacher-configured fallback). The `weight_source` field in API responses tells the UI which source was used.

**When:** Any GPA calculation or assessment weight display.

**Why it matters:** Unit Outline is the official grading contract. Canvas assignment_groups may be incomplete or inconsistent with the official outline.

### Pattern 7: Dependency Injection via Constructor

**What:** Services receive their dependencies (adapters, other services) via constructor injection. No global singletons. FastAPI's `Depends()` system handles DI at the route level.

**When:** All service and adapter instantiation.

**Why it matters:** Testability -- swap CanvasAdapter with MockCanvasAdapter in tests. Configurability -- different adapter instances per user (each user has their own API tokens).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Direct API Calls from Routes

**What:** FastAPI routes calling Canvas/Ed APIs directly, bypassing the service and adapter layers.

**Why bad:** Duplicates logic between Web API and MCP. Makes testing impossible without live API access. Loses caching/circuit-breaker benefits.

**Instead:** All external API access goes through Adapter -> Service -> Route/MCP Tool.

### Anti-Pattern 2: User-Scoped Sync in Request Path

**What:** Triggering a full data sync when a user loads the dashboard (request-time sync).

**Why bad:** Canvas API has rate limits (70 req/10s per token). A full sync can take 10-30 seconds. Users would see loading spinners on every page load. Multiple concurrent users would overwhelm rate limits.

**Instead:** Background sync engine runs on fixed schedules. API requests serve cached data. Manual sync triggers return 202 Accepted and process asynchronously.

### Anti-Pattern 3: Monolithic Adapter

**What:** A single adapter class that handles Canvas, Ed Discussion, and Ed Lessons all together.

**Why bad:** Violates SRP. Makes it impossible to add new platforms. Different APIs have different auth, rate limits, and data shapes.

**Instead:** One adapter per API surface: CanvasAdapter, EdDiscussionAdapter, EdLessonsAdapter, plus UnitOutlineParser as a separate parser (not an adapter -- it's HTTP GET + HTML parsing, not an authenticated API).

### Anti-Pattern 4: AI for Everything

**What:** Using LLM calls for data that can be deterministically extracted (assessment weights, lesson due dates, thread endorsement status).

**Why bad:** Slow (100ms+ per call), expensive (API costs), unreliable (hallucination risk), non-reproducible. The TRD correctly separates deterministic parsing from AI tasks.

**Instead:** Use AI only for: Ed Discussion thread relevance scoring, digest narrative generation, material summarization, and question answering. Use deterministic parsing for: Unit Outline weights, Canvas grades, Ed Lessons due dates, thread metadata (is_endorsed, is_staff_answered).

### Anti-Pattern 5: Storing Raw API Responses as Primary Data

**What:** Saving entire Canvas/Ed API JSON blobs and querying them at read time.

**Why bad:** Couples your schema to upstream API changes. Makes indexing and querying slow. PostgreSQL JSON queries are slower than columnar queries for structured data.

**Instead:** Map upstream data to normalized internal models (Grade, DiscussionThread, UnifiedDeadline, etc.) at sync time. Store raw HTML only for UnitOutline (debugging fallback).

## Scalability Considerations

| Concern | At 1 user (MVP) | At 100 users | At 1000+ users |
|---------|-----------------|--------------|----------------|
| **Sync load** | Sequential per-course sync, trivial | Per-user sync jobs, stagger scheduling to spread API load | Need job queue (PGQueuer or similar) to manage concurrency; may hit Canvas rate limits across users |
| **Database** | Single Docker PostgreSQL, no optimization needed | Add indexes on (user_id, course_id), connection pool sufficient | Consider read replicas, RDS Proxy for connection management |
| **API rate limits** | Canvas 70 req/10s per token, no concern | Each user has own token, so limits are per-user, still fine | Aggregate USYD HTML scraping may need centralized throttling (1 req/s shared) |
| **Background jobs** | Simple asyncio.create_task() or APScheduler | APScheduler with PostgreSQL job store | Dedicated task queue (Celery, PGQueuer, or EventBridge + Lambda for serverless) |
| **Frontend** | Static Next.js, no scaling concern | Same -- static export served from disk | Move to S3 + CloudFront for CDN |
| **AI costs** | Negligible for single user | ~100 thread evaluations/day * 100 users = 10K calls/day, budget-relevant | Batch processing, caching AI results, consider smaller models |

For MVP (local Docker, single user): asyncio tasks for background sync are sufficient. No need for Celery, Redis, or external job queues. Keep it simple.

## Build Order (Dependencies Between Components)

The architecture has clear dependency chains that dictate build order:

```
Phase 1: Foundation
  Data Models (SQLAlchemy) ──> Alembic migrations ──> Database ready
  Adapter Interfaces (ABC) ──> No external deps, pure Python
  Auth (JWT + bcrypt) ──> User registration/login works

Phase 2: Data Acquisition
  CanvasAdapter (concrete) ──> Requires: Adapter interfaces + Canvas API token
  EdDiscussionAdapter ──> Requires: Adapter interfaces + Ed API token
  EdLessonsAdapter ──> Requires: Adapter interfaces + Ed API token
  UnitOutlineParser ──> Requires: aiohttp + BeautifulSoup4 (no auth)
  Note: All 4 adapters are independent of each other, can be built in parallel

Phase 3: Core Services
  UnitOutlineService ──> Requires: CanvasAdapter (for tab URL) + UnitOutlineParser
  GPAService ──> Requires: CanvasAdapter (grades) + UnitOutlineService (weights)
  DeadlineService ──> Requires: CanvasAdapter + EdLessonsAdapter + EdDiscussionAdapter + UnitOutlineService
  CourseMaterialService ──> Requires: CanvasAdapter (modules) + EdLessonsAdapter (lessons)
  Note: GPAService and CourseMaterialService are independent of each other

Phase 4: Sync Engine
  Background sync jobs ──> Requires: All adapters + all services + database
  Circuit breaker ──> Requires: Adapter layer functional
  Dedup engine ──> Requires: PushRecord table + sync jobs

Phase 5: API Layer
  FastAPI routes ──> Requires: Service layer + Auth
  MCP Server tools ──> Requires: Service layer
  Note: Web API and MCP can be built in parallel since they share the service layer

Phase 6: Intelligence Layer
  AIEngine (Claude integration) ──> Requires: Anthropic API key
  IntelligenceService (thread scoring) ──> Requires: AIEngine + EdDiscussionAdapter
  RiskAlertService ──> Requires: GPAService + DeadlineService
  NotificationService ──> Requires: DeadlineService + RiskAlertService
  Digest generation ──> Requires: IntelligenceService + all services

Phase 7: Frontend
  Layout + auth pages ──> Requires: Auth API endpoints
  Dashboard (GPA overview) ──> Requires: GPA + courses endpoints
  Deadline timeline ──> Requires: Deadline endpoints
  Course detail pages ──> Requires: Course + materials + discussions endpoints
  What-if predictor ──> Requires: GPA predict endpoint
  Digest/intelligence pages ──> Requires: Intelligence endpoints
```

**Critical path:** Models -> Adapters -> Services -> Sync -> API -> Frontend. The intelligence layer (AI) is optional for MVP -- the system works with rule-based filtering alone (is_endorsed + is_staff_answered).

**Parallelization opportunities:**
- All 4 adapters can be built simultaneously (no interdependencies)
- FastAPI routes and MCP tools can be built simultaneously
- Frontend pages can be built in parallel once the API is up
- AI features can be deferred entirely without blocking the core flow

## Key Architectural Decisions (Validated)

| Decision | Status | Assessment |
|----------|--------|------------|
| Shared service layer between Web API and MCP | Validated | Correct -- avoids logic duplication, most important architectural decision |
| Sync-based (not real-time) data model | Validated | Correct for this domain -- LMS data changes infrequently, rate limits preclude real-time polling |
| PostgreSQL for everything (cache, jobs, search) | Validated for MVP | Simplifies ops. tsvector handles search adequately. For 100+ users, evaluate adding Redis for session cache |
| Abstract adapter interfaces | Validated | Good investment even for single-university MVP -- makes testing much easier |
| Local Docker deployment for MVP | Validated | Right call -- cloud deployment (Lambda + RDS + CDK) adds weeks of complexity |
| Simple JWT + bcrypt over Cognito for MVP | Validated | Correct -- Cognito integration can wait until cloud deployment phase |
| Unit Outline as primary weight source | Validated | USYD-specific but correct -- Unit Outline is the official grading contract, Canvas may lag behind |
| AI quality gate (F1 < 75% fallback to rules) | Validated | Good safety net -- ensures the system is useful even if AI evaluation quality drifts |

## Sources

- UniBoard TRD v2.5 (primary architecture reference) -- `/docs/UniBoard_TRD_v2.md`
- UniBoard BRD v2.6 (business requirements) -- `/docs/UniBoard_BRD_v2.md`
- UniBoard Frontend Design Brief -- `/docs/frontend_brief.md`
- [Canvas LMS REST API Documentation](https://www.canvas.instructure.com/doc/api/)
- [canvasapi Python wrapper](https://ucfopen.github.io/canvasapi/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [MCP Architecture](https://modelcontextprotocol.io/docs/develop/build-client)
- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [FastAPI Production Patterns 2025](https://orchestrator.dev/blog/2025-1-30-fastapi-production-patterns/)
- [PGQueuer - PostgreSQL job queue](https://pypi.org/project/pgqueuer/)
- [asyncpg documentation](https://www.tigerdata.com/blog/how-to-build-applications-with-asyncpg-and-postgresql)
