# Phase 20: Skill System - Research

**Researched:** 2026-03-29
**Domain:** MCP Agent skill auto-generation, tool execution pipeline, JSONB-backed workflow storage
**Confidence:** HIGH

## Summary

Phase 20 builds a runtime skill system that captures successful MCP Agent interaction patterns and replays them for efficiency. The implementation splits into three major subsystems: (1) ORM models and Alembic migration for `skills` and `skill_executions` tables with JSONB columns, (2) a `ToolExecutor` class connecting the `_execute_tool` placeholder (qa.py:256) to real adapters (Canvas, Ed Discussion, Ed Lessons), and (3) a `SkillService` orchestrating skill lookup, execution tracing, auto-generation from repeated successful traces, and lifecycle management.

The existing codebase provides strong foundations: `AIEngine.agent_stream()` already implements the tool_use loop, all three adapters are production-ready with circuit breakers and rate limiting, `src/prompts/*.py` provides 6 bilingual prompt files ready for conversion to seeded skills, and the ORM follows consistent UUIDMixin + TimestampMixin + Base patterns. The Course model already uses `JSON` (from `sqlalchemy`) for `grading_weights`, establishing precedent for JSONB columns.

**Primary recommendation:** Implement in layers -- (1) models + migration, (2) ToolExecutor connecting adapters, (3) SkillService with lookup/trace/auto-gen, (4) pre-seed ~12 core skills from existing prompts, (5) wire into QAService replacing the `_execute_tool` stub.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** PostgreSQL `skills` table with JSONB columns for `workflow_steps`, `tool_sequence`, and `parameters`. Follows existing ORM pattern (UUIDMixin + TimestampMixin + Base). Alembic migration required.
- **D-02:** Key columns: `operation_type` (enum string for matching), `course_id` (FK nullable -- NULL=global, set=per-course), `system_prompt` (text), `is_seeded` (bool), `version` (int), `success_count`/`failure_count` (int), `last_used_at` (datetime nullable).
- **D-03:** Category taxonomy mirrors existing `.claude/skills/` structure: `data_collection`, `data_processing`, `ai_analysis`, `user_action`.
- **D-04:** A skill = a complete multi-step workflow. Includes: tool call sequence with parameter templates, system prompt, course-specific parameters, output format specification.
- **D-05:** Two-phase lookup: (1) exact match on `(operation_type, course_id)` -> per-course skill, (2) fallback to `(operation_type, course_id=NULL)` -> global skill, (3) no match -> full exploration via `agent_stream()`.
- **D-06:** No embedding-based semantic matching -- operation_type enum is sufficient for UniBoard's bounded domain (~50 operations).
- **D-07:** Do NOT generate skill on first success. Record `SkillExecution` traces. When same `(operation_type, course_id)` has >= 2 successful traces with > 70% step pattern similarity, extract common pattern into a draft skill.
- **D-07b:** New `skill_executions` table: tracks each `agent_stream()` run with `execution_trace` JSONB (tool calls, inputs, outputs), `success` bool, `latency_ms`, `tokens_used`.
- **D-08:** Quality gate: compatible with Phase 18 F1 monitoring. Auto-generated skills start as `status=draft`, become `active` after first successful replay. Skills with `success_rate < 70%` auto-degrade to `needs_update`, triggering re-exploration.
- **D-09:** Dedup: if `(operation_type, course_id)` already exists, increment `version` and update rather than create duplicate.
- **D-10:** Hybrid approach. Pre-seed ~10-15 core skills from existing `src/prompts/*.py` + 3-5 workflow skills from `/check-deadlines` pattern. Auto-generation fills to ~50 over time.
- **D-11:** Hybrid discovery: auto-detect course characteristics during first sync, store in skill `parameters` JSONB. Users can override/supplement via Settings page.
- **D-12:** Skill system is backend-invisible. Students see faster responses but no skill metadata in UI. No frontend changes needed.
- **D-13:** Connect `_execute_tool` stub in `qa.py:256` to real adapters via a `ToolExecutor` class that routes tool names to adapter methods.
- **D-14:** `ToolExecutor` requires user's decrypted tokens + course context. Injected via the same `Depends()` DI pattern as other services.
- **D-15:** Lifecycle state machine: `draft -> active -> needs_update -> active (version++) -> deprecated -> archived`.
- **D-16:** `SkillExecution` history provides full audit trail. No diff/rollback needed.

