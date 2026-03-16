# Phase 2: Core Services & API - Research

**Researched:** 2026-03-16
**Domain:** Business services (GPA, deadlines, materials, sync), REST API, background scheduling
**Confidence:** HIGH

## Summary

Phase 2 composes the Phase 1 adapters into user-facing business services and exposes them via REST API. The key technical domains are: (1) GPA/WAM calculation with Decimal precision and property-based testing via Hypothesis, (2) deadline deduplication with SHA-256 hashing and Levenshtein fuzzy matching via rapidfuzz, (3) background sync engine using APScheduler embedded in FastAPI lifespan, (4) AI-generated folder descriptions via Anthropic Python SDK (Claude Haiku), (5) PostgreSQL full-text search with tsvector/GIN indexes on ModuleItem and Lesson tables, and (6) REST API endpoints following established Phase 1 patterns.

The existing codebase provides strong foundations: 11 ORM models, dependency injection via `Depends()`, `SuccessResponse[T]`/`ErrorResponse` envelopes, async SQLAlchemy sessions with transaction rollback in tests, and 56 passing integration tests. Phase 2 services import existing adapters (`CanvasAdapter`, `EdDiscussionAdapter`, `EdLessonsAdapter`, `UnitOutlineParser`) and write results to the database. New routes register on the existing `api_router` with the `/api/v1` prefix.

**Primary recommendation:** Use APScheduler 3.11.x (stable) with `AsyncIOScheduler` rather than 4.x alpha; use `python Decimal` for all GPA math; use `rapidfuzz` for fuzzy deadline dedup; add `hypothesis` for GPA property testing; add `anthropic` SDK for AI folder descriptions.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Display BOTH WAM (weighted average mark) and GPA (7-point scale) simultaneously
- WAM formula: Sum(credit_points * mark) / Sum(credit_points), using raw percentage marks
- GPA 7-point scale mapping uses USYD official thresholds: HD>=85->7, D>=75->6, CR>=65->5, P>=50->4, F<50->0
- Incomplete courses: only calculate from published grades, show "X% assessed" indicator
- Per-semester WAM/GPA trend data for frontend trend chart
- What-if simulator: per-assessment input, persistent `whatif_scenarios` table
- Target GPA path: per-assessment minimum scores, uniform + smart allocation modes
- Sync engine: APScheduler (async) embedded in FastAPI startup, per-user sync, upsert strategy
- Sync intervals: grades 15min, deadlines 1h, modules daily, Unit Outline per semester
- Sync failure: retry 3x (exponential backoff), then mark "degraded"
- Concurrency: parallel by platform, same-platform never overlaps
- Manual sync: POST /api/v1/sync/trigger with 5-min throttle
- Token expiration: detect during sync via 401/403, expose warning status
- Deadline dedup: SHA-256(course_code + normalize(title) + due_date)
- Near-duplicate: Levenshtein distance for fuzzy matching
- Ed Discussion deadline extraction: regex rules for Phase 2
- Course materials: unified view grouped by course, AI folder descriptions via Claude Haiku
- AI cost control: per-user daily limit, fallback to rule-based description
- Search: PostgreSQL tsvector on ModuleItem and Lesson tables
- Ed intelligence: is_endorsed=true OR has_staff_answer=true (rule-based)
- REST API: cursor-based pagination, existing SuccessResponse/ErrorResponse
- Services: by functional domain (GPAService, DeadlineService, CourseMaterialService, EdIntelligenceService)
- SyncService in `src/sync/` (separate from services/)
- Testing: Hypothesis for GPA, scenario tests for dedup, real API integration tests, no mocks

### Claude's Discretion
- Exact APScheduler configuration and task registration
- Levenshtein distance threshold for fuzzy dedup
- Claude API prompt template for folder descriptions
- Exact tsvector column configuration for new tables
- Internal service method signatures and return types
- Alembic migration strategy for new tables

### Deferred Ideas (OUT OF SCOPE)
- AiStudyMate multimodal AI integration -- post-v1
- Ed Discussion NLP deadline extraction -- Phase 4 AI enhancement
- PDF/PPT content indexing for search -- Phase 4 AI Q&A
- AI-enhanced high-value post extraction -- Phase 4
- User-customizable GPA grade thresholds -- future enhancement
- Distributed sync with Celery/Redis -- when scaling beyond single instance
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GPA-01 | Real-time GPA/WAM from Canvas grades (< 15 min delay) | GPAService with Decimal math, sync engine grades every 15min |
| GPA-02 | What-if simulation with hypothetical scores | WhatIfScenario table + GPAService.simulate() using same Decimal engine |
| GPA-03 | Target GPA path with minimum scores per assessment | GPAService.calculate_target_path() with uniform/smart allocation |
| GPA-04 | Assessment weight breakdown per course | Existing UnitOutline parser + Canvas assignment_groups fallback chain |
| GPA-05 | Per-course WAM with grade band (HD/D/CR/P/F) and % assessed | GPAService.get_course_summary() with grade_band mapping |
| DL-01 | Unified deduplicated deadline timeline from 3 sources | DeadlineService with SHA-256 dedup + rapidfuzz fuzzy matching |
| INTEL-01 | Ed Discussion posts filtered by endorsed/staff-answered | EdIntelligenceService with simple boolean filter query |
| INTEL-05 | Deduplication across all data sources | SHA-256 dedup_key on UnifiedDeadline, per-item dedup on sync |
| FILE-01 | Course folders with AI-generated descriptions | CourseMaterialService + Anthropic SDK (Haiku) + rule-based fallback |
| FILE-02 | Cross-course keyword search with snippets | PostgreSQL tsvector on ModuleItem + Lesson, ts_headline for snippets |
| INFRA-02 | Background sync engine (grades 15min, deadlines 1h, modules daily) | APScheduler 3.11 AsyncIOScheduler in FastAPI lifespan |
| PLAT-04 | Token expiration warnings | Sync engine detects 401/403, marks token status, API exposes warning |
</phase_requirements>

