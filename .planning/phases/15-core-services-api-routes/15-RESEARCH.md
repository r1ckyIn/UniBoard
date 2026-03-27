# Phase 15: Core Services & API Routes - Research

**Researched:** 2026-03-27
**Domain:** FastAPI service layer + REST API contract alignment with M1 OpenAPI spec
**Confidence:** HIGH

## Summary

Phase 15 is primarily a **verification and gap closure** phase, not a greenfield build. Approximately 3,580 lines of service code and route handlers already exist across `src/services/` and `src/web/routes/`. The core work is (1) identifying and fixing **contract mismatches** between Python Pydantic schemas and the M1 OpenAPI types.gen.d.ts shapes, (2) adding **missing endpoints** that the frontend hooks call but the backend does not yet serve, and (3) ensuring all 10 requirements produce correct business logic results.

The most critical finding is a **significant structural mismatch** between what the Python backend returns and what the frontend expects. The GPA endpoint, Deadline endpoint, Course endpoint, Materials endpoint, Discussions endpoint, and Search endpoint all have field name differences, missing fields, or structural differences that must be reconciled. The backend has its own internally-consistent schema set, but the frontend was built against the OpenAPI spec which defines a *different* shape. The planner must treat contract alignment as the highest-priority work stream.

**Primary recommendation:** Systematically audit each endpoint's Pydantic response schema against the corresponding `types.gen.d.ts` type, fix all mismatches, add missing endpoints, then verify with integration tests.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Services ONLY read from DB -- no live adapter calls (Phase 16 handles sync)
- Backend is authoritative for WAM/GPA on Dashboard and Courses pages; frontend Predict page keeps its own WAM engine for instant what-if
- Both sides use same formula: USYD WAM = sum(mark * credit_points) / sum(credit_points), GPA via step-function mapping (85+=4.0)
- Phase 15 uses rule-based descriptions from file names (Claude API deferred to M3)
- Strict contract match -- Python API responses must have identical field names, types, and structure as M1 mock Route Handlers
- M1 OpenAPI spec (`frontend/app/api/v1/`) is the contract truth source
- Frontend should require ZERO changes when switching `prefixUrl` from mock to Python API

### Claude's Discretion
- Service layer internal architecture (dependency injection, helper decomposition)
- SQLAlchemy query optimization (eager loading, joinedload patterns)
- Error response format details (within OpenAPI spec constraints)
- Test data seeding approach (fixtures, factory functions, etc.)
- Deadline fuzzy matching threshold tuning (currently 95 in deadline.py)
- Missing endpoint detection and gap closure methodology

### Deferred Ideas (OUT OF SCOPE)
- Live adapter calls from services (on-demand sync) -- Phase 16 handles all sync
- Claude API for materials descriptions -- M3 (AI/MCP milestone)
- Deadline reminder notifications (DL-02, DL-03) -- Phase 17
- AI-enhanced digest scoring (INTEL-04) -- M3
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GPA-01 | Real-time GPA/WAM for current semester from Canvas grades | GPAService.get_summary() exists (524 lines), needs contract alignment with GpaReport schema |
| GPA-02 | What-if simulation with hypothetical scores | GPAService.simulate() exists, needs contract alignment with GpaPrediction schema |
| GPA-03 | Target GPA path planner with minimum scores | GPAService.calculate_target_path() exists, needs contract alignment with GpaPath schema |
| GPA-04 | Assessment weight breakdown per course from Unit Outline | CourseDetail endpoint needs assessment_weights field matching OpenAPI AssessmentWeight schema |
| GPA-05 | Per-course WAM with grade band and pct assessed | CourseSummary in GPASummaryResponse exists, needs mapping to GpaCourseSummary fields |
| DL-01 | Unified deadline timeline from Canvas + Ed Lessons + Ed Discussion | DeadlineService exists (360 lines), needs `status` and `days_remaining` fields + missing endpoints |
| INTEL-01 | Ed posts filtered by endorsed/staff status | EdIntelligenceService.get_high_value_posts() exists, needs contract alignment with Discussion schema |
| INTEL-05 | Deduplication across data sources | SHA-256 dedup in DeadlineService already implemented; DigestService uses 24h cutoff |
| FILE-01 | Course folders with AI-generated descriptions | CourseMaterialService exists, needs contract alignment with Material schema |
| FILE-02 | Full-text search across materials | CourseMaterialService.search() exists with tsvector, needs alignment with SearchResult schema |
</phase_requirements>

