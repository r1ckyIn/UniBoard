# Phase 15: Core Services & API Routes - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Business logic layer and REST API implementing the OpenAPI contracts defined in M1. Services read from Supabase PostgreSQL (populated by Phase 16 Sync Engine), perform calculations, and return data through FastAPI routes that match M1's mock Route Handler contracts exactly.

Requirements: GPA-01, GPA-02, GPA-03, GPA-04, GPA-05, DL-01, INTEL-01, INTEL-05, FILE-01, FILE-02

</domain>

<decisions>
## Implementation Decisions

### Data Freshness Model
- Services ONLY read from DB — no live adapter calls
- Phase 16 (Sync Engine) is responsible for adapter → DB population
- Phase 15 assumes data exists in DB; returns empty/default responses when no data
- This means Phase 15 can be developed and tested with seed data, independent of sync

### GPA Calculation Authority
- **Backend is authoritative** for WAM/GPA on Dashboard and Courses pages
- Frontend Predict page keeps its own WAM engine for instant what-if simulation (slider interaction needs immediate feedback, can't wait for API roundtrip)
- Both sides use the same formula: USYD WAM = Σ(mark × credit_points) / Σ(credit_points), GPA via step-function mapping (85+=4.0)
- Backend is the single source of truth for actual grades; Predict page is a client-side calculator for hypothetical scenarios

### Materials AI Description Strategy
- Phase 15 uses rule-based descriptions from file names (`_rule_based_description` already exists in materials.py)
- Claude API real-time generation deferred to M3 (AI/MCP milestone)
- Rule-based approach: infer description from item count, file types, and folder names

### Contract Alignment Strategy
- **Strict match** — Python API responses must have identical field names, types, and structure as M1 mock Route Handlers
- M1 OpenAPI spec (`frontend/app/api/v1/`) is the contract truth source
- Frontend should require ZERO changes when switching `prefixUrl` from mock to Python API
- Pydantic response schemas must mirror the TypeScript types from M1

### Claude's Discretion
- Service layer internal architecture (dependency injection, helper decomposition)
- SQLAlchemy query optimization (eager loading, joinedload patterns)
- Error response format details (within OpenAPI spec constraints)
- Test data seeding approach (fixtures, factory functions, etc.)
- Deadline fuzzy matching threshold tuning (currently 95 in deadline.py)
- Missing endpoint detection and gap closure methodology

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Contracts (PRIMARY — defines what responses must look like)
- `docs/UniBoard_TRD_v2.md` §12 — Full REST API specification (32 endpoints)
- `docs/UniBoard_TRD_v2.md` §12.1 — API conventions (response envelope, pagination, error format)
- `frontend/app/api/v1/` — M1 mock Route Handlers (the contract truth source for response shapes)

### Business Logic Specifications
- `docs/UniBoard_TRD_v2.md` §3 — System architecture (service layer position)
- `docs/UniBoard_TRD_v2.md` §4 — Data model (entities, relationships, field types)
- `docs/UniBoard_TRD_v2.md` §14 — Error handling patterns

### Existing Service Code (MUST read — substantial implementation exists)
- `src/services/gpa.py` (524 lines) — GPA/WAM calculation, what-if, target path
- `src/services/deadline.py` (360 lines) — Deadline aggregation with SHA-256 dedup
- `src/services/materials.py` (306 lines) — Course materials, full-text search
- `src/services/intelligence.py` (185 lines) — Ed high-value post filtering
- `src/services/digest.py` (318 lines) — Daily digest aggregation
- `src/web/routes/*.py` — All REST route handlers already exist

### Pydantic Schemas (define response types)
- `src/schemas/gpa.py` — GPASummaryResponse, CourseDetailResponse, WhatIfScenarioResponse, TargetPathResponse
- `src/schemas/deadline.py` — DeadlineResponse, DeadlineDetailResponse, ConflictDay
- `src/schemas/materials.py` — CourseMaterialsResponse, FolderResponse, SearchResponse
- `src/schemas/intelligence.py` — HighValuePostResponse, AIHighValuePostResponse

### Database Models
- `src/models/` — SQLAlchemy async models (Course, Grade, UnifiedDeadline, DiscussionThread, Module, etc.)
- `supabase/migrations/00000000000001_initial_schema.sql` — DB schema

### Frontend Types (must match)
- `frontend/types/` — TypeScript types that Pydantic schemas must mirror

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GPAService` (524 lines): Full WAM/GPA calculation with what-if and target path — needs verification against M1 contract
- `DeadlineService` (360 lines): SHA-256 dedup + fuzzy matching (rapidfuzz, threshold=95) — needs 3-source aggregation verification
- `CourseMaterialService` (306 lines): Folder view + full-text search with `_rule_based_description` — ready
- `EdIntelligenceService` (185 lines): Endorsed + staff-answered filtering — needs contract verification
- `src/web/deps.py`: FastAPI dependencies (get_session, get_current_user_id, get_request_meta)
- `src/schemas/common.py`: SuccessResponse envelope, error types, pagination types

### Established Patterns
- FastAPI dependency injection: `Depends(get_session)` → `Service(session)` → route handler
- Response envelope: `SuccessResponse[T](data=result, meta=get_request_meta(request))`
- All routes use `get_current_user_id` for per-user data isolation (RLS backup)
- Pydantic v2 models with `model_config = ConfigDict(from_attributes=True)` for ORM compatibility

### Integration Points
- Frontend switches `prefixUrl` via env var: `/api/v1` (mock) → `http://localhost:8000/api/v1` (Python)
- Auth: Python validates Supabase JWT → extracts user_id → passes to service layer
- DB: SQLAlchemy async session connecting to Supabase PostgreSQL via asyncpg

### Key Assessment
- **~3580 lines of services + routes already exist** — this phase is about verification, gap closure, and contract compliance, not building from scratch
- Main risk: response shape mismatch between Python Pydantic schemas and M1 TypeScript types
- Services assume data in DB — seed scripts or test fixtures needed for development/testing

</code_context>

<specifics>
## Specific Ideas

No specific requirements — follow existing code conventions, TRD specifications, and M1 contract shapes.

</specifics>

<deferred>
## Deferred Ideas

- Live adapter calls from services (on-demand sync) — Phase 16 handles all sync
- Claude API for materials descriptions — M3 (AI/MCP milestone)
- Deadline reminder notifications (DL-02, DL-03) — Phase 17
- AI-enhanced digest scoring (INTEL-04) — M3

</deferred>

---

*Phase: 15-core-services-api-routes*
*Context gathered: 2026-03-27*