## Standard Stack

### Core (Phase 2 new dependencies)

| Library | Version | Purpose | Why Standard | Confidence |
|---------|---------|---------|--------------|------------|
| APScheduler | 3.11.x | Background sync scheduling | Stable production release with AsyncIOScheduler. 4.x is alpha (4.0.0a6, April 2025) -- NOT suitable for production. 3.11 has full asyncio support via `AsyncIOScheduler`. | HIGH |
| rapidfuzz | 3.14+ | Fuzzy string matching (Levenshtein) | MIT-licensed, C++ core (5-100x faster than FuzzyWuzzy), provides `fuzz.ratio()` for deadline title comparison | HIGH |
| hypothesis | 6.151+ | Property-based testing for GPA | Standard for testing mathematical invariants. `st.decimals()` strategy generates edge-case Decimal values. | HIGH |
| anthropic | 0.84+ | Claude API client for AI descriptions | Official Anthropic SDK with async client (`AsyncAnthropic`). Model: `claude-haiku-4-5-20251001` | HIGH |

### Existing (from Phase 1, used by Phase 2)

| Library | Version | Purpose | Phase 2 Usage |
|---------|---------|---------|---------------|
| FastAPI | 0.115+ | REST API framework | New route modules for GPA, deadlines, materials, sync, intelligence |
| SQLAlchemy | 2.0+ async | ORM | New service queries, upsert patterns, tsvector columns |
| Pydantic | 2.10+ | Request/response schemas | New schemas for GPA, deadlines, materials, sync status |
| httpx | 0.28+ | HTTP client | Adapters (existing), Anthropic SDK (transitive) |
| structlog | 24.0+ | Structured logging | Sync engine observability metrics |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| APScheduler 3.11 | APScheduler 4.0.0a6 | 4.x is alpha, API unstable, not production-ready. 3.11 has full asyncio support. |
| APScheduler | Celery + Redis | Over-engineered for single-instance MVP. APScheduler runs in-process. Design clean interface for future migration. |
| rapidfuzz | python-Levenshtein | python-Levenshtein is slower (pure C, no algorithmic optimizations), GPL-licensed. rapidfuzz is MIT, faster. |
| rapidfuzz | thefuzz (FuzzyWuzzy) | thefuzz is slow (Python implementation), GPL-licensed. rapidfuzz is a drop-in replacement that is faster. |
| hypothesis | manual edge-case tests | Manual tests miss edge cases. Hypothesis generates thousands of Decimal edge cases automatically. |

**Installation (new Phase 2 dependencies):**
```bash
# Add to pyproject.toml [project.dependencies]
uv add apscheduler anthropic

# Add to pyproject.toml [dependency-groups] dev
uv add --group dev hypothesis rapidfuzz
```

**pyproject.toml additions:**
```toml
[project]
dependencies = [
    # ... existing Phase 1 deps ...
    "apscheduler>=3.11,<4.0",
    "anthropic>=0.84,<1.0",
]

[dependency-groups]
dev = [
    # ... existing Phase 1 dev deps ...
    "hypothesis>=6.151,<7.0",
    "rapidfuzz>=3.14,<4.0",
]
```

Note: `rapidfuzz` is a dev dependency because it is only used in dedup logic tests AND in the DeadlineService runtime. Move to main dependencies if used in production code.