### Claude's Discretion
- Specific pre-seeded skill definitions (exact prompts, tool sequences) -- researcher/planner can determine optimal configurations
- Migration seeding strategy (Alembic data migration vs app startup seeder)
- ToolExecutor error handling details (retry, fallback to direct context)

### Deferred Ideas (OUT OF SCOPE)
- **Skill marketplace/sharing** -- Let students share effective skills across courses (belongs in v2+)
- **Skill analytics dashboard** -- Admin view of skill usage, success rates, auto-generation activity (belongs in M4: Operations)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SKILL-01 | After first successful API exploration for an operation, system auto-generates a prompt template skill capturing the optimal steps | D-07 trace recording + auto-generation after 2+ successful traces with >70% similarity. SkillService.maybe_generate_skill() analyzes SkillExecution history. |
| SKILL-02 | Subsequent executions of the same operation load and follow the generated skill instead of re-exploring | D-05 two-phase lookup (per-course -> global -> fallback). SkillService.get_skill() before agent_stream() call. |
| SKILL-03 | Skills are per-course differentiated (different courses may have different material organization patterns) | D-11 course characteristic detection + D-02 nullable course_id FK pattern (NULL=global, set=per-course). |
| SKILL-04 | ~50 skills covering data collection, data processing, AI analysis, and user action dimensions | D-10 hybrid: ~12-15 pre-seeded from existing prompts + ~35-38 auto-generated over time. D-03 category taxonomy. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SQLAlchemy | 2.0+ (installed) | ORM for Skill/SkillExecution models | Already used for all 16+ models in project |
| Alembic | 1.14+ (installed) | Database migration for new tables | Standard migration tool, 7 existing migrations |
| asyncpg | 0.30+ (installed) | Async PostgreSQL with native JSONB | Already project's DB driver |
| structlog | 24.0+ (installed) | Structured logging for skill events | Already used in all services |
| Anthropic SDK | 0.84+ (installed) | Claude API calls via AIEngine | Already used in ai_engine.py |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| difflib (stdlib) | 3.12 | SequenceMatcher for step pattern similarity | D-07 auto-generation trigger (>70% similarity) |
| httpx | 0.28+ (installed) | HTTP client inside adapters | ToolExecutor delegates to existing adapters |
| cryptography | 43+ (installed) | Token decryption for adapter auth | ToolExecutor needs decrypted Canvas/Ed tokens |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| difflib.SequenceMatcher | rapidfuzz (installed) | rapidfuzz is for fuzzy string matching, SequenceMatcher is better for list-of-steps comparison |
| JSONB columns | Separate normalized tables | JSONB is simpler for workflow_steps/tool_sequence which are inherently semi-structured; existing Course.grading_weights precedent |
| App-startup seeder | Alembic data migration | Seeder is more flexible (can re-seed on version bump) and simpler to test/debug than data migrations |

**Installation:**
No new dependencies required. All needed packages are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── models/
│   └── skill.py            # Skill + SkillExecution ORM models
├── services/
│   ├── skill.py            # SkillService (lookup, trace, auto-gen, lifecycle)
│   └── tool_executor.py    # ToolExecutor (routes tool names to adapters)
├── schemas/
│   └── skill.py            # Pydantic schemas (SkillStatus enum, etc.)
├── web/routes/
│   └── ai.py               # Modify: inject ToolExecutor into QAService
├── prompts/
│   └── *.py                # Existing -- used to seed skills
└── adapters/
    └── *.py                # Existing -- ToolExecutor delegates to these
alembic/versions/
    └── 007_phase20_skill_system.py  # New migration
