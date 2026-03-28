# Phase 18: AI Enhancement - Research

**Researched:** 2026-03-28
**Domain:** AI evaluation pipeline (Anthropic Claude API), quality gate (F1 metrics), digest tuning, feedback collection
**Confidence:** HIGH

## Summary

Phase 18 wires up the existing AI infrastructure (AIEngine, EdIntelligenceService, DigestService) for live Claude API thread evaluation and digest scoring. Approximately 80% of the backend code already exists -- the primary work involves: (1) adding an Ed Discussion thread sync task to populate the `discussion_threads` table, (2) wiring the SyncEngine to trigger AI batch evaluation post-sync, (3) creating feedback tables and endpoints for quality gate data collection, (4) implementing F1 calculation and auto-fallback logic, (5) enhancing digest prompts with i18n and action-oriented style, and (6) adding frontend feedback buttons and urgency color UI.

A critical finding: there is **no Ed Discussion thread sync task** that persists threads into the `discussion_threads` table. The current `sync_all_deadlines` task uses Ed Discussion content only for deadline text extraction. Without stored threads, the intelligence service's `evaluate_new_threads_ai()` has nothing to evaluate. This must be addressed first.

**Primary recommendation:** Build in sequence: (1) Ed Discussion thread sync task, (2) post-sync AI evaluation hook, (3) feedback DB + endpoints, (4) F1 quality gate logic, (5) digest i18n/style tuning, (6) frontend feedback UI + urgency colors.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ground truth source = user feedback (thumbs up/down buttons on AI-scored items)
- **D-02:** Minimum 50 feedback entries before F1 calculation starts. Before 50 entries, AI runs but no gate judgment.
- **D-03:** F1 < 75% triggers global fallback to rule engine (endorsed + staff_answered). Stays in fallback until next prompt optimization + manual re-evaluation.
- **D-04:** Feedback buttons appear in BOTH Course Detail (Ed Posts list) AND Digest page -- maximize collection rate.
- **D-05:** Need DB table for feedback: `ai_feedback(id, user_id, thread_id, feedback_type[thumbs_up|thumbs_down], created_at)` and `ai_quality_metrics(id, total_feedback, f1_score, precision, recall, calculated_at, is_fallback_active)`.
- **D-06:** Trigger = post-sync automatic batch evaluation. After Ed Discussion sync completes, queue background task to evaluate new unscored threads.
- **D-07:** Batch limit = 20 threads per sync cycle. Remaining unscored threads wait for next sync cycle.
- **D-08:** Integration point: SyncEngine's Ed Discussion sync completion hook triggers `evaluate_new_threads_ai()` for all synced courses.
- **D-09:** Daily AI call counter (`ai_calls_today`) already exists on Profile model. Add daily reset logic (check `ai_calls_reset_date`, reset if stale).
- **D-10:** Summary language = i18n bilingual (Chinese/English). Generate based on user's language preference setting. Requires two prompt templates.
- **D-11:** Summary style = precise 20-30 word action-oriented study guidance. No generic encouragement.
- **D-12:** Urgency display = BOTH color labels AND sort-by-score. Red (5-critical) / Orange (4-urgent) / Blue (3-normal) / Gray (1-2-low). Highest urgency items sorted first.

### Claude's Discretion
- Testing strategy: Claude chooses best approach based on existing pytest mock patterns (likely patch AsyncAnthropic.messages.create with fixture JSON responses)
- Exact F1 calculation formula (standard binary classification F1)
- AI call counter daily reset implementation details
- Prompt template wording and optimization
- Error handling for API failures (retry policy, graceful degradation)

