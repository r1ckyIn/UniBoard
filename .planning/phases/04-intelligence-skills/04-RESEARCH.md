# Phase 4: Intelligence, Skills & MCP - Research

**Researched:** 2026-03-17
**Domain:** AI services (LLM integration), notification system, email delivery, vector search (RAG)
**Confidence:** HIGH

## Summary

Phase 4 transforms UniBoard from a data aggregation dashboard into a proactive intelligence system. The phase has four major work streams: (1) notification/reminder system with tiered deadline alerts and GPA risk detection, (2) AI-enhanced daily digest with urgency scoring and summary generation, (3) AI-powered course material Q&A with cited answers and unit review summaries, and (4) AI high-value Ed post extraction replacing the rule-based approach with LLM-driven relevance scoring.

The existing infrastructure is well-positioned for this phase. The Anthropic Python SDK (`anthropic>=0.84,<1.0`) is already in `pyproject.toml` with mypy overrides configured. The `ai_calls_today` rate limit field already exists on the User model. APScheduler is running and accepts new jobs. The `PushRecord` model handles notification dedup. The key technical challenges are: (a) designing the AI service abstraction with proper structured output parsing, (b) integrating pgvector for RAG on large courses, (c) implementing dual-channel notifications (in-app + AWS SES email), and (d) building the `.claude/skills/` auto-generation system for developer tooling.

**Primary recommendation:** Build the AIEngine as a concrete class (not ABC) using `anthropic.AsyncAnthropic` with `messages.parse()` for structured outputs. Add pgvector as an optional dependency that activates automatically for courses exceeding a content threshold. Use APScheduler for all scheduled jobs (digest generation, reminder checks) and PushRecord for notification dedup.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
1. **Notification channels**: Email (AWS SES) + in-app dual-channel
2. **Email service**: AWS SES (consistent with existing AWS stack)
3. **Digest time**: Daily at 07:00 AEST
4. **GPA risk trigger**: Trend detection primary, invoke Claude Opus 4.6 for deep analysis when risk signal detected
5. **Notification UI**: Sidebar bell icon + unread badge + dropdown notification list
6. **LLM**: Claude Opus 4.6 (for risk analysis and other deep tasks)
7. **Q&A architecture**: Hybrid -- small courses use direct context, large courses auto-switch to RAG/pgvector
8. **Citation format**: Inline citations `[Canvas: Week 3 Lecture Notes]`
9. **Digest AI**: Urgency scoring (1-5) + intelligent summary (both required)
10. **Quality gate**: TRD SS6 -- F1 < 75% auto-fallback to rule engine
11. **MCP Server**: DEFERRED to v1.1+
12. **Skill system**: Uses Claude Code's skills system (`.claude/skills/`), NOT database templates

### Claude's Discretion
- Specific model selection for non-risk tasks (can use lighter models like Sonnet for routine scoring)
- RAG chunk size and overlap strategy
- Notification table schema design
- AI service internal architecture details
- Embedding model choice for RAG

### Deferred Ideas (OUT OF SCOPE)
- MCP server open-source packaging (v1.1+)
- Password change functionality (future version)
- i18n page content translation (future optimization)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DL-02 | Tiered deadline reminders at 72h/24h/3h before due date | APScheduler periodic job + Notification model + PushRecord dedup + SES email |
| DL-03 | GPA risk alert when grade trajectory deviates from target | GPAService.get_summary existing data + trend detection algorithm + Claude deep analysis |
| INTEL-02 | AI-extracted high-value info from Ed Discussion (exam hints, assignment clarifications, rubric details, deadline changes) | Anthropic SDK structured output with TRD SS6.1 prompt + gpa_relevance_score field already on DiscussionThread |
| INTEL-03 | Daily digest aggregating new deadlines, grades, Ed posts (rule-based) | APScheduler CronTrigger at 07:00 AEST + existing services for data collection |
| INTEL-04 | AI-enhanced digest with urgency scoring and GPA relevance ranking | Claude API for urgency scoring (1-5) per item + summary generation with TRD SS6.2 prompt |
| FILE-03 | AI Q&A on course materials with cited answers | Hybrid architecture: direct context for small courses, pgvector RAG for large courses + citation extraction |
| FILE-04 | AI unit review summaries | Claude with course materials context + structured output for key_concepts, common_mistakes, exam_scope |
| PLAT-03 | MCP server for Claude Desktop | DEFERRED per CONTEXT.md -- skip entirely |
| SKILL-01 | Auto-generate skill template after first successful API exploration | `.claude/skills/` directory with SKILL.md per operation category |
| SKILL-02 | Subsequent executions load generated skills instead of re-exploring | Skill loading pattern: check `.claude/skills/{category}/SKILL.md` before execution |
| SKILL-03 | Skills are per-course differentiated | Course-specific skill files under `.claude/skills/{category}/courses/{code}.md` |
| SKILL-04 | ~50 skills covering data collection, processing, AI analysis, user actions | Skill template structure with categories and auto-generation logic |
</phase_requirements>