```

### Pattern 1: Two-Phase Skill Lookup
**What:** Check for per-course skill first, fall back to global, then fallback to raw exploration.
**When to use:** Every agent_stream() call in QAService.
**Example:**
```python
# Source: D-05 from CONTEXT.md
async def get_skill(
    self,
    operation_type: str,
    course_id: uuid.UUID | None,
) -> Skill | None:
    """Two-phase lookup: per-course -> global -> None (trigger exploration)."""
    # Phase 1: exact match (operation_type, course_id)
    if course_id is not None:
        stmt = select(Skill).where(
            Skill.operation_type == operation_type,
            Skill.course_id == course_id,
            Skill.status == SkillStatus.ACTIVE,
        )
        result = await self._session.execute(stmt)
        skill = result.scalar_one_or_none()
        if skill is not None:
            return skill

    # Phase 2: global fallback (operation_type, course_id=NULL)
    stmt = select(Skill).where(
        Skill.operation_type == operation_type,
        Skill.course_id.is_(None),
        Skill.status == SkillStatus.ACTIVE,
    )
    result = await self._session.execute(stmt)
    return result.scalar_one_or_none()
```

### Pattern 2: ToolExecutor Routing
**What:** Maps AGENT_TOOLS tool names to adapter method calls with user tokens.
**When to use:** Replaces `_execute_tool` stub in qa.py.
**Example:**
```python
# Source: D-13 from CONTEXT.md + existing adapter patterns
class ToolExecutor:
    """Route tool calls to real platform adapters."""

    def __init__(
        self,
        canvas_token: str | None,
        ed_token: str | None,
        course: Course,
    ) -> None:
        self._canvas_token = canvas_token
        self._ed_token = ed_token
        self._course = course

    async def execute(
        self, name: str, input_data: dict[str, object]
    ) -> str:
        """Execute tool call, return text result for Claude."""
        if name == "search_canvas_modules":
            return await self._search_canvas(str(input_data.get("query", "")))
        elif name == "search_ed_threads":
            return await self._search_ed_threads(str(input_data.get("query", "")))
        elif name == "get_ed_lesson_content":
            return await self._get_ed_lesson(int(input_data.get("lesson_id", 0)))
        else:
            return f"Unknown tool: {name}"
```

### Pattern 3: Execution Trace Recording
**What:** After each agent_stream() call, record the tool call sequence for auto-generation analysis.
**When to use:** After every agent exploration (non-skill-based) call.
**Example:**
```python
# Source: D-07b from CONTEXT.md
async def record_execution(
    self,
    operation_type: str,
    course_id: uuid.UUID | None,
    execution_trace: list[dict[str, object]],
    success: bool,
    latency_ms: int,
    tokens_used: int,
) -> None:
    """Record a tool execution trace for future skill generation."""
    execution = SkillExecution(
        operation_type=operation_type,
        course_id=course_id,
        execution_trace=execution_trace,
        success=success,
        latency_ms=latency_ms,
        tokens_used=tokens_used,
    )
    self._session.add(execution)
    await self._session.flush()
```

### Pattern 4: Auto-Generation from Trace Intersection
**What:** When 2+ successful traces for same (operation_type, course_id) show >70% step similarity, extract the common pattern.
**When to use:** Called after recording a new successful trace.
**Example:**
```python
# Source: D-07 from CONTEXT.md
from difflib import SequenceMatcher

def _step_similarity(
    trace_a: list[str], trace_b: list[str]
) -> float:
    """Compare tool call sequences. Returns 0.0-1.0."""
    return SequenceMatcher(None, trace_a, trace_b).ratio()

async def maybe_generate_skill(
    self,
    operation_type: str,
    course_id: uuid.UUID | None,
) -> Skill | None:
    """Check if we have enough traces to auto-generate a skill."""
    # Fetch successful traces
    stmt = select(SkillExecution).where(
        SkillExecution.operation_type == operation_type,
        SkillExecution.course_id == course_id,
        SkillExecution.success.is_(True),
    ).order_by(SkillExecution.created_at.desc()).limit(5)
    result = await self._session.execute(stmt)
    traces = result.scalars().all()

    if len(traces) < 2:
        return None

    # Compare most recent pair
    steps_a = [s["tool_name"] for s in traces[0].execution_trace]
    steps_b = [s["tool_name"] for s in traces[1].execution_trace]

    if _step_similarity(steps_a, steps_b) < 0.7:
        return None

    # Extract common pattern -> create draft skill
    # ... intersection logic