## Contract Mismatch Analysis (CRITICAL)

This is the most important section. Each endpoint is compared between the Python backend and the OpenAPI types.gen.d.ts.

### Mismatch 1: GPA Report (`GET /gpa`)

**Frontend expects (GpaReport):**
```typescript
{
  scale: "wam" | "gpa_4" | "gpa_7",
  current_wam: number,
  current_gpa_4: number,
  target_wam: number | null,
  gap: number | null,
  courses: GpaCourseSummary[],  // different shape!
  last_sync_at: string
}
```

**GpaCourseSummary expects:**
```typescript
{
  course_id: string,
  code: string,           // NOT course_code
  name: string,           // NOT course_name
  credit_points: number,
  level_weight: number,   // MISSING in backend
  current_mark: number | null,  // NOT wam
  grade_letter: string | null,  // NOT grade_band
  completed_weight: number      // NOT pct_assessed
}
```

**Python returns (GPASummaryResponse):**
```python
{
  cumulative_wam: float,     # vs current_wam
  cumulative_gpa: float,     # vs current_gpa_4
  total_credit_points: int,  # NOT in frontend
  course_count: int,         # NOT in frontend
  courses: CourseSummary[]   # different fields!
}
```

**Python CourseSummary:**
```python
{
  course_id, course_name, course_code, semester,
  credit_points, wam, grade_band, gpa_point,
  pct_assessed, assessment_count, graded_count
}
```

**Delta:** Nearly every field name differs. Missing: `scale`, `target_wam`, `gap`, `last_sync_at`, `level_weight`, `completed_weight`. Renamed: `current_wam` vs `cumulative_wam`, `code` vs `course_code`, `name` vs `course_name`, `current_mark` vs `wam`, `grade_letter` vs `grade_band`, `completed_weight` vs `pct_assessed`.

### Mismatch 2: GPA Prediction (`POST /gpa/predict`)

**Frontend expects (GpaPrediction):**
```typescript
{
  current_wam: number,
  predicted_wam: number,
  delta: number,
  per_course: GpaPredictionCourse[]
}
```

**GpaPredictionCourse:**
```typescript
{
  course_id: string,
  code: string,
  current_mark: number,
  predicted_mark: number,
  applied_assumptions: WhatIfScore[]
}
```

**WhatIfScore (frontend):**
```typescript
{ course_id: string, assessment_name: string, assumed_score: number }
```

**Python WhatIfScenarioResponse:**
```python
{ id, name, result_wam, result_gpa, scores: [WhatIfScore], created_at }
```

**Python WhatIfScore:**
```python
{ assessment_id: str, hypothetical_score: float }
```

**Delta:** Completely different structure. Frontend expects per-course breakdown with predicted_mark per course and applied_assumptions referencing assessment names. Backend returns a flat result_wam/result_gpa. The `POST /gpa/predict` endpoint path is different from `POST /gpa/what-if`.

### Mismatch 3: GPA Path (`POST /gpa/path`)

**Frontend expects (GpaPath):**
```typescript
{
  target_wam: number,
  current_wam: number,
  is_achievable: boolean,
  per_course: GpaPathCourse[]
}
```

**GpaPathCourse:**
```typescript
{
  course_id: string,
  code: string,
  current_mark: number,
  minimum_remaining_avg: number,
  remaining_assessments: GpaPathAssessment[],
  difficulty: "easy" | "moderate" | "hard" | "impossible"
}
```

**GpaPathAssessment:**
```typescript
{ name: string, weight: number, minimum_score: number }
```

**Python TargetPathResponse:**
```python
{
  target_wam, is_achievable, max_achievable_wam,
  required_scores: [AssessmentTarget]
}
```

**Python AssessmentTarget:**
```python
{ assessment_id, assessment_name, course_code, minimum_score, max_score, weight, credit_points }
```