## Standard Stack

### Core (Backend -- AI & Notifications)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic | >=0.84,<1.0 | LLM API client (Claude Opus 4.6) | Already in pyproject.toml; official SDK with structured output support |
| pgvector | >=0.3,<1.0 | Vector similarity search for RAG | De facto standard for PostgreSQL vector search; native SQLAlchemy integration |
| voyageai | >=0.3,<1.0 | Text embeddings for RAG (voyage-3 model) | Anthropic-recommended embedding provider; 1024-dim vectors |
| boto3 | >=1.35,<2.0 | AWS SES email sending | Official AWS SDK; needed for SES integration |
| apscheduler | >=3.11,<4.0 | Scheduled digest/reminder jobs | Already running in sync engine; add new jobs |

### Core (Frontend -- Notification UI & AI Components)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-query | ^5.90 | Server state for notifications, AI responses | Already used throughout frontend |
| zustand | ^5.0 | Notification unread count store | Already used for UI state |
| lucide-react | ^0.577 | Bell icon, alert icons | Already used for all icons |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tiktoken | >=0.8,<1.0 | Token counting for context window management | Deciding direct-context vs RAG threshold |
| jinja2 | >=3.1,<4.0 | Email HTML templates | Digest email formatting |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| voyageai + pgvector | OpenAI embeddings + pgvector | Voyage is Anthropic-recommended; OpenAI adds vendor dependency |
| boto3 (SES) | fastapi-mail | fastapi-mail adds abstraction but SES-specific config still needed; boto3 gives full control |
| tiktoken | Manual character counting | Token counting is more accurate for context window decisions |
| pgvector | Pinecone / Qdrant | External service adds latency and cost; pgvector reuses existing PostgreSQL |

**Installation (new backend dependencies):**
```bash
pip install pgvector voyageai boto3 tiktoken jinja2
```

**Updated pyproject.toml dependencies to add:**
```toml
"pgvector>=0.3,<1.0",
"voyageai>=0.3,<1.0",
"boto3>=1.35,<2.0",
"tiktoken>=0.8,<1.0",
"jinja2>=3.1,<4.0",
```

**mypy overrides to add:**
```toml
[[tool.mypy.overrides]]
module = [
    "apscheduler.*",
    "anthropic.*",
    "rapidfuzz.*",
    "voyageai.*",
    "boto3.*",
    "botocore.*",
    "pgvector.*",
    "tiktoken.*",
]
ignore_missing_imports = true
follow_untyped_imports = false
```

## Architecture Patterns

### Recommended Project Structure (New Files)