```

### Anti-Patterns to Avoid
- **Embedding-based matching:** D-06 explicitly prohibits this. operation_type enum is sufficient for ~50 bounded operations. Embeddings add latency + complexity for no benefit.
- **Generating skill on first success:** D-07 requires >= 2 successful traces with similarity check. Single traces may be anomalous.
- **Storing tool results in skill:** Skills store the tool SEQUENCE and PARAMETERS, not actual results. Results are always fresh from adapters.
- **JSONB without type hints:** Use `Mapped[dict[str, object]]` (not `Mapped[Any]`) with `mapped_column(JSON)` -- follows Course.grading_weights pattern.
- **Creating adapter instances per-request without cleanup:** ToolExecutor must use `async with` or explicit close to prevent connection leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Step sequence comparison | Custom diff algorithm | `difflib.SequenceMatcher` | Handles insertions, deletions, moves; >70% threshold maps directly to `.ratio()` |
| JSONB storage | Custom serialization layer | SQLAlchemy `JSON` type + asyncpg native JSONB | Zero-overhead native support, already used in Course.grading_weights |
| Token decryption | New crypto layer | Existing `TokenEncryption.decrypt()` | AES-256-GCM already implemented and tested |
| Rate limiting for AI calls | New limiter | Existing `QAService._check_and_increment_limit()` | Per-user daily limit already enforced |
| Circuit breaking for adapters | New circuit breaker | Existing `CircuitBreaker` class in adapters | Each adapter already composes this |
| Retry logic for tool calls | Custom retry | Existing `RetryConfig` in adapters | Adapters handle retry internally |

**Key insight:** The existing adapter layer already handles ALL resilience concerns (rate limiting, circuit breaking, retry, token validation). ToolExecutor is a thin routing layer, NOT a resilience layer.

## Common Pitfalls

### Pitfall 1: JSONB Column Type in Alembic Migration
**What goes wrong:** Using `sa.Column` as type (instead of a real type) in Alembic migrations causes `SchemaEventTarget._set_parent_with_dispatch()` error.
**Why it happens:** Project CLAUDE.md documents this exact issue from a previous phase -- executor didn't know how to represent non-standard types in migrations.
**How to avoid:** Use `sa.Column("workflow_steps", JSON, nullable=True)` where JSON is imported from `sqlalchemy.dialects.postgresql`. Standard JSON type works fine in Alembic.
**Warning signs:** `SchemaEventTarget` error during `alembic upgrade`.

### Pitfall 2: Adapter Connection Leaks in ToolExecutor
**What goes wrong:** Creating CanvasAdapter/EdDiscussionAdapter/EdLessonsAdapter per tool call without closing them leaks httpx connections.
**Why it happens:** Adapters own `httpx.AsyncClient` instances that must be explicitly closed.
**How to avoid:** Create adapters once per request in ToolExecutor.__init__() and provide a `close()` method called when done. Or use a context manager pattern.
**Warning signs:** `ResourceWarning: unclosed <httpx.AsyncClient>` in test output.

### Pitfall 3: Nullable course_id FK Comparison
**What goes wrong:** `Skill.course_id == None` generates incorrect SQL. Must use `.is_(None)` for NULL comparison.
**Why it happens:** SQLAlchemy `==` generates `= NULL` which always evaluates to NULL (not TRUE) in PostgreSQL.
**How to avoid:** Always use `Skill.course_id.is_(None)` for NULL checks. Already shown in Pattern 1 above.
**Warning signs:** Global skill lookup always returns None.

### Pitfall 4: Naive Datetimes with asyncpg
**What goes wrong:** Using `datetime.now(UTC)` (tz-aware) with TIMESTAMP WITHOUT TIME ZONE columns causes asyncpg DataError.
**Why it happens:** Phase 15 discovered this: asyncpg strict-checks timezone vs column type.
**How to avoid:** Use `datetime.utcnow()` for TIMESTAMP columns (matches all existing models). Project STATE.md documents this decision.
**Warning signs:** `DataError: invalid input for query argument` during INSERT.

### Pitfall 5: Token Decryption Failure in ToolExecutor
**What goes wrong:** User has no Canvas/Ed token configured, ToolExecutor tries to decrypt NULL and crashes.
**Why it happens:** `Profile.canvas_api_token_encrypted` is nullable.
**How to avoid:** Check for None before decryption. Return graceful error message from tool execution: "Canvas token not configured. Please add your Canvas API token in Settings."
**Warning signs:** `TypeError: expected str, got NoneType` in encryption.decrypt().

### Pitfall 6: Circular Import Between QAService and SkillService
**What goes wrong:** QAService imports SkillService which imports AIEngine which is already imported by QAService.
**Why it happens:** Tight coupling between skill lookup and Q&A execution.
**How to avoid:** SkillService should NOT import AIEngine. Instead, QAService orchestrates: ask SkillService for skill -> if found, modify agent_stream() params -> call AIEngine directly. SkillService is a data service, not an execution service.
**Warning signs:** `ImportError: cannot import name 'X' from partially initialized module`.

## Code Examples

Verified patterns from existing codebase:

### ORM Model with JSONB (follows Course.grading_weights pattern)
```python
# Source: src/models/course.py line 39 + D-01/D-02 from CONTEXT.md
import uuid
from datetime import datetime