**Delta:** Frontend expects `per_course` grouping with `difficulty` enum and `minimum_remaining_avg`. Backend returns flat `required_scores` list. Missing: `current_wam`, `difficulty`, per-course grouping. Route path: frontend calls `POST /gpa/path`, backend has `POST /gpa/target`.

### Mismatch 4: Deadlines (`GET /deadlines`)

**Frontend expects (Deadline):**
```typescript
{
  id: string,
  title: string,
  due_date: string,
  source: string,
  weight?: number | null,
  status: "upcoming" | "submitted" | "overdue" | "completed",
  days_remaining: number,
  course_code: string,
  course_name: string,
  is_confirmed: boolean
}
```

**Python DeadlineResponse:**
```python
{
  id, course_id, course_code, course_name, title, due_date,
  source, source_tags, weight, description, urgency, is_confirmed
}
```

**Delta:** Frontend has `status` + `days_remaining` (computed). Backend has `urgency` + `description` + `source_tags` + `course_id` (different fields). Missing from backend: `status`, `days_remaining`. Extra in backend: `urgency`, `description`, `source_tags`, `course_id`.

### Mismatch 5: Missing Endpoints

| Frontend calls | Backend route | Status |
|----------------|---------------|--------|
| `GET /deadlines/upcoming` | Not implemented | MISSING |
| `GET /courses/{id}/deadlines` | Not implemented | MISSING |
| `GET /courses` | Not implemented (only via users route) | MISSING |
| `GET /courses/{id}` | `GET /gpa/courses/{course_id}` (wrong prefix) | WRONG PATH |
| `GET /courses/{id}/grades` | Not implemented | MISSING |
| `GET /courses/{id}/outline` | Not implemented | MISSING |
| `POST /gpa/predict` | `POST /gpa/what-if` (different path & shape) | PATH + SHAPE MISMATCH |
| `POST /gpa/path` | `POST /gpa/target` (different path & shape) | PATH + SHAPE MISMATCH |

### Mismatch 6: Materials (`GET /courses/{id}/materials`)

**Frontend expects (Material[]):**
```typescript
{
  id: string,
  title: string,
  source: "canvas" | "ed",
  source_type: "module" | "lesson",
  items?: MaterialItem[],
  slide_count?: number,
  url?: string
}
```

**Python returns (CourseMaterialsResponse):**
```python
{
  course_id: string,
  course_name: string,
  folders: [FolderResponse]
}
```

**FolderResponse:**
```python
{ id, name, source, position, item_count, ai_description, items? }
```

**Delta:** Frontend expects flat `Material[]` array. Backend returns nested `{course_id, course_name, folders: [...]}`. Frontend uses `source_type`, `slide_count`, `url`. Backend uses `position`, `item_count`, `ai_description`. Completely different structure.

### Mismatch 7: Discussions (`GET /courses/{id}/discussions`)

**Frontend expects (Discussion[]) with pagination:**
```typescript
{
  id: string,
  ed_thread_id: string,
  title: string,
  author: string,           // MISSING in backend
  category: string,
  is_endorsed: boolean,
  is_staff_post: boolean,
  gpa_relevance_score: number,
  relevance_category: string, // MISSING in backend
  summary: string,            // vs content_summary
  created_at: string
}
```

**Python HighValuePostResponse:**
```python
{ id, ed_thread_id, title, category, content_summary, is_endorsed, is_staff_post, created_at }
```

**Delta:** Missing fields: `author`, `gpa_relevance_score`, `relevance_category`, `summary`. Field rename: `summary` vs `content_summary`. Frontend expects paginated response; backend does not implement pagination for this endpoint. Frontend also accepts filter=all (returns all posts, not just high-value).

### Mismatch 8: Search (`GET /search`)

**Frontend expects (SearchResult[]):**
```typescript
{
  type: "material" | "discussion",
  title: string,
  source: string,
  course_code: string,
  snippet: string,
  url: string,
  relevance: number
}
```

**Python SearchResponse:**
```python
{
  query: string,
  total_hits: int,
  results: [SearchHit]
}
```

**SearchHit:**
```python
{ id, title, course_id, course_name, course_code, type, source, snippet, rank }
```