### Deferred Ideas (OUT OF SCOPE)
- AI Q&A (ask questions about course content) -- Phase 19
- MCP Agent tools -- Phase 19
- Per-course F1 gate (instead of global) -- future optimization when feedback volume is sufficient
- AI prompt A/B testing framework -- M4 backlog
- Embedding-based semantic search for threads -- M4 backlog
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEL-02 | AI-extracted high-value information from Ed Discussion: exam scope hints, assignment clarifications, rubric details, deadline changes | Existing AIEngine.evaluate_thread() + EdIntelligenceService.evaluate_new_threads_ai() handle evaluation. Need: Ed Discussion thread sync task (critical gap), post-sync hook, batch limit (D-07), daily reset (D-09). |
| INTEL-04 | AI-enhanced digest with urgency scoring and GPA relevance ranking | Existing DigestService._enhance_with_ai() handles scoring. Need: i18n prompts (D-10), action-oriented style (D-11), urgency color mapping (D-12), quality gate fallback in digest route. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| anthropic | 0.84.0 (installed, latest=0.86.0) | Claude API client | Already in pyproject.toml, used by AIEngine |
| sqlalchemy | 2.0+ (installed) | ORM for new feedback/metrics tables | Existing pattern throughout project |
| fastapi | 0.115+ (installed) | New feedback endpoints | Existing route pattern |
| apscheduler | 3.11 (installed) | Sync engine scheduling | Existing sync engine |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| structlog | 24.0+ (installed) | Structured logging for AI pipeline | All new service/task code |
| pydantic | 2.10+ (installed) | Schema validation for feedback/metrics | New schemas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| anthropic SDK | litellm | litellm adds multi-provider support but unnecessary complexity; project is Anthropic-only |
| Manual F1 calc | sklearn.metrics | sklearn is heavy dependency for one formula; standard F1 is trivial to implement |

**No new dependencies required.** All needed libraries are already installed.

## Architecture Patterns

### Recommended Project Structure (New Files)
```
src/
├── models/
│   ├── ai_feedback.py         # AIFeedback ORM model (NEW)
│   └── ai_quality_metrics.py  # AIQualityMetrics ORM model (NEW)
├── schemas/
│   └── feedback.py            # Feedback request/response schemas (NEW)
├── services/
│   ├── quality_gate.py        # F1 calculation + fallback logic (NEW)
│   └── intelligence.py        # Add batch limit to evaluate_new_threads_ai (MODIFY)
│   └── digest.py              # i18n prompts, action-oriented style (MODIFY)
├── prompts/
│   ├── thread_eval.py         # Prompt tuning (MODIFY)
│   ├── digest.py              # i18n prompts, action-oriented style (MODIFY)
│   └── digest_zh.py           # Chinese prompt variant (NEW)
├── sync/
│   └── tasks.py               # Add sync_ed_discussions + post-sync AI hook (MODIFY)
├── web/
│   └── routes/
│       └── feedback.py        # POST /feedback endpoint (NEW)
supabase/
└── migrations/
    └── 00000000000004_ai_feedback.sql  # New tables migration (NEW)
frontend/
├── components/
│   ├── digest/
│   │   └── FeedbackButton.tsx  # Thumbs up/down component (NEW)
│   └── course-detail/
│       └── FeedbackButton.tsx  # Same or shared component (NEW or shared)
├── hooks/
│   └── use-feedback.ts         # Mutation hook for feedback (NEW)
└── openapi/
    └── openapi.yaml            # Add feedback endpoint spec (MODIFY)
```

### Pattern 1: Post-Sync Hook (Ed Discussion -> AI Evaluation)
**What:** After Ed Discussion threads are synced to DB, trigger batch AI evaluation
**When to use:** D-06 requires automatic post-sync evaluation
**Example:**
```python
# In src/sync/tasks.py -- after sync_ed_discussions() completes
async def sync_ed_discussions() -> None:
    """Sync Ed Discussion threads for all users, then trigger AI evaluation."""
    session_factory = _get_sync_session_factory()
    # ... sync threads into discussion_threads table ...

    # Post-sync: trigger AI evaluation for newly synced courses
    settings = get_settings()
    if settings.anthropic_api_key:
        await _evaluate_synced_threads(session_factory, synced_course_ids)

async def _evaluate_synced_threads(
    session_factory: async_sessionmaker,
    course_ids_by_user: dict[uuid.UUID, list[uuid.UUID]],
) -> None:
    """Batch evaluate up to 20 unscored threads per user per sync cycle."""
    from src.services.ai_engine import AIEngine
    from src.services.intelligence import EdIntelligenceService

    settings = get_settings()
    ai_engine = AIEngine(api_key=settings.anthropic_api_key)

    for user_id, course_ids in course_ids_by_user.items():
        async with session_factory() as session:
            svc = EdIntelligenceService(session)
            for course_id in course_ids:
                await svc.evaluate_new_threads_ai(user_id, course_id, ai_engine)
            await session.commit()
```