from sqlalchemy import Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base, TimestampMixin, UUIDMixin


class Skill(UUIDMixin, TimestampMixin, Base):
    """Reusable MCP Agent workflow template."""

    __tablename__ = "skills"
    __table_args__ = (
        Index("ix_skills_lookup", "operation_type", "course_id", "status"),
    )

    operation_type: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(30))  # data_collection | data_processing | ai_analysis | user_action
    course_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True
    )
    system_prompt: Mapped[str] = mapped_column(Text)
    workflow_steps: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # type: ignore[type-arg]
    tool_sequence: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # type: ignore[type-arg]
    parameters: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # type: ignore[type-arg]
    output_format: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft | active | needs_update | deprecated | archived
    is_seeded: Mapped[bool] = mapped_column(default=False)
    version: Mapped[int] = mapped_column(Integer, default=1)
    success_count: Mapped[int] = mapped_column(Integer, default=0)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    last_used_at: Mapped[datetime | None] = mapped_column(nullable=True)
```

### Alembic Migration with JSONB (follows existing migration patterns)
```python
# Source: alembic/versions/005_phase4_notifications_digest.py pattern
from sqlalchemy.dialects.postgresql import JSON, UUID

def upgrade() -> None:
    op.create_table(
        "skills",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("operation_type", sa.String(50), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("course_id", UUID(as_uuid=True), sa.ForeignKey("courses.id"), nullable=True),
        sa.Column("system_prompt", sa.Text, nullable=False),
        sa.Column("workflow_steps", JSON, nullable=True),
        sa.Column("tool_sequence", JSON, nullable=True),
        sa.Column("parameters", JSON, nullable=True),
        sa.Column("output_format", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), server_default="draft", nullable=False),
        sa.Column("is_seeded", sa.Boolean, server_default="false", nullable=False),
        sa.Column("version", sa.Integer, server_default="1", nullable=False),
        sa.Column("success_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("failure_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("last_used_at", sa.DateTime, nullable=True),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime, server_default=sa.func.now(), nullable=False),
    )
```

### DI Pattern for ToolExecutor (follows materials.py pattern)
```python
# Source: src/web/routes/materials.py line 23-27 + D-14 from CONTEXT.md
def _build_tool_executor(
    session: AsyncSession,
    user_id: uuid.UUID,
    course: Course,
    encryption: TokenEncryption,
) -> ToolExecutor:
    """Build ToolExecutor with decrypted user tokens."""
    profile = ...  # fetch from session
    canvas_token = (
        encryption.decrypt(profile.canvas_api_token_encrypted)
        if profile.canvas_api_token_encrypted
        else None
    )
    ed_token = (
        encryption.decrypt(profile.ed_api_token_encrypted)
        if profile.ed_api_token_encrypted
        else None
    )
    return ToolExecutor(
        canvas_token=canvas_token,
        ed_token=ed_token,
        course=course,
    )