```
src/
├── services/
│   ├── ai_engine.py         # AIEngine class (Claude integration, structured output)
│   ├── notification.py       # NotificationService (create, query, mark-read)
│   ├── digest.py             # DigestService (generate daily digest, AI-enhanced)
│   ├── risk_alert.py         # RiskAlertService (GPA trajectory deviation detection)
│   ├── qa.py                 # QAService (course material Q&A with citations)
│   └── intelligence.py       # Extend existing -- add AI thread evaluation
├── models/
│   ├── notification.py       # Notification ORM model
│   ├── digest.py             # Digest ORM model (generated digest storage)
│   └── embedding.py          # ContentEmbedding ORM model (pgvector)
├── schemas/
│   ├── notification.py       # Notification request/response schemas
│   ├── digest.py             # Digest request/response schemas
│   ├── ai.py                 # AI-related schemas (ThreadEvaluation, QAResponse, etc.)
│   └── intelligence.py       # Extend existing -- add AI fields
├── web/routes/
│   ├── notifications.py      # GET /notifications, PATCH /notifications/:id/read
│   ├── digest.py             # GET /digest/latest, GET /digest/history
│   ├── alerts.py             # GET /alerts
│   └── ai.py                 # POST /courses/:id/qa, GET /courses/:id/review
├── sync/
│   └── engine.py             # Extend -- add digest, reminder, risk alert jobs
└── email/
    ├── ses.py                # AWS SES client wrapper
    └── templates/            # Jinja2 email templates
        └── digest.html       # Daily digest email template

frontend/
├── components/
│   ├── notifications/
│   │   ├── NotificationBell.tsx    # Bell icon + unread badge
│   │   └── NotificationDropdown.tsx # Dropdown notification list
│   ├── ai/
│   │   ├── CourseQA.tsx            # Q&A chat interface
│   │   ├── UnitReview.tsx          # AI-generated unit review summary
│   │   └── AIHighValuePosts.tsx    # AI-scored posts (replace rule-based)
│   └── digest/
│       ├── DigestCard.tsx          # Extend -- add urgency score badges
│       └── DigestFeed.tsx          # Extend -- show AI-enhanced version
├── lib/
│   ├── hooks/
│   │   ├── useNotifications.ts     # TanStack Query hook for notifications
│   │   ├── useDigest.ts            # Hook for AI-enhanced digest
│   │   └── useAI.ts               # Hook for Q&A, review generation
│   └── stores/
│       └── notifications.ts        # Zustand store for unread count

.claude/skills/                     # Developer skill auto-generation
├── data-collection/
│   └── SKILL.md                   # Canvas/Ed data fetching patterns
├── data-processing/
│   └── SKILL.md                   # Parsing, dedup, aggregation patterns
├── ai-analysis/
│   └── SKILL.md                   # AI prompt patterns, quality gates
└── user-actions/
    └── SKILL.md                   # API endpoint patterns, error handling
```

### Pattern 1: AIEngine with Structured Output

**What:** Single AIEngine class wrapping Anthropic AsyncAnthropic client with `messages.parse()` for type-safe structured responses
**When to use:** All LLM interactions (thread evaluation, digest generation, Q&A, review summaries)
**Example:**
```python
# Source: Anthropic SDK official docs - structured outputs
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field

class ThreadEvaluation(BaseModel):
    """Structured output for Ed Discussion thread analysis."""
    gpa_relevance: float = Field(ge=0.0, le=1.0, description="GPA relevance score")
    category: str = Field(description="exam_info | assignment_clarification | rubric | deadline_change | common_mistake | endorsed_answer | irrelevant")
    summary: str = Field(description="One-line summary of the post")
    urgency: str = Field(description="critical | important | informational")
    key_facts: list[str] = Field(description="Key facts extracted from the post")

class AIEngine:
    """Anthropic Claude integration for all AI tasks."""

    def __init__(self, api_key: str, model: str = "claude-opus-4-6") -> None:
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def evaluate_thread(
        self,
        title: str,
        content: str,
        category: str,
        is_endorsed: bool,
        is_staff_post: bool,
    ) -> ThreadEvaluation:
        """Evaluate a thread for GPA relevance using structured output."""
        response = await self._client.messages.parse(
            model=self._model,
            max_tokens=1024,
            output_format=ThreadEvaluation,
            system="You are UniBoard's academic information analysis engine...",  # TRD SS6.1
            messages=[{
                "role": "user",
                "content": f"Title: {title}\nCategory: {category}\n"
                           f"Endorsed: {is_endorsed}, Staff: {is_staff_post}\n"
                           f"Content: {content}",
            }],
        )
        return response.parsed_output
```

### Pattern 2: Hybrid Q&A (Direct Context vs RAG)

**What:** Automatically choose between direct context injection and vector-based RAG depending on course material size
**When to use:** FILE-03 (AI Q&A on course materials)
**Example:**
```python
import tiktoken

# Threshold: if total tokens < 100K, use direct context
# (Claude Opus 4.6 has 200K context window)
DIRECT_CONTEXT_TOKEN_LIMIT = 100_000

class QAService:
    def __init__(self, session: AsyncSession, ai_engine: AIEngine) -> None:
        self._session = session
        self._ai = ai_engine
        self._enc = tiktoken.encoding_for_model("cl100k_base")

    async def answer_question(
        self, user_id: uuid.UUID, course_id: uuid.UUID, question: str
    ) -> QAResponse:
        materials = await self._get_course_materials(user_id, course_id)
        total_tokens = sum(len(self._enc.encode(m.text)) for m in materials)

        if total_tokens < DIRECT_CONTEXT_TOKEN_LIMIT:
            return await self._answer_direct(question, materials)
        else:
            return await self._answer_rag(question, course_id)
```