**Delta:** Frontend expects flat `SearchResult[]`. Backend wraps in `{query, total_hits, results}`. Backend uses `rank` vs frontend `relevance`. Backend includes `id`, `course_id`, `course_name` (extra). Backend types are `module_item`/`lesson` vs frontend `material`/`discussion`.

### Mismatch 9: Grades (`GET /courses/{id}/grades`)

**Frontend expects (Grade[]):**
```typescript
{
  id: string,
  assessment_name: string,
  score: number,
  max_score: number,
  weight: number,
  group_name: string,
  graded_at: string,
  submitted_at: string
}
```

**Python:** No dedicated grades endpoint exists. Grades are returned nested in `CourseDetailResponse.assessments` which has different fields (`name` vs `assessment_name`, no `graded_at`/`submitted_at`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | >=0.115 | REST framework | Already in use, async native |
| SQLAlchemy | >=2.0 async | ORM + queries | Already in use with asyncpg |
| Pydantic | >=2.10 | Request/response schemas | Already in use, from_attributes=True |
| asyncpg | >=0.30 | PostgreSQL async driver | Already in use |
| structlog | >=24.0 | Structured logging | Already in use |
| rapidfuzz | >=3.14 | Fuzzy title matching | Already in use for deadline dedup |
| httpx | >=0.28 | HTTP test client | Already in conftest.py |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| hypothesis | >=6.151 | Property-based testing | GPA calculation edge cases |
| pytest-asyncio | >=0.25 | Async test support | All async service tests |
| pytest-cov | >=6.0 | Coverage reporting | Per-phase verification |

**Installation:** Already installed -- no new packages needed.

## Architecture Patterns

### Recommended Project Structure (no changes needed)
```
src/
├── services/       # Business logic (GPAService, DeadlineService, etc.)
├── web/
│   ├── routes/     # FastAPI route handlers
│   ├── deps.py     # Shared dependencies
│   └── main.py     # App factory
├── schemas/        # Pydantic request/response models
├── models/         # SQLAlchemy ORM models
└── config.py       # Settings
```

### Pattern 1: Service-per-Domain with DI
**What:** Each domain (GPA, Deadline, Materials, Intelligence) has one service class injected via FastAPI Depends.
**When to use:** All route handlers.
**Example:**
```python
# Already established in codebase
def get_gpa_service(session: AsyncSession = Depends(get_session)) -> GPAService:
    return GPAService(session)

@router.get("/summary")
async def get_gpa_summary(
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GPASummaryResponse]:
    result = await svc.get_summary(current_user_id)
    return SuccessResponse(data=result, meta=get_request_meta(request))
```

### Pattern 2: Response Envelope
**What:** All responses wrapped in `SuccessResponse[T](data=result, meta=MetaInfo)`.
**When to use:** Every endpoint.
**Established in:** `src/schemas/common.py`, all existing routes.

### Pattern 3: Eager Loading with selectinload
**What:** Use `selectinload()` to pre-fetch related data in a single query.
**When to use:** Any service method that accesses related collections (Course.grades, Course.modules).
**Already used in:** GPAService._load_user_courses, CourseMaterialService.get_course_materials.

### Anti-Patterns to Avoid
- **N+1 queries:** Always use selectinload for related collections, never loop-query.
- **Live adapter calls in services:** Phase 15 reads from DB only. No `CanvasAdapter.get_assignments()` in service methods.
- **Breaking frontend contracts:** Every schema change must be validated against types.gen.d.ts. Add fields, don't rename existing ones without checking consumers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching | Custom Levenshtein | `rapidfuzz.fuzz.token_set_ratio` | Already in codebase, handles edge cases |
| SHA-256 dedup | Manual hash logic | `compute_dedup_key()` in deadline.py | Already implemented and tested |
| Full-text search | SQL LIKE queries | PostgreSQL tsvector + `ts_rank` | Already in materials.py, 10x faster |
| Grade band mapping | If/else chains | `GPAService._mark_to_grade_band()` | Tested with property tests |
| Response envelope | Manual JSON wrapping | `SuccessResponse[T]` | Consistent meta, type-safe |
| Request ID | Manual UUID | `get_request_meta(request)` | Reads from middleware state |

**Key insight:** The codebase already has correct implementations for all business logic. The risk is NOT broken calculations -- it's broken contracts.

## Common Pitfalls

### Pitfall 1: Pydantic Field Name vs OpenAPI Field Name
**What goes wrong:** Python schema uses `course_code` but OpenAPI expects `code`. Frontend breaks silently (field is undefined, not a crash).
**Why it happens:** Backend was built from TRD; frontend was built from OpenAPI spec. They evolved independently.
**How to avoid:** For every Pydantic model, diff field names against the corresponding `types.gen.d.ts` schema line by line.
**Warning signs:** Frontend shows "undefined" or "NaN" where data should be.

### Pitfall 2: Nested vs Flat Response Structure
**What goes wrong:** Backend returns `{course_id: ..., course_name: ..., folders: [...]}` but frontend expects flat `Material[]`.
**Why it happens:** Backend designed RESTful resource nesting; M1 mocks used simpler flat arrays.
**How to avoid:** Match the mock Route Handler response shape exactly, even if the backend structure would be "better" RESTfully.
**Warning signs:** Frontend `data.map()` crashes because `data` is an object, not an array.

### Pitfall 3: Missing Computed Fields (status, days_remaining)
**What goes wrong:** Deadline model stores `due_date` but frontend expects `status` ("upcoming"/"completed"/"overdue") and `days_remaining` (integer).
**Why it happens:** These are computed at response time, not stored. Backend has `urgency` (different enum).
**How to avoid:** Add computed fields in Pydantic schema or route handler. Calculate from `due_date` and current time.
**Warning signs:** Deadline cards show no status badge or "0 days remaining" for all items.

### Pitfall 4: Route Path Misalignment
**What goes wrong:** Frontend calls `POST /gpa/predict` but backend has `POST /gpa/what-if`. 404 errors.
**Why it happens:** Backend followed TRD naming; frontend followed OpenAPI spec naming.
**How to avoid:** Map every frontend hook URL to a backend route. Add aliases or rename routes.
**Warning signs:** Network tab shows 404 or 405 responses.

### Pitfall 5: Pagination Shape Mismatch
**What goes wrong:** Discussions endpoint returns flat list; frontend expects `{data, pagination: {next_cursor, has_more}}`.
**Why it happens:** Backend didn't implement cursor-based pagination for discussions.
**How to avoid:** Check if M1 mock uses `mockPaginatedResponse` -- if so, backend must return same shape.
**Warning signs:** Only first page of discussions loads; "load more" does nothing.

### Pitfall 6: Decimal Serialization
**What goes wrong:** Python Decimal returns as string `"85.00"` instead of number `85.00` in JSON.
**Why it happens:** Pydantic v2 serializes Decimal differently depending on config.
**How to avoid:** Use `float()` conversion in service layer before passing to Pydantic models (already done in GPAService).
**Warning signs:** Frontend treats WAM as string, shows "85.00" instead of 85.

## Code Examples

### Contract-Aligned GPA Report Response (must match types.gen.d.ts GpaReport)
```python
# What the new schema should look like:
class GpaReportResponse(BaseModel):
    scale: str = "wam"  # "wam" | "gpa_4" | "gpa_7"
    current_wam: float
    current_gpa_4: float
    target_wam: float | None
    gap: float | None
    courses: list[GpaCourseSummaryResponse]
    last_sync_at: str  # ISO 8601


class GpaCourseSummaryResponse(BaseModel):
    course_id: str
    code: str           # NOT course_code
    name: str           # NOT course_name
    credit_points: int
    level_weight: int   # Course level (1000-level=1, 2000=2, 3000=3)
    current_mark: float | None
    grade_letter: str | None
    completed_weight: float
```

### Contract-Aligned Deadline Response (must match types.gen.d.ts Deadline)
```python
class DeadlineResponse(BaseModel):
    id: str
    title: str
    due_date: str  # ISO 8601
    source: str
    weight: float | None = None
    status: str  # "upcoming" | "submitted" | "overdue" | "completed"
    days_remaining: int  # computed
    course_code: str
    course_name: str
    is_confirmed: bool
```

### Missing Endpoint: GET /courses (Course list)
```python
@router.get("")
async def list_courses(
    request: Request,
    semester: str | None = Query(None),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[list[CourseResponse]]:
    stmt = select(Course).where(Course.user_id == current_user_id)
    if semester:
        stmt = stmt.where(Course.semester == semester)
    result = await session.execute(stmt)
    courses = result.scalars().all()
    return SuccessResponse(
        data=[CourseResponse.from_orm(c) for c in courses],
        meta=get_request_meta(request),
    )
```

### Missing Endpoint: GET /courses/{id}/grades (Grade list)
```python
@router.get("/{course_id}/grades")
async def get_course_grades(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[list[GradeResponse]]:
    stmt = (
        select(Grade)
        .join(Course, Grade.course_id == Course.id)
        .where(Course.id == course_id, Course.user_id == current_user_id)
    )
    result = await session.execute(stmt)
    grades = result.scalars().all()
    return SuccessResponse(
        data=[GradeResponse.from_orm(g) for g in grades],
        meta=get_request_meta(request),
    )
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Backend-first schema design | Contract-first (OpenAPI) | M1 Phase 2 | All schemas must match types.gen.d.ts |
| Pydantic v1 orm_mode | Pydantic v2 from_attributes=True | Already migrated | model_config = ConfigDict(from_attributes=True) |
| fastapi.testclient.TestClient (sync) | httpx.AsyncClient with ASGITransport | Already in conftest.py | All integration tests use async |
| Manual test data | Hypothesis property tests | Phase 14 | Use for GPA calculation edge cases |

## Open Questions

1. **Course `level_weight` field**
   - What we know: Frontend expects `level_weight: number` on GpaCourseSummary (used for USYD's weighted WAM where higher-level courses count more)
   - What's unclear: The Course model may not have a `level_weight` column. It may need to be derived from course code (e.g., COMP**2**017 -> level 2)
   - Recommendation: Parse level from course code regex `\d{4}` -> first digit, or add to Course model

2. **Deadline `status` vs `urgency` semantics**
   - What we know: Frontend expects `status: "upcoming" | "submitted" | "overdue" | "completed"`. Backend has `urgency: "urgent" | "warning" | "normal" | "past_due"`.
   - What's unclear: How to determine "submitted" and "completed" status from DB data
   - Recommendation: Map `urgency` to `status` at response time. "past_due" -> "overdue", add logic for "completed" based on grade existence, "submitted" based on Canvas submission status

3. **Frontend `prefixUrl` switch mechanism**
   - What we know: `api = ky.create({ prefixUrl: "/api/v1" })` targets Next.js Route Handlers in M1
   - What's unclear: Whether the switch to Python backend (`http://localhost:8000/api/v1`) happens via env var or proxy config
   - Recommendation: Python backend must serve under `/api/v1` prefix (already configured in `__init__.py`)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ / pytest-asyncio 0.25+ |
| Config file | pyproject.toml `[tool.pytest.ini_options]` |
| Quick run command | `python -m pytest tests/unit/ -x -q` |
| Full suite command | `python -m pytest tests/ -x --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GPA-01 | WAM/GPA calculation returns correct values | unit | `python -m pytest tests/unit/test_gpa_service.py -x` | Yes |
| GPA-02 | What-if simulation with hypothetical scores | unit | `python -m pytest tests/unit/test_gpa_service.py::test_whatif_simulate -x` | Yes |
| GPA-03 | Target path calculates minimum scores | unit | `python -m pytest tests/unit/test_gpa_service.py::test_target_path_uniform_achievable -x` | Yes |
| GPA-04 | Assessment weight breakdown per course | integration | `python -m pytest tests/integration/test_gpa_routes.py -x` | Yes (partial) |
| GPA-05 | Per-course WAM with grade band | unit | `python -m pytest tests/unit/test_gpa_service.py::test_single_course_wam -x` | Yes |
| DL-01 | Deadline aggregation with SHA-256 dedup | unit | `python -m pytest tests/unit/test_deadline_service.py -x` | Yes |
| INTEL-01 | Ed posts filtered by endorsed/staff | integration | `python -m pytest tests/integration/ -k intelligence -x` | Wave 0 |
| INTEL-05 | Deduplication across data sources | unit | `python -m pytest tests/unit/test_deadline_service.py::TestComputeDedupKey -x` | Yes |
| FILE-01 | Course folders with descriptions | integration | `python -m pytest tests/integration/ -k materials -x` | Wave 0 |
| FILE-02 | Full-text search across materials | integration | `python -m pytest tests/integration/test_search.py -x` | Yes |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/unit/ -x -q`
- **Per wave merge:** `python -m pytest tests/ -x --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/integration/test_contract_alignment.py` -- validates every endpoint response matches types.gen.d.ts shapes
- [ ] `tests/integration/test_courses_routes.py` -- covers GET /courses, GET /courses/{id}, GET /courses/{id}/grades, GET /courses/{id}/deadlines
- [ ] `tests/integration/test_deadline_routes.py` -- covers GET /deadlines/upcoming
- [ ] `tests/integration/test_materials_routes.py` -- covers contract-aligned materials endpoints

## Complete Endpoint Inventory

### Required by Frontend (from hooks + mock routes)
| Frontend Hook | URL | HTTP | Backend Status |
|---------------|-----|------|----------------|
| useGpaReport | `GET /gpa` | GET | Exists at `/gpa/summary` -- needs path + schema fix |
| useGpaPredict | `POST /gpa/predict` | POST | Exists at `/gpa/what-if` -- needs path + schema fix |
| useGpaPath | `POST /gpa/path` | POST | Exists at `/gpa/target` -- needs path + schema fix |
| useCourses | `GET /courses` | GET | MISSING -- needs new route |
| useCourseDetail | `GET /courses/{id}` | GET | Exists at `/gpa/courses/{id}` -- needs move + schema fix |
| useCourseGrades | `GET /courses/{id}/grades` | GET | MISSING -- needs new route |
| useCourseDeadlines | `GET /courses/{id}/deadlines` | GET | MISSING -- needs new route |
| useDeadlines | `GET /deadlines` | GET | Exists -- needs schema fix |
| useUpcomingDeadlines | `GET /deadlines/upcoming` | GET | MISSING -- needs new route |
| useCourseMaterials | `GET /courses/{id}/materials` | GET | Exists -- needs schema fix |
| useCourseDiscussions | `GET /courses/{id}/discussions` | GET | Exists -- needs schema + pagination fix |
| useSearch | `GET /search` | GET | Exists -- needs schema fix |

### Already Correct (no changes needed)
| Route | Status |
|-------|--------|
| `GET /health` | OK |
| `GET /users/me` | OK |
| `PATCH /users/me` | OK |
| `PUT /users/me/tokens/{platform}` | OK |
| `DELETE /users/me/tokens/{platform}` | OK |
| `POST /sync/trigger` | OK |
| `GET /sync/status` | OK |
| `GET /notifications` | OK |
| `GET /digest/latest` | OK (shape may need verification) |
| `GET /digest/history` | OK (shape may need verification) |
| `GET /alerts` | OK |

## Sources

### Primary (HIGH confidence)
- `frontend/lib/api/types.gen.d.ts` -- OpenAPI generated types (THE contract truth source)
- `frontend/app/api/v1/*/route.ts` -- M1 mock Route Handlers (response shapes)
- `frontend/hooks/use-*.ts` -- Frontend hooks (endpoint URLs + request params)
- `frontend/lib/fixtures/*.ts` -- Fixture data (exact response field examples)
- `src/services/*.py` -- Existing service implementations
- `src/schemas/*.py` -- Existing Pydantic schemas
- `src/web/routes/*.py` -- Existing route handlers

### Secondary (MEDIUM confidence)
- `docs/UniBoard_TRD_v2.md` SS12 -- REST API specification (may diverge from actual OpenAPI spec)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, versions verified in pyproject.toml
- Architecture: HIGH -- patterns fully established in existing codebase
- Contract mismatches: HIGH -- directly compared types.gen.d.ts vs Pydantic schemas line by line
- Pitfalls: HIGH -- identified from actual code comparison, not speculation

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- codebase structure is established)