```

### Pre-Seeded Skill Definition (from existing prompts)
```python
# Source: src/prompts/qa.py + src/prompts/thread_eval.py
SEEDED_SKILLS = [
    {
        "operation_type": "qa_direct",
        "category": "ai_analysis",
        "system_prompt": QA_SYSTEM_PROMPT,
        "tool_sequence": None,  # No tools needed for direct context
        "workflow_steps": {"steps": ["load_materials", "ask_question"]},
        "is_seeded": True,
        "status": "active",
    },
    {
        "operation_type": "thread_evaluation",
        "category": "ai_analysis",
        "system_prompt": THREAD_EVAL_SYSTEM_PROMPT,
        "tool_sequence": None,
        "workflow_steps": {"steps": ["parse_thread", "evaluate"]},
        "is_seeded": True,
        "status": "active",
    },
    {
        "operation_type": "deadline_check",
        "category": "data_collection",
        "system_prompt": "Multi-source deadline investigation workflow.",
        "tool_sequence": {
            "tools": [
                "search_canvas_modules",
                "search_ed_threads",
                "get_ed_lesson_content",
            ]
        },
        "workflow_steps": {
            "steps": [
                "collect_canvas_assignments",
                "collect_ed_deadlines",
                "cross_validate",
                "generate_summary",
            ]
        },
        "parameters": {"confidence_levels": ["confirmed", "possible", "uncertain"]},
        "is_seeded": True,
        "status": "active",
    },
]
```

## Discretion Recommendations

### Migration Seeding Strategy: App Startup Seeder (Recommended)
**Recommendation:** Use an app-startup seeder function (called from `create_app()` or a management command) rather than Alembic data migration.

**Rationale:**
1. Alembic data migrations are one-shot and cannot re-seed on version bumps. If we update a seeded skill's prompt, we'd need another migration.
2. An idempotent seeder (`INSERT ... ON CONFLICT DO UPDATE`) can safely run on every startup.
3. Easier to test -- just call the function with a session.
4. Existing Alembic migrations in this project are schema-only (no data).

```python
async def seed_skills(session: AsyncSession) -> int:
    """Idempotent skill seeding. Returns number of skills upserted."""
    count = 0
    for defn in SEEDED_SKILLS:
        existing = await session.execute(
            select(Skill).where(
                Skill.operation_type == defn["operation_type"],
                Skill.course_id.is_(None),
                Skill.is_seeded.is_(True),
            )
        )
        if existing.scalar_one_or_none() is None:
            session.add(Skill(**defn))
            count += 1
    await session.flush()
    return count
```

### ToolExecutor Error Handling: Per-Tool Graceful Degradation (Recommended)
**Recommendation:** Follow existing Ed adapter pattern -- catch exceptions per tool call, return informative error string (not raise). Claude will see the error in tool_result and adapt its response.

**Rationale:**
1. Adapters already handle retry + circuit breaking internally. ToolExecutor should NOT add another retry layer.
2. If Canvas is down but Ed is up, Claude should still get Ed results and answer partially.
3. Error strings become part of the conversation, so Claude can tell the user "Canvas was unavailable, but based on Ed Discussion..."

```python
async def _search_canvas(self, query: str) -> str:
    if not self._canvas_token:
        return "Canvas API token not configured. Ask user to add it in Settings."
    try:
        adapter = CanvasAdapter(api_token=self._canvas_token)
        try:
            modules = await adapter.get_modules(self._course.canvas_course_id)
            # ... filter by query, format results
            return formatted_results
        finally:
            await adapter.close()
    except TokenInvalidError:
        return "Canvas API token is invalid or expired. Ask user to update in Settings."
    except (UpstreamUnavailableError, UpstreamAPIError) as exc:
        return f"Canvas API temporarily unavailable: {exc}. Try again later."
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded prompts in `src/prompts/*.py` | Skill-backed prompts with workflow orchestration | Phase 20 | Prompts become queryable, versioned, per-course adaptable |
| `_execute_tool` stub returning placeholder text | ToolExecutor routing to real adapters | Phase 20 | MCP Agent actually executes cross-platform research |
| Every agent call explores from scratch | Skill lookup before exploration | Phase 20 | Repeated operations skip exploration, reducing latency and tokens |