### Pattern 3: Notification with PushRecord Dedup

**What:** Every notification is dedup-checked against PushRecord before creation, ensuring no duplicate alerts
**When to use:** DL-02 (deadline reminders), DL-03 (GPA risk alerts), INTEL-03/04 (digest)
**Example:**
```python
class NotificationService:
    async def create_notification(
        self,
        user_id: uuid.UUID,
        notification_type: str,
        title: str,
        body: str,
        channels: list[str],  # ["in_app", "email"]
    ) -> Notification | None:
        """Create notification if not already sent (PushRecord dedup)."""
        content_hash = hashlib.sha256(
            f"{user_id}|{notification_type}|{title}".encode()
        ).hexdigest()

        # Check PushRecord for existing
        existing = await self._session.execute(
            select(PushRecord).where(
                PushRecord.user_id == user_id,
                PushRecord.content_hash == content_hash,
            )
        )
        if existing.scalar_one_or_none():
            return None  # Already sent

        # Create notification + PushRecord atomically
        notification = Notification(...)
        self._session.add(notification)

        push_record = PushRecord(
            user_id=user_id,
            content_hash=content_hash,
            source_type=notification_type,
            source_id=str(notification.id),
            pushed_at=datetime.now(UTC),
            channel="in_app",
        )
        self._session.add(push_record)

        # Send email if channel includes email
        if "email" in channels:
            await self._send_email(user_id, title, body)

        return notification
```

### Pattern 4: APScheduler Job Extension

**What:** Add new scheduled jobs to the existing sync engine lifespan
**When to use:** Digest generation (07:00 AEST daily), reminder checks (every 30 min), risk alert checks (after each grade sync)
**Example:**
```python
# In src/sync/engine.py lifespan -- extend with new jobs
scheduler.add_job(
    check_deadline_reminders,
    IntervalTrigger(minutes=30),
    id="check_deadline_reminders",
    replace_existing=True,
    max_instances=1,
)

scheduler.add_job(
    generate_daily_digests,
    CronTrigger(hour=20, minute=0),  # 20:00 UTC = 07:00 AEST (UTC+11)
    id="generate_daily_digests",
    replace_existing=True,
    max_instances=1,
)
```

### Anti-Patterns to Avoid

- **Calling AI inline during HTTP requests for non-interactive endpoints:** Digest generation and thread evaluation should happen in background jobs, not during API calls. Only Q&A (FILE-03) is interactive.
- **Storing embeddings in the main content tables:** Use a separate `content_embeddings` table with a FK to the source (module_item_id or lesson_id). Keeps vector index isolated from OLTP queries.
- **Re-computing all thread evaluations on every sync:** Only evaluate NEW threads (synced_at > last_evaluation_at). Store AI results in `gpa_relevance_score` column already on DiscussionThread.
- **Sending emails synchronously in notification creation:** Use `asyncio.create_task()` or a background job to send emails. Never block the notification creation flow.
- **Hardcoding prompts in service code:** Store prompts as constants in a `src/prompts/` module or configuration. TRD SS6.1 and SS6.2 define the exact prompts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Structured LLM output | JSON parsing + regex | `client.messages.parse()` with Pydantic | SDK handles schema compilation, constrained decoding, validation |
| Vector similarity search | Custom cosine similarity in Python | pgvector `cosine_distance()` operator | Database-level HNSW index, orders of magnitude faster |
| Text embeddings | Custom embedding model | Voyage AI `voyage-3` via voyageai SDK | Production-quality embeddings, 1024-dim, Anthropic-recommended |
| Email HTML | String concatenation | Jinja2 templates | Proper escaping, inheritance, reusable layout |
| Token counting | `len(text) / 4` approximation | tiktoken encoder | Accurate token counts for context window decisions |
| Notification dedup | Custom timestamp checking | PushRecord with SHA-256 content_hash | Already exists in model layer, unique constraint prevents races |
| Scheduled jobs | Custom cron/sleep loops | APScheduler CronTrigger/IntervalTrigger | Already running, battle-tested, timezone-aware |