### Pattern 2: Quality Gate Service
**What:** Calculate F1 from feedback, determine fallback state
**When to use:** D-01 through D-03 require feedback-based quality monitoring
**Example:**
```python
# src/services/quality_gate.py
class QualityGateService:
    """Monitor AI evaluation quality and manage fallback state."""

    FEEDBACK_THRESHOLD = 50  # D-02: minimum feedback before F1 gate activates
    F1_THRESHOLD = 0.75       # D-03: below this triggers fallback

    async def calculate_f1(self, session: AsyncSession) -> tuple[float, float, float]:
        """Standard binary classification F1.

        Positive class: AI scored thread as high-value (gpa_relevance >= 0.4)
        Ground truth: user thumbs_up = agree (true positive if AI said high-value)
                      user thumbs_down = disagree (false positive if AI said high-value)
        """
        # ... query ai_feedback joined with discussion_threads ...
        tp = thumbs_up_on_high_value
        fp = thumbs_down_on_high_value
        fn = thumbs_up_on_low_value  # user says relevant but AI missed it

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        return f1, precision, recall
```

### Pattern 3: Existing Test Pattern (Mock AsyncAnthropic)
**What:** Patch AsyncAnthropic.messages.create with fixture JSON responses
**When to use:** All AI-related tests follow this established pattern
**Example:**
```python
# From existing test_ai_engine.py
def _make_mock_response(text: str) -> MagicMock:
    content_block = MagicMock()
    content_block.text = text
    response = MagicMock()
    response.content = [content_block]
    response.usage = MagicMock(input_tokens=100, output_tokens=50)
    return response

with patch("src.services.ai_engine.AsyncAnthropic") as mock_cls:
    client_instance = AsyncMock()
    client_instance.messages.create = AsyncMock(return_value=mock_resp)
    mock_cls.return_value = client_instance

    engine = AIEngine(api_key="test-key")
    result = await engine.evaluate_thread(...)
```

### Anti-Patterns to Avoid
- **Don't trigger AI evaluation on every API request:** Current `get_ai_high_value_posts` route calls `evaluate_new_threads_ai` inline, which is expensive. Move to post-sync background only (D-06).
- **Don't create a separate API for AI calls:** AI evaluation should be transparent; results are just better `gpa_relevance_score` values on existing endpoints.
- **Don't compute F1 on every request:** F1 should be calculated periodically (when new feedback crosses threshold or on a schedule), cached in `ai_quality_metrics` table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| F1 score calculation | Complex ML metrics lib | Standard formula (TP/FP/FN counts) | Only one metric needed; trivial computation |
| Anthropic client | Custom HTTP client | anthropic 0.84.0 AsyncAnthropic | Already integrated, handles auth/retries |
| Background scheduling | Custom task queue | APScheduler (existing) | Already runs all sync tasks |
| Thread sync dedup | Custom dedup logic | PostgreSQL UPSERT on (course_id, ed_thread_id) unique constraint | Already defined in DiscussionThread model |

**Key insight:** The existing infrastructure handles 80% of the work. This phase is about wiring, not building.

## Common Pitfalls

### Pitfall 1: Missing Ed Discussion Thread Sync
**What goes wrong:** `evaluate_new_threads_ai()` queries `discussion_threads` table but nothing populates it. The sync_all_deadlines task only extracts text from Ed Discussion for deadline detection -- it does NOT persist threads.
**Why it happens:** CONTEXT.md says "80% implemented" but the critical sync step is missing.
**How to avoid:** Create `sync_ed_discussions()` task in `src/sync/tasks.py` that uses `EdDiscussionAdapter.get_threads()` to fetch threads and UPSERT into `discussion_threads` table. Register in SyncEngine.
**Warning signs:** Empty discussion_threads table despite Ed tokens being configured.

### Pitfall 2: Intelligence Route Inline AI Evaluation
**What goes wrong:** Current `get_ai_high_value_posts` route calls `evaluate_new_threads_ai()` inline, making the GET request slow (each thread eval = 1 API call to Claude).
**Why it happens:** The route was built before the sync engine hook design (D-06).
**How to avoid:** Remove inline evaluation from the route handler. Let post-sync hook handle evaluation. The route should only read pre-computed scores.
**Warning signs:** GET /courses/{id}/intelligence/ai takes 5+ seconds.