**Deprecated/outdated:**
- `_execute_tool` placeholder in qa.py:256 -- replaced by ToolExecutor integration
- Direct prompt constant imports in services (still work, but skill lookup is preferred path)

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio 0.25+ |
| Config file | `pyproject.toml` [tool.pytest.ini_options] |
| Quick run command | `python -m pytest tests/unit/ -x --timeout=30` |
| Full suite command | `python -m pytest tests/ --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SKILL-01 | Auto-generate skill from 2+ successful traces with >70% similarity | unit | `python -m pytest tests/unit/test_skill_service.py::test_auto_generate_skill -x` | Wave 0 |
| SKILL-01 | Skip generation when <2 traces or <70% similarity | unit | `python -m pytest tests/unit/test_skill_service.py::test_skip_generation_insufficient_traces -x` | Wave 0 |
| SKILL-02 | Per-course skill lookup returns course-specific skill | unit | `python -m pytest tests/unit/test_skill_service.py::test_lookup_per_course -x` | Wave 0 |
| SKILL-02 | Global skill fallback when no per-course match | unit | `python -m pytest tests/unit/test_skill_service.py::test_lookup_global_fallback -x` | Wave 0 |
| SKILL-02 | Exploration fallback when no skill exists | unit | `python -m pytest tests/unit/test_skill_service.py::test_lookup_no_skill_triggers_exploration -x` | Wave 0 |
| SKILL-03 | Skills stored with course_id FK, queried per-course | unit | `python -m pytest tests/unit/test_skill_service.py::test_course_differentiation -x` | Wave 0 |
| SKILL-04 | Pre-seeded skills cover 4 categories | unit | `python -m pytest tests/unit/test_skill_service.py::test_seed_skills -x` | Wave 0 |
| D-13 | ToolExecutor routes search_canvas_modules to CanvasAdapter | unit | `python -m pytest tests/unit/test_tool_executor.py::test_search_canvas -x` | Wave 0 |
| D-13 | ToolExecutor routes search_ed_threads to EdDiscussionAdapter | unit | `python -m pytest tests/unit/test_tool_executor.py::test_search_ed_threads -x` | Wave 0 |
| D-13 | ToolExecutor routes get_ed_lesson_content to EdLessonsAdapter | unit | `python -m pytest tests/unit/test_tool_executor.py::test_get_ed_lesson -x` | Wave 0 |
| D-13 | ToolExecutor handles missing tokens gracefully | unit | `python -m pytest tests/unit/test_tool_executor.py::test_missing_token_graceful -x` | Wave 0 |
| D-08 | Skill lifecycle: draft -> active after successful replay | unit | `python -m pytest tests/unit/test_skill_service.py::test_lifecycle_draft_to_active -x` | Wave 0 |
| D-08 | Skill degradation: active -> needs_update when success_rate < 70% | unit | `python -m pytest tests/unit/test_skill_service.py::test_degradation -x` | Wave 0 |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/unit/test_skill_service.py tests/unit/test_tool_executor.py -x --timeout=30`
- **Per wave merge:** `python -m pytest tests/ --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_skill_service.py` -- covers SKILL-01 through SKILL-04, D-08
- [ ] `tests/unit/test_tool_executor.py` -- covers D-13 tool routing and error handling
- [ ] No new framework install needed -- pytest infrastructure already exists

## Open Questions

1. **Seeded skill count precision**
   - What we know: D-10 says ~10-15 from prompts + 3-5 workflow skills. 6 prompt files exist (qa, review, thread_eval, digest, translation, risk_analysis) with EN+ZH variants.
   - What's unclear: Do bilingual variants count as separate skills? Or one skill with a `language` parameter?
   - Recommendation: One skill per operation with `parameters.language` field. Keeps count cleaner and matches `get_qa_prompt(language)` pattern. ~12 seeded skills total.