**Key insight:** The existing codebase already has many of the building blocks (PushRecord, APScheduler, Anthropic SDK, gpa_relevance_score column). Phase 4 is primarily about wiring these together with proper AI integration rather than building from scratch.

## Common Pitfalls

### Pitfall 1: Anthropic API Rate Limits and Cost Control
**What goes wrong:** Uncontrolled AI calls can exhaust API quota or generate unexpected costs
**Why it happens:** Each thread evaluation, digest generation, and Q&A call costs tokens
**How to avoid:**
- Use `ai_calls_today` field already on User model for per-user daily limits
- Use `ai_daily_limit_per_user` setting (already 100 in config)
- For batch thread evaluation, process in chunks with delays
- Use lighter models (Sonnet) for routine scoring, Opus only for risk analysis and Q&A
**Warning signs:** 429 rate limit errors, increasing Anthropic bill

### Pitfall 2: pgvector Extension Not Installed in PostgreSQL
**What goes wrong:** `CREATE EXTENSION vector` fails if pgvector is not installed at the PostgreSQL level
**Why it happens:** pgvector requires both: (1) PostgreSQL extension installed on server, (2) Python package installed
**How to avoid:**
- Add pgvector to Docker Compose postgres image: `ankane/pgvector:latest` (includes extension)
- Or install pgvector extension in existing postgres: `apt-get install postgresql-16-pgvector`
- Alembic migration must include `CREATE EXTENSION IF NOT EXISTS vector`
**Warning signs:** `ERROR: could not open extension control file "vector.control"`

### Pitfall 3: AEST Timezone Handling for Digest Schedule
**What goes wrong:** Digest sent at wrong time because AEST vs AEDT (daylight saving) not handled
**Why it happens:** AEST is UTC+10, AEDT is UTC+11; Australia observes daylight saving
**How to avoid:**
- Use `CronTrigger(hour=X, minute=0, timezone="Australia/Sydney")` which auto-handles DST
- Store all times in UTC internally; convert to user timezone only for display
- Do NOT hardcode UTC offset
**Warning signs:** Digest arrives an hour early or late after DST transition

### Pitfall 4: Context Window Overflow for Q&A
**What goes wrong:** Passing too much course material to Claude causes truncation or errors
**Why it happens:** Some courses have hundreds of slides/modules totaling 500K+ tokens
**How to avoid:**
- Implement the hybrid architecture: count tokens first, switch to RAG above threshold
- For direct context, sort materials by relevance to the question
- For RAG, retrieve top-K chunks (K=10-20) and include only those
**Warning signs:** API errors about max tokens exceeded, hallucinated answers

### Pitfall 5: Email Verification in SES Sandbox
**What goes wrong:** SES in sandbox mode only sends to verified emails
**Why it happens:** New AWS accounts start in SES sandbox; must request production access
**How to avoid:**
- For development, verify test recipient emails in SES console
- Design email sending to gracefully handle SES errors (log and continue)
- Make email optional (in-app notification always works)
**Warning signs:** SES returns `MessageRejected` errors

### Pitfall 6: AI Quality Regression Without Monitoring
**What goes wrong:** Prompt changes or model updates silently degrade AI quality
**Why it happens:** No systematic evaluation of AI outputs
**How to avoid:**
- Implement quality gate from TRD SS6.4: track Precision/Recall/F1 for thread evaluation
- F1 < 75% triggers automatic fallback to rule engine (is_endorsed + is_staff_answered)
- Store prompt versions in `docs/ai-prompt-versions.md`
**Warning signs:** Users receiving irrelevant posts in digest, F1 score dropping

### Pitfall 7: asyncpg Type Registration for pgvector
**What goes wrong:** `asyncpg.exceptions.UndefinedObjectError: type "vector" does not exist` even though extension is installed
**Why it happens:** asyncpg needs custom type codec registration for vector type
**How to avoid:**
- Register pgvector types via SQLAlchemy event listener on engine connect
- Use `pgvector.sqlalchemy.VECTOR` column type (auto-handles registration)
- Test with actual database, not mocked sessions, for vector operations
**Warning signs:** Vector insert/query fails despite CREATE EXTENSION succeeding