### Pitfall 3: AI Call Counter Not Reset
**What goes wrong:** `profile.ai_calls_today` never resets, so users hit limits permanently after day 1.
**Why it happens:** `ai_calls_reset_date` field exists but no reset logic is implemented (D-09).
**How to avoid:** Add reset check at the start of `evaluate_new_threads_ai()`: if `ai_calls_reset_date` is not today, reset `ai_calls_today=0` and update `ai_calls_reset_date`.
**Warning signs:** Users hit AI daily limit even after midnight.

### Pitfall 4: F1 Calculation Denominator Zero
**What goes wrong:** Division by zero when computing F1 before sufficient feedback.
**Why it happens:** D-02 says min 50 feedback, but edge cases exist (all thumbs_up, no negatives).
**How to avoid:** Guard all divisions with `(denominator > 0)` checks. Return 0.0 for undefined metrics.
**Warning signs:** Server errors in quality gate calculations.

### Pitfall 5: Digest Summary Language Detection
**What goes wrong:** Chinese user gets English summary, or vice versa.
**Why it happens:** No user language preference on the Profile model or not passed to digest service.
**How to avoid:** Check if Profile has a `language` field or if it can be inferred from frontend `locale` header. The frontend uses next-intl with `[locale]` route segments (en/zh). Pass language preference to digest generation.
**Warning signs:** All summaries in one language regardless of user setting.

### Pitfall 6: SyncEngine Job Registration Order
**What goes wrong:** Ed Discussion sync not registered in APScheduler, so threads never sync.
**Why it happens:** New sync task created but not added to `src/sync/engine.py` lifespan.
**How to avoid:** Add `sync_ed_discussions` to engine.py alongside other sync jobs, with appropriate interval (e.g., every 60 minutes like deadlines).
**Warning signs:** `discussion_threads` table stays empty in production.

## Code Examples

### Ed Discussion Thread Sync Task
```python
# Source: Inferred from existing sync patterns in src/sync/tasks.py
async def sync_ed_discussions() -> None:
    """Sync Ed Discussion threads into discussion_threads table for all users."""
    session_factory = _get_sync_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            select(Profile).where(Profile.ed_api_token_encrypted.isnot(None))
        )
        users = list(result.scalars().all())

    if not users:
        return

    encryption = get_encryption()
    settings = get_settings()
    synced_courses: dict[uuid.UUID, list[uuid.UUID]] = {}  # user_id -> [course_ids]

    for user in users:
        # ... fetch threads via EdDiscussionAdapter, UPSERT into discussion_threads ...
        # Track which courses got new threads for post-sync AI evaluation

    # Post-sync AI evaluation hook (D-06)
    if settings.anthropic_api_key and synced_courses:
        await _evaluate_synced_threads(session_factory, synced_courses)
```

### AI Feedback Model
```python
# Source: D-05 from CONTEXT.md
class AIFeedback(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_feedback"
    __table_args__ = (
        UniqueConstraint("user_id", "thread_id", name="uq_feedback_user_thread"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    thread_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("discussion_threads.id"))
    feedback_type: Mapped[str] = mapped_column(String(20))  # thumbs_up | thumbs_down
```

### AI Quality Metrics Model
```python
# Source: D-05 from CONTEXT.md
class AIQualityMetrics(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ai_quality_metrics"

    total_feedback: Mapped[int] = mapped_column(default=0)
    f1_score: Mapped[float] = mapped_column(Float, default=0.0)
    precision: Mapped[float] = mapped_column(Float, default=0.0)
    recall: Mapped[float] = mapped_column(Float, default=0.0)
    calculated_at: Mapped[datetime] = mapped_column()
    is_fallback_active: Mapped[bool] = mapped_column(default=False)
```

### Daily Counter Reset Pattern
```python
# Source: D-09, inferred from existing Profile.ai_calls_today pattern
from datetime import date

def _maybe_reset_daily_counter(profile: Profile) -> None:
    """Reset AI call counter if reset_date is stale."""
    today = date.today()
    if profile.ai_calls_reset_date is None or profile.ai_calls_reset_date.date() < today:
        profile.ai_calls_today = 0
        profile.ai_calls_reset_date = datetime.combine(today, datetime.min.time())
```