2. **ToolExecutor lifecycle per-request**
   - What we know: Adapters own httpx.AsyncClient and must be closed. ToolExecutor creates adapters.
   - What's unclear: Should ToolExecutor be a context manager, or should it own a `close()` method called explicitly?
   - Recommendation: Implement `async def close(self)` method and call it in a `try/finally` in QAService. Matches existing adapter pattern.

3. **Skill execution trace size limits**
   - What we know: execution_trace JSONB stores full tool calls with inputs/outputs. Some adapter responses can be large (e.g., full module list).
   - What's unclear: Should we truncate adapter results before storing in trace?
   - Recommendation: Truncate tool output to 2000 chars in trace JSONB. Full results are ephemeral -- only the pattern matters for auto-generation.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Python 3.12 | All backend code | Yes | 3.12.7 | -- |
| uv | Package management | Yes | 0.6.8 | -- |
| mypy | Type checking | Yes | (installed) | -- |
| ruff | Linting | Yes | (installed) | -- |
| pytest | Testing | Yes | (installed) | -- |
| PostgreSQL | Database (via Supabase) | Assumed | -- | Local Docker |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Project Constraints (from CLAUDE.md)

- **Language:** Technical discussions in Chinese, code comments in English only
- **Validation commands:** `mypy --strict`, `ruff`, `pytest`
- **Commit format:** `{type}({phase}-{plan}): {description}` (GSD format)
- **Backend stack:** Python 3.12+, FastAPI, SQLAlchemy 2.0 async + asyncpg
- **Type checking:** mypy --strict (all new code must pass)
- **Test pattern:** pytest + pytest-asyncio, asyncio_mode="auto", session-scoped loop
- **No frontend changes:** D-12 explicitly states skill system is backend-invisible
- **ORM pattern:** UUIDMixin + TimestampMixin + Base for all new models
- **DI pattern:** `Depends(get_xxx_service)` factory in `src/web/deps.py`
- **Migration naming:** Sequential numbered prefix (next is 007)
- **Package manager:** uv for backend, pnpm 9+ for frontend
- **Adapter error pattern:** Per-item try/except, never crash batch
- **Naive datetimes:** Use `datetime.utcnow()` for TIMESTAMP WITHOUT TIME ZONE columns (asyncpg strict)
- **JSONB type:** Use `JSON` from `sqlalchemy.dialects.postgresql` in migrations, `JSON` from `sqlalchemy` in models (follows Course.grading_weights pattern which uses `sqlalchemy.JSON`)

## Sources

### Primary (HIGH confidence)
- `src/services/ai_engine.py` -- AIEngine.agent_stream() implementation, AGENT_TOOLS definition
- `src/services/qa.py` -- QAService._execute_tool placeholder at line 250-259
- `src/models/base.py` -- UUIDMixin, TimestampMixin, Base patterns
- `src/models/course.py` -- JSONB column precedent (grading_weights: JSON)
- `src/adapters/canvas.py` -- CanvasAdapter with 7 endpoints, resilience patterns
- `src/adapters/ed_discussion.py` -- EdDiscussionAdapter with graceful degradation
- `src/adapters/ed_lessons.py` -- EdLessonsAdapter with Pydantic parsing
- `src/security/encryption.py` -- TokenEncryption.decrypt() for adapter tokens
- `src/web/deps.py` -- DI pattern (Depends + factory functions)
- `alembic/versions/005_phase4_notifications_digest.py` -- Alembic migration pattern
- `src/prompts/*.py` -- All 6 prompt files (qa, review, thread_eval, digest, translation, risk_analysis)

### Secondary (MEDIUM confidence)
- [SQLAlchemy 2.0 PostgreSQL JSONB docs](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html) -- JSONB column mapping
- `difflib.SequenceMatcher` -- Python stdlib, verified for list comparison (ratio() returns 0.0-1.0)

### Tertiary (LOW confidence)
- None. All recommendations are based on existing codebase patterns and stdlib.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed and used in project
- Architecture: HIGH -- All patterns derived from existing codebase conventions
- Pitfalls: HIGH -- 5/6 pitfalls are from project-specific experience (CLAUDE.md, STATE.md)
- Validation: HIGH -- Test infrastructure exists, patterns well-established

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (30 days -- stable domain, no external API changes)