## Code Examples

### AIEngine Structured Output (Thread Evaluation)
```python
# Source: Anthropic SDK docs - messages.parse()
from anthropic import AsyncAnthropic
from pydantic import BaseModel, Field

class ThreadEvaluation(BaseModel):
    gpa_relevance: float = Field(ge=0.0, le=1.0)
    category: str
    summary: str
    urgency: str  # critical | important | informational
    key_facts: list[str]

async def evaluate_thread(client: AsyncAnthropic, content: str) -> ThreadEvaluation:
    response = await client.messages.parse(
        model="claude-opus-4-6",
        max_tokens=1024,
        output_format=ThreadEvaluation,
        system=THREAD_EVAL_SYSTEM_PROMPT,  # From TRD SS6.1
        messages=[{"role": "user", "content": content}],
    )
    return response.parsed_output
```

### pgvector Model with SQLAlchemy Async
```python
# Source: pgvector-python GitHub README
from pgvector.sqlalchemy import VECTOR
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from src.models.base import Base, TimestampMixin, UUIDMixin

class ContentEmbedding(UUIDMixin, TimestampMixin, Base):
    """Vector embedding for course material content (RAG)."""
    __tablename__ = "content_embeddings"

    source_type: Mapped[str] = mapped_column(String(30))  # "module_item" | "lesson" | "slide"
    source_id: Mapped[str] = mapped_column(String(50))
    course_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("courses.id"))
    chunk_text: Mapped[str] = mapped_column(Text)
    chunk_index: Mapped[int] = mapped_column(default=0)
    embedding: Mapped[Any] = mapped_column(VECTOR(1024))  # voyage-3 produces 1024-dim vectors
```

### Similarity Search Query
```python
# Source: pgvector-python SQLAlchemy examples
from pgvector.sqlalchemy import VECTOR

async def search_similar(
    session: AsyncSession,
    query_embedding: list[float],
    course_id: uuid.UUID,
    limit: int = 10,
) -> list[ContentEmbedding]:
    stmt = (
        select(ContentEmbedding)
        .where(ContentEmbedding.course_id == course_id)
        .order_by(ContentEmbedding.embedding.cosine_distance(query_embedding))
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
```

### Notification Model
```python
class Notification(UUIDMixin, TimestampMixin, Base):
    """In-app notification for deadline reminders, risk alerts, digests."""
    __tablename__ = "notifications"
    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(30))  # deadline_reminder | gpa_risk | digest | token_expired
    severity: Mapped[str] = mapped_column(String(20))  # critical | warning | info
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(default=False)
    action_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # extra context
```

### AWS SES Email Sending
```python
# Source: AWS SES SDK documentation
import boto3
from botocore.exceptions import ClientError

class SESEmailSender:
    """AWS SES email wrapper for digest and notification emails."""

    def __init__(self, region: str = "ap-southeast-2") -> None:
        self._client = boto3.client("ses", region_name=region)

    async def send_digest_email(
        self, to_email: str, subject: str, html_body: str
    ) -> bool:
        """Send HTML email via SES. Returns True on success, False on failure."""
        try:
            # Run boto3 sync call in thread pool
            import asyncio
            await asyncio.to_thread(
                self._client.send_email,
                Source="digest@uniboard.app",
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {"Html": {"Data": html_body, "Charset": "UTF-8"}},
                },
            )
            return True
        except ClientError:
            return False
```

### Deadline Reminder Check Job
```python
async def check_deadline_reminders() -> None:
    """Periodic job: check all users' deadlines and send reminders at 72h/24h/3h tiers."""
    session_factory = _get_sync_session_factory()
    now = datetime.now(UTC)

    # Reminder tiers
    tiers = [
        ("72h", timedelta(hours=72), timedelta(hours=71)),
        ("24h", timedelta(hours=24), timedelta(hours=23)),
        ("3h", timedelta(hours=3), timedelta(hours=2)),
    ]

    async with session_factory() as session:
        for tier_name, upper, lower in tiers:
            window_start = now + lower
            window_end = now + upper

            stmt = (
                select(UnifiedDeadline, Course, User)
                .join(Course, UnifiedDeadline.course_id == Course.id)
                .join(User, Course.user_id == User.id)
                .where(
                    UnifiedDeadline.due_date.between(window_start, window_end),
                )
            )
            result = await session.execute(stmt)
            # Create notifications via NotificationService (dedup via PushRecord)
            ...
```