### Feedback Endpoint
```python
# Source: D-04, follows existing route patterns
@router.post("/threads/{thread_id}/feedback")
async def submit_feedback(
    thread_id: uuid.UUID,
    body: FeedbackRequest,  # {"feedback_type": "thumbs_up" | "thumbs_down"}
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session),
) -> SuccessResponse[dict[str, str]]:
    """Submit user feedback on AI-scored thread."""
    # UPSERT (user_id, thread_id) so user can change their vote
    ...
```

### i18n Prompt Templates
```python
# Source: D-10, D-11, following existing prompts/ pattern
DIGEST_SUMMARY_EN = (
    "You are UniBoard's digest summarizer. Given academic items, "
    "generate a 20-30 word action-oriented study guidance summary. "
    "Focus on highest urgency items. Be precise, no generic encouragement. "
    "Example: 'Focus on COMP3221 Quiz 3 (due 18h) -- review lecture 8 sliding window.'"
)

DIGEST_SUMMARY_ZH = (
    "你是 UniBoard 的学业摘要生成器。根据以下学术事项，"
    "生成 20-30 字的行动导向学习指引。"
    "聚焦最紧急的事项，精确具体，不要笼统的鼓励话。"
    "示例：'重点复习 COMP3221 Quiz 3（还剩 18 小时）— 回顾第 8 讲滑动窗口。'"
)
```

### Frontend Urgency Color Mapping (D-12)
```typescript
// Source: D-12, extends existing URGENCY_STYLES in frontend/lib/digest/types.ts
// Current: critical | important | informational (3 levels)
// Phase 18: Map 1-5 urgency_score to color labels

export const SCORE_URGENCY_MAP: Record<number, { label: string; bg: string; text: string }> = {
  5: { label: "critical",  bg: "bg-[rgba(204,68,85,0.11)]", text: "text-[#cc4455]" },   // Red
  4: { label: "urgent",    bg: "bg-[rgba(217,119,87,0.11)]", text: "text-[#d97757]" },   // Orange
  3: { label: "normal",    bg: "bg-[rgba(106,155,204,0.11)]", text: "text-[#6a9bcc]" },  // Blue
  2: { label: "low",       bg: "bg-[rgba(155,155,148,0.11)]", text: "text-[#9b9b94]" },  // Gray
  1: { label: "minimal",   bg: "bg-[rgba(155,155,148,0.11)]", text: "text-[#9b9b94]" },  // Gray
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Anthropic SDK `response.content[0].text` | Same API, stable since 0.80+ | Stable | No migration needed |
| Manual JSON parsing from AI | Anthropic tools/structured output | Available | Could use but existing pattern works; not worth refactoring |
| Inline AI evaluation on GET | Background post-sync evaluation | Phase 18 change | Major latency improvement |

**Deprecated/outdated:**
- DIGEST_SUMMARY_SYSTEM_PROMPT says "Be concise and motivating" -- D-11 explicitly overrides this with "precise 20-30 word action-oriented study guidance, no generic encouragement"

## Open Questions

1. **User language preference storage**
   - What we know: Frontend uses next-intl with `[locale]` route segments (en/zh). Profile model has no `language` field.
   - What's unclear: Where to get user's language preference for server-side digest generation.
   - Recommendation: Add `language_preference: str = "en"` to Profile model, OR extract from `Accept-Language` header in digest generation route, OR pass locale as query param when frontend fetches digest.

2. **Ed Discussion thread sync interval**
   - What we know: Grades sync every 15 min, deadlines every 60 min, modules daily.
   - What's unclear: Optimal interval for Ed Discussion thread sync.
   - Recommendation: Same as deadlines (60 min) since Ed posts are not time-critical at minute granularity.

3. **Batch evaluation scope per sync cycle**
   - What we know: D-07 says 20 threads per sync cycle.
   - What's unclear: Is that 20 per user total, or 20 per user per course?
   - Recommendation: 20 per user total (across all courses), consistent with ai_daily_limit enforcement. This limits API cost while still making progress.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 8.3 + pytest-asyncio 0.25 |
| Config file | pyproject.toml `[tool.pytest.ini_options]` |
| Quick run command | `python -m pytest tests/unit/ -x --timeout=30` |
| Full suite command | `python -m pytest tests/ --timeout=120` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INTEL-02-a | Ed Discussion threads synced to DB | unit | `python -m pytest tests/unit/test_sync_ed_discussions.py -x` | Wave 0 |
| INTEL-02-b | Post-sync AI evaluation batch (20 limit) | unit | `python -m pytest tests/unit/test_intelligence_ai.py -x` | Partial (exists but needs batch limit test) |
| INTEL-02-c | Daily counter reset logic | unit | `python -m pytest tests/unit/test_intelligence_ai.py::test_daily_counter_reset -x` | Wave 0 |
| INTEL-04-a | Digest i18n prompt generates bilingual summary | unit | `python -m pytest tests/unit/test_digest_service.py::test_digest_i18n -x` | Wave 0 |
| INTEL-04-b | Digest urgency scoring assigns 1-5 scores | unit | `python -m pytest tests/unit/test_digest_service.py -x` | Partial (exists) |
| INTEL-04-c | Quality gate F1 calculation | unit | `python -m pytest tests/unit/test_quality_gate.py -x` | Wave 0 |
| INTEL-04-d | Quality gate fallback activates at F1 < 75% | unit | `python -m pytest tests/unit/test_quality_gate.py::test_fallback_threshold -x` | Wave 0 |
| INTEL-02-e | Feedback POST endpoint accepts thumbs_up/down | integration | `python -m pytest tests/integration/test_feedback_routes.py -x` | Wave 0 |
| INTEL-02-f | Intelligence route reads pre-computed scores (no inline eval) | integration | `python -m pytest tests/integration/test_ed_discussion.py -x` | Partial (needs update) |

### Sampling Rate
- **Per task commit:** `python -m pytest tests/unit/ -x --timeout=30`
- **Per wave merge:** `python -m pytest tests/ --timeout=120`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/unit/test_sync_ed_discussions.py` -- covers INTEL-02-a (Ed Discussion sync)
- [ ] `tests/unit/test_quality_gate.py` -- covers INTEL-04-c, INTEL-04-d (F1 calc + fallback)
- [ ] `tests/integration/test_feedback_routes.py` -- covers INTEL-02-e (feedback endpoint)
- [ ] Add batch limit (D-07) and daily reset (D-09) tests to existing `test_intelligence_ai.py`