**CORRECTION**: `rapidfuzz` is used in production code (DeadlineService fuzzy matching), so it MUST be in main dependencies:
```toml
"rapidfuzz>=3.14,<4.0",
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)
```
src/
├── services/           # Business logic services (NEW)
│   ├── __init__.py
│   ├── gpa.py          # GPAService: WAM/GPA calculation, what-if, target path
│   ├── deadline.py     # DeadlineService: aggregation, dedup, fuzzy matching
│   ├── materials.py    # CourseMaterialService: unified view, AI descriptions, search
│   └── intelligence.py # EdIntelligenceService: endorsed/staff post filtering
├── sync/               # Background sync engine (NEW, separate from services/)
│   ├── __init__.py
│   ├── engine.py       # SyncEngine: APScheduler setup, task registration
│   ├── tasks.py        # Individual sync task functions (grades, deadlines, modules)
│   └── registry.py     # Per-user task scheduling, status tracking
├── schemas/            # Pydantic request/response schemas (EXTEND)
│   ├── gpa.py          # GPA-related schemas
│   ├── deadline.py     # Deadline schemas with urgency, filters
│   ├── materials.py    # Material/search schemas
│   ├── sync.py         # Sync status schemas
│   └── intelligence.py # Discussion intelligence schemas
├── web/routes/         # FastAPI route modules (EXTEND)
│   ├── gpa.py          # /api/v1/gpa/* endpoints
│   ├── deadlines.py    # /api/v1/deadlines/* endpoints
│   ├── materials.py    # /api/v1/courses/{id}/materials/*, /api/v1/search
│   ├── sync.py         # /api/v1/sync/* endpoints
│   └── intelligence.py # /api/v1/courses/{id}/discussions endpoint
├── models/             # ORM models (EXTEND)
│   └── whatif.py       # WhatIfScenario model (NEW)
└── adapters/           # Platform adapters (EXISTING, consumed by services)
```

### Pattern 1: Service Layer (Depends injection)

**What:** Services are plain async classes that receive a SQLAlchemy session and adapters. They are injected into routes via FastAPI `Depends()`.

**When to use:** All business logic. Routes are thin -- validate input, call service, wrap response.

**Example:**
```python
# Source: Existing pattern from src/web/routes/auth.py + CONTEXT.md decisions

# src/services/gpa.py
from decimal import Decimal, ROUND_HALF_UP
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.course import Course
from src.models.grade import Grade

GRADE_BANDS = [
    (Decimal("85"), "HD", 7),
    (Decimal("75"), "D", 6),
    (Decimal("65"), "CR", 5),
    (Decimal("50"), "P", 4),
    (Decimal("0"), "F", 0),
]


class GPAService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_summary(self, user_id: uuid.UUID) -> GPASummaryResult:
        """Calculate cumulative WAM/GPA from all courses with grades."""
        stmt = (
            select(Course)
            .where(Course.user_id == user_id)
            .options(selectinload(Course.grades))
        )
        result = await self._session.execute(stmt)
        courses = result.scalars().all()

        total_weighted = Decimal("0")
        total_credits = Decimal("0")
        course_summaries = []

        for course in courses:
            graded = [g for g in course.grades if g.score is not None]
            if not graded:
                continue
            # WAM per course = sum(score/max_score * weight * 100) / sum(weight)
            course_mark = self._calculate_course_mark(graded)
            cp = Decimal(str(course.credit_points))
            total_weighted += course_mark * cp
            total_credits += cp
            ...

        wam = (total_weighted / total_credits).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        ) if total_credits > 0 else Decimal("0")
        ...


# src/web/routes/gpa.py
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.web.deps import get_session, get_current_user, get_request_meta

router = APIRouter()

def get_gpa_service(session: AsyncSession = Depends(get_session)) -> GPAService:
    return GPAService(session)

@router.get("/summary")
async def get_gpa_summary(
    request: Request,
    current_user: User = Depends(get_current_user),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GPASummaryResponse]:
    result = await svc.get_summary(current_user.id)
    return SuccessResponse(data=result, meta=get_request_meta(request))
```

### Pattern 2: Sync Engine with APScheduler 3.11 AsyncIOScheduler

**What:** APScheduler `AsyncIOScheduler` embedded in FastAPI lifespan, with per-user job scheduling.

**When to use:** Background data synchronization (grades, deadlines, modules).

**Example:**
```python
# Source: APScheduler 3.11 docs + FastAPI lifespan docs

# src/sync/engine.py
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI

from src.config import get_settings

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Start sync engine on app startup, shut down on exit."""
    settings = get_settings()

    # Register default sync jobs
    scheduler.add_job(
        sync_all_grades,
        IntervalTrigger(minutes=settings.sync_grades_interval_min),
        id="sync_grades",
        replace_existing=True,
        max_instances=1,  # Prevent overlap
    )
    scheduler.add_job(
        sync_all_deadlines,
        IntervalTrigger(minutes=settings.sync_deadlines_interval_min),
        id="sync_deadlines",
        replace_existing=True,
        max_instances=1,
    )
    scheduler.add_job(
        sync_all_modules,
        CronTrigger(hour=3, minute=0),  # Daily at 3 AM
        id="sync_modules",
        replace_existing=True,
        max_instances=1,
    )

    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


# src/web/main.py (modified)
from src.sync.engine import lifespan

def create_app() -> FastAPI:
    application = FastAPI(
        title="UniBoard API",
        lifespan=lifespan,  # ADD lifespan
        ...
    )
```

### Pattern 3: Upsert (INSERT ON CONFLICT UPDATE) for Sync

**What:** Use PostgreSQL upsert to incrementally update data without wiping.

**When to use:** All sync tasks -- avoids data loss on partial sync.

**Example:**
```python
# Source: SQLAlchemy 2.0 docs + PostgreSQL ON CONFLICT

from sqlalchemy.dialects.postgresql import insert as pg_insert

async def upsert_grades(
    session: AsyncSession,
    course_id: uuid.UUID,
    grades_data: list[dict],
) -> int:
    """Upsert grades for a course. Returns number of rows affected."""
    if not grades_data:
        return 0

    stmt = pg_insert(Grade).values(grades_data)
    stmt = stmt.on_conflict_do_update(
        index_elements=["course_id", "assessment_name"],
        set_={
            "score": stmt.excluded.score,
            "max_score": stmt.excluded.max_score,
            "weight": stmt.excluded.weight,
            "graded_at": stmt.excluded.graded_at,
            "updated_at": func.now(),
        },
    )
    result = await session.execute(stmt)
    return result.rowcount
```

**Important:** The Grade table currently has no unique constraint on (course_id, assessment_name). A migration is needed to add this for upsert to work. Alternatively, use a different upsert key strategy.

### Pattern 4: SHA-256 Deduplication for Deadlines

**What:** Generate deterministic dedup keys from normalized deadline attributes.

**When to use:** Deadline aggregation from Canvas + Ed Lessons + Ed Discussion.

**Example:**
```python
# Source: CONTEXT.md decision + hashlib stdlib

import hashlib
import re
import string

def normalize_title(title: str) -> str:
    """Normalize a deadline title for dedup comparison."""
    # Lowercase, strip whitespace, remove punctuation
    title = title.lower().strip()
    title = title.translate(str.maketrans("", "", string.punctuation))
    # Collapse multiple spaces
    title = re.sub(r"\s+", " ", title)
    return title

def compute_dedup_key(course_code: str, title: str, due_date: str) -> str:
    """SHA-256 hash of normalized (course_code + title + due_date)."""
    normalized = f"{course_code.upper()}|{normalize_title(title)}|{due_date}"
    return hashlib.sha256(normalized.encode()).hexdigest()
```

### Pattern 5: Cursor-Based Pagination

**What:** Use existing `PaginationMeta` schema with opaque cursor (base64-encoded UUID or timestamp).

**When to use:** All list endpoints that may return large result sets.

**Example:**
```python
# Source: Existing PaginationMeta from src/schemas/common.py

import base64
from datetime import datetime

def encode_cursor(value: datetime | uuid.UUID) -> str:
    """Encode a timestamp or UUID as an opaque cursor string."""
    return base64.urlsafe_b64encode(str(value).encode()).decode()

def decode_cursor(cursor: str) -> str:
    """Decode an opaque cursor string back to its original value."""
    return base64.urlsafe_b64decode(cursor.encode()).decode()

# In route:
@router.get("")
async def list_deadlines(
    request: Request,
    cursor: str | None = None,
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    svc: DeadlineService = Depends(get_deadline_service),
) -> SuccessResponse[list[DeadlineResponse]]:
    ...
```

### Anti-Patterns to Avoid

- **Lazy loading in async mode:** NEVER use lazy relationship loading. Always use `selectinload()` or `joinedload()` in queries. The existing models use `relationship()` which defaults to lazy -- queries MUST explicitly load relationships.
- **Float for GPA math:** NEVER use Python `float` for WAM/GPA calculation. Always use `Decimal` to avoid rounding drift. Convert `float` values from database to `Decimal` at service boundary.
- **Sync tasks that block the event loop:** NEVER call synchronous/CPU-heavy code directly in async sync tasks. Use `asyncio.to_thread()` for CPU-intensive operations like HTML parsing.
- **Module-level scheduler state:** Do NOT create scheduler at module import time in a way that breaks test isolation. Use factory pattern or lifespan injection.
- **Overlapping sync for same platform:** APScheduler `max_instances=1` prevents overlap for the same job type, but per-user platform locking needs explicit implementation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy string matching | Custom edit-distance algo | `rapidfuzz.fuzz.ratio()` | C++ implementation, handles Unicode, 5-100x faster than Python |
| Background scheduling | Custom asyncio.create_task + sleep loop | APScheduler 3.11 `AsyncIOScheduler` | Cron triggers, interval triggers, max_instances, job persistence, mature |
| Property-based testing | Manual edge-case list | `hypothesis` with `st.decimals()` | Generates thousands of edge cases including NaN, Infinity, tiny values |
| SHA-256 hashing | Manual byte manipulation | `hashlib.sha256()` | stdlib, C implementation, no dependencies |
| Full-text search | Custom LIKE/ILIKE queries | PostgreSQL `tsvector` + `GIN` index | Stemming, ranking, highlighting via `ts_headline()`, zero external deps |
| AI API client | Custom httpx calls to Claude | `anthropic.AsyncAnthropic` | Official SDK handles auth, retries, rate limits, streaming, type safety |

**Key insight:** Phase 2 services compose existing infrastructure (adapters, models, schemas). The complexity is in business logic (GPA math, dedup algorithms), not in framework integration.

## Common Pitfalls

### Pitfall 1: Float Rounding in GPA/WAM Calculation
**What goes wrong:** Using Python `float` for WAM calculation produces results like `78.49999999999999` instead of `78.50`. Students comparing with official USYD WAM notice discrepancies.
**Why it happens:** IEEE 754 floating-point cannot represent all decimal fractions exactly. Repeated multiplication/division accumulates error.
**How to avoid:** Use `Decimal` for ALL intermediate GPA/WAM calculations. Convert `float` from database to `Decimal(str(value))` at service boundary. Use `ROUND_HALF_UP` for final display.
**Warning signs:** WAM/GPA values with many trailing digits, or values that differ by 0.01 from expected.

### Pitfall 2: Deadline Dedup False Negatives from Title Normalization
**What goes wrong:** "Assignment 1 - Due Oct 15" (Canvas) and "Assignment 1" (Ed Lessons) have different dedup keys because the Canvas title includes extra text.
**Why it happens:** SHA-256 is exact-match only. Different platforms append different suffixes to the same assignment title.
**How to avoid:** Two-phase dedup: (1) exact SHA-256 match first, (2) fuzzy Levenshtein match for same course + same due_date + high title similarity (> 80%).
**Warning signs:** Same assignment appearing twice in the deadline list with slightly different titles.

### Pitfall 3: APScheduler Job Overlap During Slow Sync
**What goes wrong:** A grade sync job takes longer than 15 minutes (e.g., due to rate limiting). The next scheduled run starts while the previous is still running. Two jobs compete for the same API quota.
**Why it happens:** APScheduler's default allows multiple concurrent instances of the same job.
**How to avoid:** Set `max_instances=1` on every scheduled job. APScheduler will skip the run if the previous instance is still executing.
**Warning signs:** Log entries showing concurrent sync for the same user/platform.

### Pitfall 4: tsvector Language Mismatch for Course Codes
**What goes wrong:** `to_tsvector('english', 'COMP2017')` stems the term and breaks exact matching of course codes. Searching for "COMP2017" returns no results.
**Why it happens:** The English stemmer treats alphanumeric tokens differently from natural language words.
**How to avoid:** Use `'simple'` dictionary for title/code fields (no stemming), `'english'` for content/description fields. Combine with weighted `setweight()`: code gets 'A' weight, content gets 'B' weight.
**Warning signs:** Search for course codes returning empty results.

### Pitfall 5: Anthropic API Rate Limits and Cost Overrun
**What goes wrong:** Generating folder descriptions for all modules across all courses on first sync triggers hundreds of API calls. At $1/M input tokens, costs accumulate. Rate limits trigger 429 errors.
**Why it happens:** No throttling on AI description generation during sync.
**How to avoid:** (1) Per-user daily limit (e.g., 100 calls/day) tracked in database, (2) generate descriptions only for NEW or CHANGED folders (compare hash of items list), (3) fallback to rule-based description when limit exceeded or API fails.
**Warning signs:** Anthropic API 429 responses, unexpectedly high API bill.

### Pitfall 6: Sync Engine Blocking Event Loop with BeautifulSoup Parsing
**What goes wrong:** Unit Outline HTML parsing with BeautifulSoup is CPU-bound. Running it on the async event loop blocks all concurrent requests for ~100ms per parse.
**Why it happens:** BeautifulSoup/lxml parsing is synchronous C code that holds the GIL.
**How to avoid:** Wrap CPU-bound parsing in `asyncio.to_thread()`:
```python
result = await asyncio.to_thread(parser.parse, raw_html)
```
**Warning signs:** API response latency spikes correlating with sync job execution.

### Pitfall 7: WhatIfScenario JSON Schema Drift
**What goes wrong:** `scores_json` JSONB column stores hypothetical scores as untyped JSON. Schema evolves over time, old scenarios become unparseable.
**Why it happens:** No validation on JSON structure at database level.
**How to avoid:** Define a Pydantic model for the JSON structure. Validate on write AND read. Include a `schema_version` field in the JSON.
**Warning signs:** `ValidationError` when loading old scenarios.

## Code Examples

Verified patterns from official sources and existing codebase:

### GPA Calculation with Decimal Precision
```python
# Source: Python decimal module docs + CONTEXT.md WAM formula

from decimal import Decimal, ROUND_HALF_UP

def calculate_wam(
    courses: list[tuple[Decimal, Decimal]],  # (mark, credit_points)
) -> Decimal:
    """Calculate WAM = sum(mark * cp) / sum(cp).

    All inputs must be Decimal. Returns Decimal rounded to 2 places.
    """
    total_weighted = sum(mark * cp for mark, cp in courses)
    total_credits = sum(cp for _, cp in courses)
    if total_credits == 0:
        return Decimal("0.00")
    return (total_weighted / total_credits).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )

def mark_to_grade_band(mark: Decimal) -> tuple[str, int]:
    """Map a percentage mark to USYD grade band and GPA point."""
    if mark >= Decimal("85"):
        return ("HD", 7)
    elif mark >= Decimal("75"):
        return ("D", 6)
    elif mark >= Decimal("65"):
        return ("CR", 5)
    elif mark >= Decimal("50"):
        return ("P", 4)
    else:
        return ("F", 0)
```

### Hypothesis Property-Based Test for GPA
```python
# Source: Hypothesis docs st.decimals() + CONTEXT.md invariants

from decimal import Decimal
from hypothesis import given, assume
from hypothesis import strategies as st

# Strategy: a list of (mark, credit_points) tuples
grade_strategy = st.tuples(
    st.decimals(min_value=Decimal("0"), max_value=Decimal("100"),
                allow_nan=False, allow_infinity=False, places=2),
    st.integers(min_value=1, max_value=24),  # credit points
)

@given(st.lists(grade_strategy, min_size=1, max_size=20))
def test_wam_always_between_0_and_100(grades):
    """WAM must always be in [0, 100] for valid inputs."""
    courses = [(mark, Decimal(str(cp))) for mark, cp in grades]
    wam = calculate_wam(courses)
    assert Decimal("0") <= wam <= Decimal("100")

@given(st.lists(grade_strategy, min_size=1, max_size=20))
def test_gpa_always_between_0_and_7(grades):
    """GPA (7-point) must always be in {0, 4, 5, 6, 7}."""
    courses = [(mark, Decimal(str(cp))) for mark, cp in grades]
    wam = calculate_wam(courses)
    _, gpa = mark_to_grade_band(wam)
    assert gpa in (0, 4, 5, 6, 7)
```

### Fuzzy Deadline Dedup with rapidfuzz
```python
# Source: rapidfuzz docs + CONTEXT.md dedup decision

from rapidfuzz import fuzz

FUZZY_THRESHOLD = 80  # Similarity ratio threshold (0-100)

def find_near_duplicates(
    new_title: str,
    existing_titles: list[str],
    course_code: str,
    due_date: str,
) -> str | None:
    """Find a near-duplicate deadline by fuzzy title matching.

    Returns the matching existing title if found, None otherwise.
    Only compares within same course + same due_date.
    """
    normalized_new = normalize_title(new_title)
    for existing in existing_titles:
        normalized_existing = normalize_title(existing)
        ratio = fuzz.ratio(normalized_new, normalized_existing)
        if ratio >= FUZZY_THRESHOLD:
            return existing
    return None
```

### APScheduler 3.11 AsyncIOScheduler in FastAPI Lifespan
```python
# Source: APScheduler 3.11 docs + FastAPI lifespan docs

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI

scheduler = AsyncIOScheduler(timezone="UTC")

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage sync engine lifecycle."""
    scheduler.start()
    app.state.scheduler = scheduler
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
```

### Anthropic SDK Async Call for Folder Descriptions
```python
# Source: anthropic Python SDK docs + CONTEXT.md AI decisions