### GPA Risk Alert Detection
```python
async def check_gpa_risk_alerts() -> None:
    """Check if any user's grade trajectory deviates from their GPA target."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        # Get users with GPA targets set
        stmt = select(User).where(User.gpa_target.isnot(None))
        result = await session.execute(stmt)
        users = list(result.scalars().all())

        for user in users:
            gpa_svc = GPAService(session)
            summary = await gpa_svc.get_summary(user.id)

            # Simple trend detection: if current WAM is more than X points below target
            if user.gpa_target and summary.cumulative_wam < (user.gpa_target - 5):
                # Invoke Claude Opus for deep analysis
                ai = AIEngine(api_key=settings.anthropic_api_key)
                analysis = await ai.analyze_gpa_risk(
                    current_wam=summary.cumulative_wam,
                    target_wam=user.gpa_target,
                    courses=summary.courses,
                )
                # Create risk alert notification
                ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSON mode with prompt-based validation | `messages.parse()` with Pydantic models | Nov 2025 (now GA) | Guaranteed schema compliance, no parsing errors |
| Beta header `structured-outputs-2025-11-13` | `output_format` parameter (GA) | Early 2026 | No beta headers needed, simpler code |
| OpenAI embeddings for Anthropic stack | Voyage AI embeddings | 2024-2025 | Anthropic-recommended, better quality for academic text |
| Redis for notification queues | PostgreSQL + APScheduler | Project decision | No extra infrastructure, sufficient for <100 users |

**Deprecated/outdated:**
- `anthropic.Beta.messages.parse()` with beta headers -- now use `client.messages.parse()` directly
- `output_format` is still supported but internally maps to `output_config.format`
- Voyage AI `voyage-2` model -- replaced by `voyage-3` and `voyage-3.5` with better performance

## Open Questions

1. **Voyage AI API key management**
   - What we know: Voyage AI is the recommended embedding provider for Anthropic stack
   - What's unclear: How to securely store the Voyage AI API key alongside the Anthropic key
   - Recommendation: Add `voyage_api_key` to Settings alongside `anthropic_api_key`; same env var pattern

2. **RAG chunk size for academic materials**
   - What we know: Academic content has mixed formats (slides, code, math formulas)
   - What's unclear: Optimal chunk size for academic material retrieval
   - Recommendation: Start with 512-token chunks with 50-token overlap; tune based on retrieval quality

3. **Skill auto-generation trigger mechanism**
   - What we know: SKILL-01 says "after first successful API exploration"
   - What's unclear: How to detect "first successful operation" in `.claude/skills/` context
   - Recommendation: Generate skill files as part of Phase 4 implementation itself; document patterns discovered during development

4. **Email notification preferences**
   - What we know: Dual-channel (email + in-app) is locked
   - What's unclear: Whether users can opt out of email while keeping in-app
   - Recommendation: Add `email_notifications_enabled` boolean to User model; default True

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3+ with pytest-asyncio 0.25+ (backend), vitest 4.1+ (frontend) |
| Config file | `pyproject.toml` [tool.pytest.ini_options] (backend), `frontend/vitest.config.ts` (frontend) |
| Quick run command | `pytest tests/unit/ -x --timeout=30` |
| Full suite command | `mypy src/ && pytest && ruff check . && cd frontend && pnpm build && pnpm test && pnpm lint --max-warnings 0 && pnpm typecheck` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DL-02 | Deadline reminders at 72h/24h/3h tiers | unit | `pytest tests/unit/test_notification_service.py::test_deadline_reminder_tiers -x` | Wave 0 |
| DL-03 | GPA risk alert on trajectory deviation | unit | `pytest tests/unit/test_risk_alert_service.py::test_gpa_risk_detection -x` | Wave 0 |
| INTEL-02 | AI-extracted high-value Ed Discussion info | unit | `pytest tests/unit/test_ai_engine.py::test_evaluate_thread -x` | Wave 0 |
| INTEL-03 | Daily digest rule-based aggregation | unit | `pytest tests/unit/test_digest_service.py::test_rule_based_digest -x` | Wave 0 |
| INTEL-04 | AI-enhanced digest with urgency scoring | unit | `pytest tests/unit/test_digest_service.py::test_ai_enhanced_digest -x` | Wave 0 |
| FILE-03 | AI Q&A with cited answers | unit | `pytest tests/unit/test_qa_service.py::test_qa_with_citations -x` | Wave 0 |
| FILE-04 | AI unit review summaries | unit | `pytest tests/unit/test_qa_service.py::test_unit_review_summary -x` | Wave 0 |
| SKILL-01 | Auto-generate skill template | manual-only | Manual: verify `.claude/skills/` files created | N/A |
| SKILL-02 | Load generated skills on re-execution | manual-only | Manual: verify skill loading pattern | N/A |
| SKILL-03 | Per-course differentiated skills | manual-only | Manual: verify course-specific skill files | N/A |
| SKILL-04 | ~50 skills across categories | manual-only | Manual: count skill files in `.claude/skills/` | N/A |

### Sampling Rate
- **Per task commit:** `mypy src/ && pytest tests/unit/ -x && ruff check .`
- **Per wave merge:** Full suite (see above)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_ai_engine.py` -- covers INTEL-02, INTEL-04 (mock Anthropic client)
- [ ] `tests/unit/test_notification_service.py` -- covers DL-02
- [ ] `tests/unit/test_risk_alert_service.py` -- covers DL-03
- [ ] `tests/unit/test_digest_service.py` -- covers INTEL-03, INTEL-04
- [ ] `tests/unit/test_qa_service.py` -- covers FILE-03, FILE-04
- [ ] `tests/integration/test_notifications.py` -- covers DL-02 notification routes
- [ ] `tests/integration/test_digest_routes.py` -- covers INTEL-03/04 digest endpoints
- [ ] `tests/integration/test_ai_routes.py` -- covers FILE-03/04 AI endpoints
- [ ] Alembic migration `005_phase4_notifications_embeddings.py` -- Notification + ContentEmbedding tables + vector extension
- [ ] pgvector in Docker Compose (`ankane/pgvector:latest`)
- [ ] Frontend: `frontend/__tests__/notifications/NotificationBell.test.tsx`
- [ ] Frontend: `frontend/__tests__/ai/CourseQA.test.tsx`