*(Existing test files cover AIEngine, intelligence service AI evaluation, and digest AI enhancement partially)*

## Sources

### Primary (HIGH confidence)
- Source code analysis: `src/services/ai_engine.py`, `src/services/intelligence.py`, `src/services/digest.py`, `src/sync/tasks.py`, `src/sync/engine.py`
- Source code analysis: `src/models/discussion.py`, `src/models/user.py`, `src/models/digest.py`
- Source code analysis: `src/prompts/thread_eval.py`, `src/prompts/digest.py`
- Source code analysis: `src/web/routes/intelligence.py`, `src/web/routes/digest.py`
- Source code analysis: `tests/unit/test_ai_engine.py`, `tests/unit/test_intelligence_ai.py`, `tests/unit/test_digest_service.py`
- Source code analysis: `frontend/lib/digest/types.ts`, `frontend/components/digest/HighlightItem.tsx`
- TRD v2.5 section 6.1-6.4: AI prompt engineering, quality evaluation framework
- CONTEXT.md D-01 through D-12: All locked implementation decisions

### Secondary (MEDIUM confidence)
- Anthropic SDK v0.84.0 API: Verified installed version, messages.create() pattern consistent across codebase
- PyPI anthropic latest: 0.86.0 (minor update, no breaking changes expected)

### Tertiary (LOW confidence)
- None -- all findings based on primary source code analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and used extensively in codebase
- Architecture: HIGH - All patterns extrapolated from existing code; critical gap (Ed Discussion sync) identified via code analysis
- Pitfalls: HIGH - All pitfalls derived from concrete code inspection (missing sync task, inline evaluation, counter reset)

**Research date:** 2026-03-28
**Valid until:** 2026-04-28 (stable -- no external dependencies changing)