from anthropic import AsyncAnthropic

client = AsyncAnthropic()  # Uses ANTHROPIC_API_KEY env var

async def generate_folder_description(
    folder_name: str,
    item_names: list[str],
    course_name: str,
) -> str:
    """Generate a one-sentence AI description for a course folder."""
    items_text = ", ".join(item_names[:20])  # Cap items for token efficiency
    try:
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=100,
            messages=[{
                "role": "user",
                "content": (
                    f"Write ONE sentence describing this course folder.\n"
                    f"Course: {course_name}\n"
                    f"Folder: {folder_name}\n"
                    f"Contents: {items_text}\n"
                    f"Be concise and informative."
                ),
            }],
        )
        return response.content[0].text.strip()
    except Exception:
        # Fallback to rule-based description
        file_count = len(item_names)
        types = _summarize_file_types(item_names)
        return f"Contains {file_count} files, mainly {types}"
```

### PostgreSQL tsvector on ModuleItem and Lesson (Alembic Migration)
```python
# Source: Existing DiscussionThread.search_vector pattern + TRD SS15.5

# In Alembic migration:
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import TSVECTOR

def upgrade() -> None:
    # Add search_vector to module_items
    op.add_column(
        "module_items",
        sa.Column(
            "search_vector",
            TSVECTOR,
            sa.Computed(
                "to_tsvector('simple', coalesce(title, ''))",
                persisted=True,
            ),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_module_items_search",
        "module_items",
        ["search_vector"],
        postgresql_using="gin",
    )

    # Add search_vector to lessons
    op.add_column(
        "lessons",
        sa.Column(
            "search_vector",
            TSVECTOR,
            sa.Computed(
                "setweight(to_tsvector('simple', coalesce(title, '')), 'A') || "
                "setweight(to_tsvector('english', coalesce("
                "(SELECT string_agg(s.content, ' ') FROM slides s WHERE s.lesson_id = lessons.id)"
                ", '')), 'B')",
                persisted=True,
            ),
            nullable=True,
        ),
    )
    # NOTE: Lesson search_vector with subquery in GENERATED ALWAYS is not
    # supported in PostgreSQL. Use a trigger instead, or compute at insert time.
```

**IMPORTANT NOTE on Lesson search_vector:** PostgreSQL `GENERATED ALWAYS AS` columns cannot reference other tables (no subqueries). For Lessons, the search vector must use only columns from the `lessons` table itself. Options:
1. Add a `text_content` column to `lessons` that aggregates slide content during sync (denormalization).
2. Use a PostgreSQL trigger function to update `search_vector` when slides change.
3. Compute the tsvector at query time (slower but simpler).

**Recommendation:** Option 1 (denormalization) -- add a `text_content: Mapped[str | None]` column to Lesson, populate it during sync by concatenating slide contents. The `search_vector` GENERATED column then references `text_content`.

### Ed Discussion Regex Deadline Extraction
```python
# Source: CONTEXT.md decision -- regex rules for Phase 2

import re
from datetime import datetime

# Common patterns found in Ed Discussion posts
DATE_PATTERNS = [
    # "due by October 15" / "due on Oct 15"
    re.compile(
        r"(?:due\s+(?:by|on|before)\s+)"
        r"(\w+\s+\d{1,2}(?:,?\s*\d{4})?)",
        re.IGNORECASE,
    ),
    # "deadline: Friday 5pm" / "deadline is March 20"
    re.compile(
        r"(?:deadline\s*(?:is|:)\s*)"
        r"(\w+\s+\d{1,2}(?:,?\s*\d{4})?(?:\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))?)",
        re.IGNORECASE,
    ),
    # "submit by 11:59pm on March 20"
    re.compile(
        r"(?:submit\s+(?:by|before)\s+)"
        r"(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:on\s+)?\w+\s+\d{1,2})",
        re.IGNORECASE,
    ),
    # ISO-like: "2026-03-20" or "20/03/2026"
    re.compile(r"\b(\d{4}-\d{2}-\d{2})\b"),
    re.compile(r"\b(\d{1,2}/\d{1,2}/\d{4})\b"),
]

def extract_deadlines_from_text(text: str) -> list[str]:
    """Extract potential deadline date strings from Ed Discussion post text.

    Returns raw date strings for further parsing. Phase 4 AI will
    handle complex/ambiguous cases.
    """
    matches = []
    for pattern in DATE_PATTERNS:
        for match in pattern.finditer(text):
            matches.append(match.group(1).strip())
    return matches
```

### Sync Status Tracking
```python
# Source: CONTEXT.md sync decisions

from enum import StrEnum
from datetime import datetime

class SyncStatus(StrEnum):
    SUCCESS = "success"
    FAILED = "failed"
    SYNCING = "syncing"
    DEGRADED = "degraded"  # Token expired or repeated failures

# Add to User model or create SyncState table:
# For MVP: add columns to User table
# user.canvas_sync_status: str
# user.canvas_last_synced_at: datetime | None
# user.ed_sync_status: str
# user.ed_last_synced_at: datetime | None
# user.canvas_token_status: str  # "active" | "expired" | "not_configured"
# user.ed_token_status: str
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| APScheduler 4.x alpha | APScheduler 3.11 stable | 4.x still alpha as of March 2026 | Use 3.11 `AsyncIOScheduler` -- production-ready |
| python-Levenshtein (GPL) | rapidfuzz (MIT) | rapidfuzz matured 2021+ | Faster, MIT-licensed, more functions |
| FuzzyWuzzy | rapidfuzz | rapidfuzz is drop-in replacement | 5-100x faster, same API |
| Manual GPA edge-case tests | Hypothesis property testing | Standard practice | Catches edge cases humans miss |
| claude-3-haiku | claude-haiku-4-5 | October 2025 | Better quality, same cost tier |

**Deprecated/outdated:**
- APScheduler 4.x: Still alpha (4.0.0a6). Do NOT use in production. Use 3.11.x.
- python-Levenshtein: GPL license conflict, slower than rapidfuzz.
- FuzzyWuzzy: Deprecated in favor of rapidfuzz.

## Open Questions

1. **Grade table upsert key**
   - What we know: Current Grade table has no unique constraint suitable for upsert. The `(course_id, assessment_name)` pair should be unique per course.
   - What's unclear: Whether Canvas can have duplicate assessment names within a course (e.g., "Quiz" appearing multiple times).
   - Recommendation: Add unique constraint on `(course_id, assessment_name)` in migration. If Canvas has duplicate names, append a disambiguator (e.g., group_name prefix).

2. **Lesson tsvector with slide content**
   - What we know: PostgreSQL GENERATED ALWAYS cannot reference other tables (slides).
   - What's unclear: Whether a denormalized `text_content` column is acceptable or if a trigger is preferred.
   - Recommendation: Add `text_content` column to Lesson model, populate during sync. Simpler than triggers, aligns with sync-then-index pattern.

3. **APScheduler per-user job granularity**
   - What we know: Need per-user sync with independent schedules.
   - What's unclear: Whether to create one APScheduler job per user (N jobs) or one job that iterates all users.
   - Recommendation: One job per sync type (grades, deadlines, modules) that iterates all active users. Per-user jobs would create O(N) scheduler entries -- unnecessary for MVP. Use asyncio.gather() for per-user parallelism within each job.

4. **WhatIfScenario table migration**
   - What we know: Need new `whatif_scenarios` table + `target_wam`/`target_gpa` columns on User.
   - What's unclear: User model already has `gpa_target: float | None`. May need to add `target_wam` separately or rename.
   - Recommendation: Keep existing `gpa_target` as the WAM target. Add `target_gpa_7pt: float | None` for 7-point GPA target. The CONTEXT.md specifies `target_wam` and `target_gpa` as separate fields.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio 0.25+ |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `pytest tests/ -x --timeout=60` |
| Full suite command | `mypy src/ && pytest && ruff check .` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GPA-01 | WAM/GPA calculation from synced grades | unit + property | `pytest tests/unit/test_gpa_service.py -x` | No -- Wave 0 |
| GPA-02 | What-if simulation returns predicted WAM/GPA | unit | `pytest tests/unit/test_gpa_service.py::test_whatif -x` | No -- Wave 0 |
| GPA-03 | Target path returns minimum scores per assessment | unit | `pytest tests/unit/test_gpa_service.py::test_target_path -x` | No -- Wave 0 |
| GPA-04 | Assessment weight breakdown per course | integration | `pytest tests/integration/test_gpa_routes.py -x` | No -- Wave 0 |
| GPA-05 | Per-course WAM with grade band | unit | `pytest tests/unit/test_gpa_service.py::test_course_summary -x` | No -- Wave 0 |
| DL-01 | Unified deduplicated deadline list | unit + scenario | `pytest tests/unit/test_deadline_service.py -x` | No -- Wave 0 |
| INTEL-01 | Endorsed/staff-answered post filtering | integration | `pytest tests/integration/test_intelligence_routes.py -x` | No -- Wave 0 |
| INTEL-05 | Cross-source dedup | unit | `pytest tests/unit/test_deadline_service.py::test_dedup -x` | No -- Wave 0 |
| FILE-01 | Course folders with AI descriptions | unit + integration | `pytest tests/unit/test_materials_service.py -x` | No -- Wave 0 |
| FILE-02 | Keyword search with snippets | integration | `pytest tests/integration/test_search.py -x` | No -- Wave 0 |
| INFRA-02 | Background sync on intervals | integration | `pytest tests/integration/test_sync_engine.py -x` | No -- Wave 0 |
| PLAT-04 | Token expiration warning | integration | `pytest tests/integration/test_sync_engine.py::test_token_expiry -x` | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest tests/ -x --timeout=60`
- **Per wave merge:** `mypy src/ && pytest && ruff check .`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_gpa_service.py` -- covers GPA-01 through GPA-05 (Hypothesis property tests + scenario tests)
- [ ] `tests/unit/test_deadline_service.py` -- covers DL-01, INTEL-05 (dedup scenario tests, fuzzy matching)
- [ ] `tests/unit/test_materials_service.py` -- covers FILE-01 (AI description with fallback)
- [ ] `tests/integration/test_gpa_routes.py` -- covers GPA-04, GPA endpoint integration
- [ ] `tests/integration/test_deadline_routes.py` -- covers DL-01 endpoint integration
- [ ] `tests/integration/test_search.py` -- covers FILE-02 (tsvector search)
- [ ] `tests/integration/test_sync_engine.py` -- covers INFRA-02, PLAT-04 (sync lifecycle, token expiry)
- [ ] `tests/integration/test_intelligence_routes.py` -- covers INTEL-01 (Ed post filtering)
- [ ] New dependencies in pyproject.toml: `apscheduler`, `anthropic`, `rapidfuzz`, `hypothesis`
- [ ] Alembic migration for: WhatIfScenario table, User table changes (target columns, sync status columns), tsvector columns on ModuleItem and Lesson, unique constraint on Grade(course_id, assessment_name)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/adapters/canvas.py`, `src/adapters/ed_discussion.py`, `src/adapters/ed_lessons.py`, `src/schemas/common.py`, `src/web/deps.py`, `src/models/*`, `src/web/routes/*` -- verified patterns
- `docs/UniBoard_TRD_v2.md` SS3, SS4, SS12, SS14, SS15 -- architecture, data model, REST API, error handling, database management
- `.planning/phases/02-core-services-api/02-CONTEXT.md` -- all locked decisions
- [APScheduler PyPI](https://pypi.org/project/APScheduler/) -- v3.11.2 stable, 4.0.0a6 alpha
- [RapidFuzz PyPI](https://pypi.org/project/RapidFuzz/) -- v3.14.3
- [Hypothesis PyPI](https://pypi.org/project/hypothesis/) -- v6.151.9
- [Anthropic SDK PyPI](https://pypi.org/project/anthropic/) -- v0.84.0

### Secondary (MEDIUM confidence)
- [APScheduler 3.11 AsyncIOScheduler docs](https://apscheduler.readthedocs.io/en/3.x/modules/schedulers/asyncio.html) -- asyncio integration patterns
- [FastAPI lifespan docs](https://fastapi.tiangolo.com/advanced/events/) -- lifespan context manager
- [Hypothesis strategies reference](https://hypothesis.readthedocs.io/en/latest/reference/strategies.html) -- `st.decimals()` parameters
- [RapidFuzz documentation](https://rapidfuzz.github.io/RapidFuzz/) -- `fuzz.ratio()` API
- [SQLAlchemy PostgreSQL dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html) -- `insert().on_conflict_do_update()`

### Tertiary (LOW confidence)
- APScheduler per-user scheduling granularity -- based on training data, needs validation in implementation
- Lesson tsvector with denormalized content -- design choice, not verified against PostgreSQL limitations empirically

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all versions verified against PyPI, existing codebase patterns confirmed
- Architecture: HIGH -- follows established Phase 1 patterns, TRD-specified service structure
- Pitfalls: HIGH -- GPA float precision is well-documented, tsvector language issue is known PostgreSQL behavior
- APScheduler 3.11 vs 4.x: HIGH -- verified 4.x is alpha (4.0.0a6), 3.11.2 is latest stable
- Validation architecture: HIGH -- extends existing test infrastructure with new unit test files

**Research date:** 2026-03-16
**Valid until:** 2026-04-16 (stable domain, 30-day validity)