## Sources

### Primary (HIGH confidence)
- Anthropic SDK structured outputs docs: https://platform.claude.com/docs/en/build-with-claude/structured-outputs -- `messages.parse()` API, Pydantic integration, GA status confirmed
- pgvector-python GitHub: https://github.com/pgvector/pgvector-python -- SQLAlchemy VECTOR type, cosine_distance, asyncpg compatibility
- Anthropic embeddings recommendation: https://platform.claude.com/docs/en/build-with-claude/embeddings -- Voyage AI as recommended provider
- Project codebase: `src/config.py` (anthropic_api_key, ai_daily_limit_per_user already configured), `src/models/push_record.py` (notification dedup), `src/sync/engine.py` (APScheduler pattern), `src/services/intelligence.py` (existing rule-based service)
- TRD v2.5 SS6 (AI/Prompt Engineering), SS12.7 (Notification/Digest API spec)

### Secondary (MEDIUM confidence)
- Voyage AI Python SDK docs: https://docs.voyageai.com/docs/embeddings -- voyage-3/voyage-3.5 models, 1024-dim vectors
- AWS SES Python boto3 docs: https://docs.aws.amazon.com/code-library/latest/ug/python_3_ses_code_examples.html -- send_email API
- pgvector Docker image: https://hub.docker.com/r/ankane/pgvector -- pre-built PostgreSQL with pgvector

### Tertiary (LOW confidence)
- tiktoken for Claude models: Using `cl100k_base` as approximation; Claude uses its own tokenizer but cl100k_base is close enough for threshold decisions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Anthropic SDK, pgvector, boto3 all well-documented with existing project patterns
- Architecture: HIGH -- Extends existing services/models/routes patterns from Phase 1-3
- Pitfalls: HIGH -- Based on known issues with pgvector async, SES sandbox, and Anthropic API limits
- AI integration: MEDIUM -- Structured output GA is confirmed, but specific model behavior (quality of thread evaluation) needs runtime validation

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30 days -- stable libraries, Anthropic SDK may release minor updates)
