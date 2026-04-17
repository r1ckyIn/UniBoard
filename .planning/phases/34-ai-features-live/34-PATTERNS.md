# Phase 34: AI Features Live - Pattern Map

**Mapped:** 2026-04-16
**Files analyzed:** 36 (backend new: 12, backend modified: 11, frontend new: 9, frontend modified: 8, openapi: 1, migration: 1)
**Analogs found:** 35 / 36 (1 has no exact analog — `prompts/path_planner.py` partial match via `prompts/digest.py`)

---

## File Classification

### Backend — NEW

| File | Role | Data Flow | Closest Analog | Match Quality |
|------|------|-----------|----------------|---------------|
| `src/services/study_recommendation.py` | service | CRUD + LLM call + cache | `src/services/digest.py` | exact (daily LLM + cache) |
| `src/services/embedding_worker.py` | service (worker logic) | batch / scheduled | `src/services/qa.py` (`embed_course_materials`) + `src/sync/scheduled.py` | role-match |
| `src/models/study_recommendation_cache.py` | model | per-user cache row | `src/models/digest.py` | exact (UniqueConstraint user+date) |
| `src/schemas/study_recommendation.py` | schema | response envelope | `src/schemas/digest.py` | exact |
| `src/schemas/multi_course_path.py` (or extend `gpa.py`) | schema | request/response | `src/schemas/gpa.py` (GpaPathRequest/Response) | exact |
| `src/prompts/study_recommendation.py` | prompt | bilingual constants | `src/prompts/digest.py` | exact |
| `src/prompts/path_advisory.py` | prompt | bilingual + user-input formatter | `src/prompts/roi.py` (has `get_X_prompt(...)` helper) | role-match |
| `tests/unit/test_study_recommendation_service.py` | test | service unit | `tests/unit/test_digest_service.py` + `tests/unit/test_recall_email.py` (pure-fn pattern) | exact |
| `tests/unit/test_path_planner.py` | test | calc unit | `tests/unit/test_gpa_service.py` | exact |
| `tests/unit/test_embedding_worker.py` | test | scheduler unit | `tests/unit/test_recall_email.py` (pure-fn `should_send_*`) | role-match |
| `tests/unit/test_study_recommendation_scheduler.py` | test | scheduler timing | `tests/unit/test_recall_email.py` + `tests/unit/test_deadline_reminders.py` | role-match |
| `tests/integration/test_rag_real_data.py` | test | env-gated harness | Phase 32.1 `SYNC_REAL_DATA_*` pattern | role-match |
| `supabase/migrations/<ts>_phase34_ai_features.sql` | migration | DDL + RLS | `supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql` + `00000000000002_rls_policies.sql:380-401` | exact |

### Backend — MODIFIED

| File | Role | Change | Closest Analog (for the new code being added) |
|------|------|--------|-----------------------------------------------|
| `src/services/gpa.py` | service | ADD `calculate_multi_course_path()` | existing `calculate_target_path()` in same file (lines 354-470) |
| `src/services/qa.py` | service | MODIFY `stream_answer_question()` to bump `Course.last_qa_access_at` + emit `sources` SSE event | existing `_check_and_increment_limit` row-bump pattern (lines 52-82) |
| `src/services/ai_engine.py` | service | MODIFY citation regex (was `[Canvas: ...]`, becomes `[N]`); add `sources` event helper | existing `_CITATION_PATTERN` line 21 |
| `src/sync/scheduled.py` | scheduler tasks | ADD `generate_study_recommendations_daily` + `embed_hot_courses_worker` | existing `generate_daily_digests` (lines 89-124) and `check_token_health` recall branch (lines 189-213) |
| `src/sync/engine.py` | scheduler registration | REGISTER 2 new jobs | existing `add_job` blocks lines 100-120 |
| `src/sync/__init__.py` | barrel export | ADD 2 new function exports | existing `__all__` list lines 15-25 |
| `src/web/routes/ai.py` | route + SSE | ADD `GET /ai/study-recommendations`; EXTEND `_sse_wrap` with optional `sources` kwarg | existing `_sse_wrap` (lines 96-110) and `course_qa` route (lines 113-130) |
| `src/web/routes/gpa.py` | route | ADD `POST /gpa/multi-course-path` | existing `calculate_path` (lines 182-289) |
| `src/models/user.py` | model | ADD `Profile.remaining_credit_points: int \| None` column | existing `gpa_target` mapped column (line 42) |
| `src/models/course.py` | model | ADD `last_qa_access_at`, `embedded_at`, `content_hash` columns | sibling `Profile.last_sync_at` mapped column (user.py:44-46) |
| `src/config.py` | config | ADD `study_rec_cron_hour_aest`, `embedding_worker_interval_min` settings | existing `digest_cron_hour_aest` (line 79) and `reminder_check_interval_min` (line 82) |
| `src/observability.py` | helper | ADD `sentry_phase_feature_scope(phase, feature)` (optional DRY helper) | existing `sentry_phase_scope` (lines 11-22) |
| `tests/integration/test_ai_routes.py` | test | EXTEND with study-recommendations + sources-event tests | existing `test_post_course_qa_returns_200` (lines 19-52) |
| `tests/integration/test_gpa_routes.py` | test | EXTEND with multi-course-path tests | existing `test_gpa_summary_returns_200` (lines 128-147) |
| `frontend/openapi/openapi.yaml` | contract | ADD 2 new endpoints + 4 new schemas | existing `/gpa/path` block (lines 785-816) |

### Frontend — NEW

| File | Role | Closest Analog | Match Quality |
|------|------|----------------|---------------|
| `frontend/components/predict/StudyRecCard.tsx` | component (Top-3 list) | `frontend/components/predict/RoiCard.tsx` | exact (right-rail card with course-color rows) |
| `frontend/components/predict/MultiCoursePathCard.tsx` | component (verdict + advisory) | `frontend/components/predict/RequiredScoresCard.tsx` (or RoiCard pattern) | role-match |
| `frontend/components/shared/Sources.tsx` | component (citation panel) | `frontend/components/shared/AiChatBubble.tsx` (sibling shared chat utility) | role-match |
| `frontend/hooks/use-study-recommendations.ts` | hook (TanStack query) | `frontend/hooks/use-digest.ts` | exact |
| `frontend/hooks/use-multi-course-path.ts` | hook (TanStack mutation) | `frontend/hooks/use-gpa.ts` (`useGpaPath` mutation) | exact |
| `frontend/components/predict/StudyRecCard.test.tsx` | test | `frontend/__tests__/settings/GpaTargetSection.test.tsx` | exact |
| `frontend/components/predict/MultiCoursePathCard.test.tsx` | test | same | exact |
| `frontend/components/shared/Sources.test.tsx` | test | same | exact |
| `frontend/hooks/use-ai-stream.test.ts` | test | (no existing hook test — model after Phase 33 vitest patterns) | role-match |

### Frontend — MODIFIED

| File | Role | Change |
|------|------|--------|
| `frontend/components/dashboard/HeroSection.tsx` | component | Wire `useStudyRecommendation` for `main_suggestion` (replaces `mockActivity`-based encouragement); D-D1 fallback to `defaultEncouragementProvider` |
| `frontend/components/dashboard/DashboardPage.tsx` | page | Pass `studyRec.data?.data.main_suggestion` to `HeroSection` |
| `frontend/components/predict/PredictPage.tsx` | page | Mount `<StudyRecCard>` and `<MultiCoursePathCard>` in right-rail portal |
| `frontend/components/settings/GpaTargetSection.tsx` | component | ADD 4 quick-pick chips above slider + `remaining_credit_points` numeric input below |
| `frontend/components/course-detail/AiCourseChat.tsx` | component | INTEGRATE `<Sources>` panel after each assistant bubble with citations |
| `frontend/components/deadlines/DeadlineAiChat.tsx` | component | Same integration as AiCourseChat |
| `frontend/lib/api/ai-stream.ts` | lib | EXTEND `SSEEvent.event` union to include `"sources"` |
| `frontend/hooks/use-ai-stream.ts` | hook | EXTEND state with `sources: CitationSource[]`; reset on `clearMessages`; parse `event.event === "sources"` |
| `frontend/lib/api/types.gen.d.ts` | generated types | Run `pnpm generate:types` after `openapi.yaml` edit |

---

## Pattern Assignments

### Backend Services

#### `src/services/study_recommendation.py` (service, CRUD + daily LLM + cache)

**Closest analog:** `src/services/digest.py` (lines 1-89, 196-270, 272-298) — daily generation + AI enhancement with `_anthropic_api_key` ctor + per-user cache UPSERT pattern.

**Imports + class signature** (mirror `digest.py:1-39`):
```python
"""Study recommendation service with daily cache + composite scoring + LLM rendering."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.study_recommendation_cache import StudyRecommendationCache
from src.models.user import Profile
from src.prompts.study_recommendation import get_study_rec_prompt
from src.schemas.study_recommendation import (
    StudyCandidate,
    StudyRecommendationResponse,
)

logger = structlog.get_logger()


class StudyRecommendationService:
    """Generate, cache, and retrieve daily study recommendations."""

    def __init__(
        self,
        session: AsyncSession,
        anthropic_api_key: str = "",
        ai_engine: object | None = None,
        language: str = "en",
    ) -> None:
        self._session = session
        self._anthropic_api_key = anthropic_api_key
        self._ai_engine = ai_engine
        self._language = language
```

**AI enhancement with per-feature graceful fallback** (mirror `digest.py:52-69` + `digest.py:222-250`):
```python
# Source pattern: src/services/digest.py:52-69 (try/except + structlog warning)

ai_summary: str | None = None
if self._anthropic_api_key and candidates:
    profile = await self._session.get(Profile, user_id)
    if profile is not None:
        from src.config import get_settings
        settings = get_settings()
        # NOTE Phase 34 deviation: bypass _check_and_increment_limit for the
        # cron-driven path (per Pitfall 5 — server-initiated job is bounded by
        # APScheduler, not user clicks).  Still record the call to
        # ai_calls_today for telemetry consistency.
        try:
            ai_summary = await self._render_main_suggestion(top_candidates)
            profile.ai_calls_today += 1
            await self._session.flush()
        except Exception:
            logger.warning(
                "study_rec_ai_failed",
                user_id=str(user_id),
                exc_info=True,
            )
            # D-D1 silent fallback — caller renders Top-3 ROI ranking only
```

**UPSERT idempotent cache pattern** (idempotent for daily cron):
```python
# Source pattern: derived from digest.py persistence (digest.py:71-88) +
# UNIQUE(user_id, generated_for_date) constraint on the new table

today_aest = datetime.now(UTC).astimezone(...).date()
stmt = pg_insert(StudyRecommendationCache).values(
    user_id=user_id,
    generated_for_date=today_aest,
    main_suggestion=ai_summary or "",
    top_3=[c.model_dump() for c in top_candidates[:3]],
    language=self._language,
).on_conflict_do_update(
    index_elements=["user_id", "generated_for_date"],
    set_={
        "main_suggestion": ai_summary or "",
        "top_3": [c.model_dump() for c in top_candidates[:3]],
        "language": self._language,
        "updated_at": datetime.now(UTC),
    },
)
await self._session.execute(stmt)
```

**get_latest pattern** (mirror `digest.py:272-298`):
```python
# Source: src/services/digest.py:272-298 (latest reader + reconstruction)

async def get_latest(
    self,
    user_id: uuid.UUID,
) -> StudyRecommendationResponse | None:
    stmt = (
        select(StudyRecommendationCache)
        .where(StudyRecommendationCache.user_id == user_id)
        .order_by(StudyRecommendationCache.generated_for_date.desc())
        .limit(1)
    )
    result = await self._session.execute(stmt)
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return StudyRecommendationResponse(
        generated_for_date=row.generated_for_date.isoformat(),
        main_suggestion=row.main_suggestion,
        top_3=[StudyCandidate(**item) for item in row.top_3],
        language=row.language,
    )
```

**Apply this pattern by:** Mirror `DigestService` exactly: ctor takes `(session, anthropic_api_key, language)`; the generate method (1) collects rule-based candidates by calling `ROIService.get_course_roi(user_id, course_id)` per course + a deadlines query; (2) ranks with the `_score_candidate()` pure helper from §3 of RESEARCH.md; (3) calls AI for the 20-30 word `main_suggestion` only (not for Top-3 ranking); (4) UPSERTs on `(user_id, generated_for_date)`; (5) bypasses `_check_and_increment_limit` per Pitfall 5. The `get_latest` reader matches `DigestService.get_latest` shape.

---

#### `src/services/embedding_worker.py` (service, scheduled batch)

**Closest analog:** `src/services/qa.py:358-414` (existing `embed_course_materials`) for the embed call itself + `src/sync/scheduled.py:127-186` for per-row iteration + sentry pattern.

**Pure gating function pattern** (mirror Phase 33 `should_send_recall_email`):
```python
# Source pattern: src/services/recall_email.py / should_send_recall_email
# (referenced from src/sync/scheduled.py:202)
# Pure function makes scheduler tests possible without freezegun

from datetime import UTC, datetime, timedelta
from src.models.course import Course

HOT_SET_WINDOW_DAYS = 7

def should_reembed_course(
    course: Course,
    computed_hash: str,
    *,
    now: datetime | None = None,
) -> bool:
    """Pure gating: returns True if course is in hot-set AND hash differs.

    The optional ``now`` parameter exists for deterministic testing.
    """
    reference = now or datetime.now(UTC)
    cutoff = reference - timedelta(days=HOT_SET_WINDOW_DAYS)

    # Hot-set: course was queried recently
    if course.last_qa_access_at is None or course.last_qa_access_at < cutoff:
        return False

    # Hash diff: content changed OR never embedded
    if course.embedded_at is None:
        return True
    return course.content_hash != computed_hash
```

**Apply this pattern by:** Implement `embedding_worker.py` with two layers — (1) a pure `should_reembed_course(course, computed_hash, *, now=None)` function with explicit `now` param so tests don't need freezegun (mirror `recall_email.should_send_recall_email`); (2) an async `compute_course_content_hash(course)` helper that selectinloads `course.modules.items` and `course.lessons` then sha256s the concatenated `text_content`; (3) the orchestrator calls `QAService(...).embed_course_materials(course_id)` for each gated course (DO NOT reimplement the embed logic — see Don't Hand-Roll table in RESEARCH §2). Worker iterates COURSES (not users) per RESEARCH §6 pattern note: "embedding worker iterates all *courses* where last_qa_access_at >= now() - 7 days AND (content_hash IS NULL OR embedded_at IS NULL OR content_hash != computed)".

---

### Backend Models

#### `src/models/study_recommendation_cache.py` (model, per-user-per-day cache)

**Closest analog:** `src/models/digest.py` (lines 1-37) — exact pattern for `(user_id, date) UNIQUE` cached LLM output table.

**Full file template** (mirror `digest.py:1-37` 1:1):
```python
"""StudyRecommendationCache ORM model for daily-cached LLM rec rows."""

from __future__ import annotations

import uuid
from datetime import date as date_type, datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.user import Profile


class StudyRecommendationCache(UUIDMixin, TimestampMixin, Base):
    """Daily-cached AI study recommendation row, keyed by (user, AEST date)."""

    __tablename__ = "study_recommendation_cache"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "generated_for_date",
            name="uq_study_rec_user_date",
        ),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("profiles.id"))
    generated_for_date: Mapped[date_type] = mapped_column(Date)
    main_suggestion: Mapped[str] = mapped_column(Text)
    top_3: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    language: Mapped[str] = mapped_column(String(5), default="en")

    # Relationships (back_populates added to Profile)
    profile: Mapped[Profile] = relationship(back_populates="study_recommendations")
```

**Apply this pattern by:** Copy `Digest` model layout 1:1 — `UUIDMixin + TimestampMixin + Base`, `__tablename__ + __table_args__` with `UniqueConstraint`, `user_id ForeignKey("profiles.id")`. Replace `digest_date` with `generated_for_date: Date`, `content_json` with `top_3: JSONB`, add `main_suggestion: Text` and `language: String(5)`. Add `study_recommendations` back-populates relationship to `Profile.relationships`.

---

#### `src/models/user.py` (model, ADD column)

**Closest analog:** existing `Profile.gpa_target` column at line 42.

**Existing pattern** (line 42-43):
```python
gpa_target: Mapped[float | None] = mapped_column(Float, nullable=True)
gpa_scale: Mapped[str] = mapped_column(String(10), default="wam")
```

**New column to add** (insert after `gpa_scale`, line 43):
```python
remaining_credit_points: Mapped[int | None] = mapped_column(
    Integer,
    nullable=True,
    comment=(
        "User's remaining credit points to graduation. Canonical user input. "
        "USYD typical Bachelor=144cp; planner does NOT auto-infer."
    ),
)
```

**Apply this pattern by:** Match the `gpa_target` mapped_column shape exactly — `Mapped[int | None]`, `nullable=True`, no default, English comment per `02-standards/code-comments.md`. Add `Integer` to the existing imports tuple from `sqlalchemy`.

---

#### `src/models/course.py` (model, ADD 3 columns)

**Closest analog:** Existing `Course` model lines 33-43; the `String(50)/nullable=True` and `DateTime(timezone=True)/nullable=True` patterns from `Profile`.

**Existing pattern** (course.py:32-43 + user.py:44-46 for DateTime nullable):
```python
# course.py existing nullable column shape
canvas_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)

# user.py existing TIMESTAMPTZ NULL shape
last_sync_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True), nullable=True
)
```

**New columns** (add after `name_zh` at line 43):
```python
# Phase 34 — RAG hot-set tracker + content-hash trigger
last_qa_access_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,
    comment="Bumped on every /qa or /qa/stream call; fuels hot-set predicate.",
)
embedded_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,
    comment="Set by embedding worker after successful re-embed.",
)
content_hash: Mapped[str | None] = mapped_column(
    String(64),
    nullable=True,
    comment=(
        "sha256 of concatenated module_items.text_content + lessons.text_content. "
        "Worker re-embeds when computed hash differs from this column."
    ),
)
```

**Apply this pattern by:** Add `DateTime` to the existing `from sqlalchemy import` line. Note RESEARCH §10 flags Course-vs-Module hash placement as a HIGH-risk assumption (A1) — RESEARCH recommends `Course.content_hash` since the embedding pipeline operates per-course. Planner must reconcile with CONTEXT.md D-B2 (which says `Module.content_hash`); recommend going with `Course.content_hash` and documenting the deviation.

---

### Backend Schemas

#### `src/schemas/study_recommendation.py` (schema, response envelope)

**Closest analog:** `src/schemas/digest.py` (lines 1-27) — exact pattern for "list of items + optional AI summary + ISO timestamps".

**Full file template** (mirror `digest.py:1-27`):
```python
"""Pydantic schemas for study recommendation endpoint."""

from pydantic import BaseModel, ConfigDict


class StudyCandidate(BaseModel):
    """Single ranked study candidate (assessment-level)."""

    model_config = ConfigDict(from_attributes=True)

    course_code: str
    assessment_name: str
    weight: float
    days_until_due: float
    roi_score: float
    score: float  # composite ranking score (urgency × weight × sqrt(roi))


class StudyRecommendationResponse(BaseModel):
    """Daily cached recommendation result."""

    model_config = ConfigDict(from_attributes=True)

    generated_for_date: str  # ISO 8601 date
    main_suggestion: str  # 20-30 word LLM output (empty if AI failed)
    top_3: list[StudyCandidate]
    language: str
```

**Apply this pattern by:** Copy `DigestResponse` shape — `model_config = ConfigDict(from_attributes=True)`, ISO-string timestamps (not `datetime` objects, mirror `DigestResponse.digest_date: str`), `main_suggestion: str` instead of nullable since the contract returns `""` on AI fallback (frontend hook checks for empty-string and falls back to `defaultEncouragementProvider`).

---

#### `src/schemas/multi_course_path.py` or extend `src/schemas/gpa.py` (schema, request + response)

**Closest analog:** `src/schemas/gpa.py:222-235` (`GpaPathRequest`/`GpaPathResponse`).

**Existing pattern** (gpa.py:231-235):
```python
class GpaPathRequest(BaseModel):
    """Request body for POST /gpa/path."""

    target_wam: float = Field(ge=0, le=100)
```

**New schemas to add** (extend gpa.py, mirror existing pattern):
```python
# Phase 34 — multi-course path planner

class MultiCoursePathRequest(BaseModel):
    """Request body for POST /gpa/multi-course-path."""

    target_wam: float = Field(ge=0, le=100)
    remaining_credit_points: int = Field(ge=0)


class MultiCoursePathResponse(BaseModel):
    """Multi-course planner result (math + optional AI advisory)."""

    target_wam: float
    current_wam: float
    is_achievable: bool
    required_avg: float | None  # None if cp_remain=0 OR target already met
    max_reachable: float
    suggested_target: float | None  # next-best USYD band when unreachable
    advisory_text: str | None  # AI verdict + tactic; None when AI failed (D-D1)
    language: str  # "en" | "zh"
```

**Apply this pattern by:** Extend existing `gpa.py` (do not create separate file — keeps schema imports consolidated). Use `Field(ge=0, le=100)` literal for the WAM bound (V5 input validation per RESEARCH §10 Security Domain), `Field(ge=0)` for the credit-points integer. Mark all four nullable fields with `| None` (mypy-strict friendly union syntax already used throughout the file).

---

### Backend Prompts

#### `src/prompts/study_recommendation.py` (prompt, EN + ZH bilingual)

**Closest analog:** `src/prompts/digest.py` (lines 14-26) — exact pattern for "20-30 word action-oriented" precision prompt.

**Existing pattern** (digest.py:14-26):
```python
DIGEST_SUMMARY_SYSTEM_PROMPT = (
    "You are UniBoard's digest summarizer. Given academic items, "
    "generate a 20-30 word action-oriented study guidance summary. "
    "Focus on highest urgency items. Be precise, no generic encouragement. "
    "Example: 'Focus on COMP3221 Quiz 3 (due 18h) -- review lecture 8 sliding window.'"
)

DIGEST_SUMMARY_SYSTEM_PROMPT_ZH = (
    "你是 UniBoard 的学业摘要生成器。根据以下学术事项，"
    "生成 20-30 字的行动导向学习指引。"
    "聚焦最紧急的事项，精确具体，不要笼统的鼓励话。"
    "示例：'重点复习 COMP3221 Quiz 3（还剩 18 小时）— 回顾第 8 讲滑动窗口。'"
)
```

**Apply this pattern by:** Copy `digest.py` structure exactly — two module-level constants `STUDY_REC_SYSTEM_PROMPT` and `STUDY_REC_SYSTEM_PROMPT_ZH`, plus a `get_study_rec_prompt(language: str = "en") -> str` selector helper (mirror `prompts/qa.py:21-23`). RESEARCH §3 provides a concrete prompt body that already follows the "20-30 word + concrete tactic" rule from Phase 18.

---

#### `src/prompts/path_advisory.py` (prompt, EN + ZH + user-input formatter)

**Closest analog:** `src/prompts/roi.py` (lines 1-36) — has both the system prompt AND a `get_X_prompt(...)` helper that builds the user message from structured args. Path advisory needs the same shape since the planner sends structured math results into the prompt.

**Existing pattern — system prompt + user-message builder** (roi.py:3-36):
```python
DIFFICULTY_SYSTEM_PROMPT = (
    "You are UniBoard's assignment difficulty estimator. "
    "Given an assignment's name, description, type, and Ed Discussion thread count, "
    "estimate its difficulty on a 1-5 scale:\n"
    # ...
    'Respond ONLY in JSON: {"difficulty": float, "confidence": int, "reasoning": str}\n'
    "confidence is 0-100 representing how certain you are."
)


def get_difficulty_prompt(
    name: str,
    description: str | None,
    thread_count: int,
    assignment_type: str = "unknown",
) -> str:
    """Build user message for difficulty inference."""
    parts = [f"Assignment: {name}"]
    if description:
        desc = description[:500] + "..." if len(description) > 500 else description
        parts.append(f"Description: {desc}")
    parts.append(f"Type: {assignment_type}")
    parts.append(f"Ed Discussion threads about this: {thread_count}")
    return "\n".join(parts)
```

**Apply this pattern by:** Two module-level system prompts (`PATH_ADVISORY_SYSTEM_PROMPT` + `_ZH`). Per CONTEXT.md D-C4 the format is `[Verdict] + [Required avg] + [Concrete tactic referencing high-weight remaining unit type]` and length is 30-50 words (NOT 20-30 — this differs from digest/study-rec). Add a `get_path_advisory_user_message(*, is_achievable: bool, required_avg: float | None, max_reachable: float, suggested_target: float | None, course_levels: list[int])` helper that formats the math result into a user-message string.

---

### Backend Routes & SSE Extension

#### `src/web/routes/ai.py` (route, ADD GET endpoint + EXTEND `_sse_wrap`)

**Closest analog for new GET endpoint:** `src/web/routes/roi.py:22-37` — minimal GET endpoint with `Depends`, `@limiter.limit`, `SuccessResponse[T]` envelope.

**Existing pattern — minimal GET endpoint** (roi.py:22-37):
```python
@router.get("/{course_id}/roi")
@limiter.limit("10/minute")
async def get_course_roi(
    course_id: uuid.UUID,
    request: Request,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: ROIService = Depends(get_roi_service),
) -> SuccessResponse[CourseROIResponse]:
    result = await svc.get_course_roi(current_user_id, course_id)
    meta = get_request_meta(request)
    return SuccessResponse(data=result, meta=meta)
```

**Existing pattern — SSE wrapper to extend** (ai.py:96-110):
```python
async def _sse_wrap(
    stream: AsyncGenerator[str, None],
    initial_phase: str,
) -> AsyncGenerator[dict[str, str], None]:
    yield {"event": "status", "data": json.dumps({"phase": initial_phase})}

    try:
        async for token in stream:
            yield {"event": "token", "data": json.dumps({"text": token})}
        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    except Exception as exc:
        logger.exception("sse_stream_error", error=str(exc))
        yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}
```

**Extension pattern for `_sse_wrap`** (Phase 34 mod):
```python
async def _sse_wrap(
    stream: AsyncGenerator[str, None],
    initial_phase: str,
    sources: list[dict[str, object]] | None = None,  # Phase 34: NEW kwarg
) -> AsyncGenerator[dict[str, str], None]:
    yield {"event": "status", "data": json.dumps({"phase": initial_phase})}
    if sources:
        # Phase 34: emit BEFORE first token so frontend has the citation map ready
        yield {"event": "sources", "data": json.dumps({"sources": sources})}
    try:
        async for token in stream:
            yield {"event": "token", "data": json.dumps({"text": token})}
        yield {"event": "done", "data": json.dumps({"status": "complete"})}
    except Exception as exc:
        logger.exception("sse_stream_error", error=str(exc))
        yield {"event": "error", "data": json.dumps({"message": "AI request failed"})}
```

**Apply this pattern by:** Add `@router.get("/ai/study-recommendations")` mirroring `roi.py:22-37` shape — `Depends(get_current_user_id) + Depends(get_session)`, `@limiter.limit("60/minute")` (cheap DB read per RESEARCH §10 rate-limit table), returns `SuccessResponse[StudyRecommendationResponse]`. For `_sse_wrap` extension, add the optional `sources` kwarg with default `None`; emit `event: sources` SYNCHRONOUSLY at the start (RESEARCH §10 Pitfall 2) so frontend receives it before the first `token`. Keep the existing `event: status → token* → done` order intact.

---

#### `src/web/routes/gpa.py` (route, ADD POST endpoint)

**Closest analog:** `src/web/routes/gpa.py:182-289` (`calculate_path` — existing single-course path endpoint).

**Existing pattern** (gpa.py:182-189):
```python
@router.post("/path")
async def calculate_path(
    body: GpaPathRequest,
    request: Request,
    session: AsyncSession = Depends(get_session),
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    svc: GPAService = Depends(get_gpa_service),
) -> SuccessResponse[GpaPathResponse]:
    """Calculate target path matching frontend GpaPath type."""
    courses = await svc._load_user_courses(current_user_id)
    target = Decimal(str(body.target_wam))
    # ... math ...
    return SuccessResponse(data=data, meta=get_request_meta(request))
```

**Apply this pattern by:** Mirror the `calculate_path` shape — `body: MultiCoursePathRequest` validated by Pydantic, `Depends(get_gpa_service)` injection, `SuccessResponse[MultiCoursePathResponse]` return. Add `@limiter.limit("10/minute")` decorator per RESEARCH §10 (involves AI call). Endpoint body is thin: call `await svc.calculate_multi_course_path(current_user_id, body.target_wam, body.remaining_credit_points)`, then optionally call AI advisory wrapper, then return `SuccessResponse(data=data, meta=get_request_meta(request))`. Use `Field(ge=0, le=100)` and `Field(ge=0)` validators on the request schema (V5 input validation per ASVS).

---

#### `src/services/qa.py` (service, EXTEND `stream_answer_question` to bump `last_qa_access_at` + emit sources)

**Closest analog (in same file):** `src/services/qa.py:52-82` (`_check_and_increment_limit`) — shows the row-bump pattern with `with_for_update()`.

**Existing pattern — row-locked column bump** (qa.py:52-82):
```python
async def _check_and_increment_limit(self, user_id: uuid.UUID) -> Profile:
    settings = get_settings()
    stmt = select(Profile).where(Profile.id == user_id).with_for_update()
    result = await self._session.execute(stmt)
    user = result.scalar_one_or_none()
    # ...
    user.ai_calls_today += 1
    await self._session.flush()
    return user
```

**Apply this pattern by:** Add a new private helper `_bump_qa_access(course_id: uuid.UUID) -> None` that loads `Course` (NO `with_for_update()` — RESEARCH §10 says race acceptable for heuristic column), sets `course.last_qa_access_at = datetime.now(UTC)`, calls `await self._session.flush()`. Call it at the top of `stream_answer_question()` and `answer_question()` BEFORE `_load_course_materials`. For the SSE `sources` emission: after RAG retrieval, build the `sources` payload (RESEARCH §5 schema), bind it to the route layer's `_sse_wrap(stream, "searching", sources=sources)` call.

---

### Backend Scheduler

#### `src/sync/scheduled.py` (scheduled tasks, ADD 2 new async functions)

**Closest analog (daily LLM job + per-user iteration):** `src/sync/scheduled.py:89-124` (`generate_daily_digests`) — exact mirror for `generate_study_recommendations_daily`.

**Existing pattern — daily per-user LLM job** (scheduled.py:89-124):
```python
async def generate_daily_digests() -> None:
    """Generate daily digests for all users.

    Runs via CronTrigger at 07:00 AEST (Australia/Sydney timezone).
    """
    from src.config import get_settings
    from src.services.digest import DigestService

    session_factory = _get_sync_session_factory()
    settings = get_settings()

    async with session_factory() as session:
        result = await session.execute(select(Profile))
        users = list(result.scalars().all())

    if not users:
        logger.info("digest_skip", reason="no users")
        return

    for user in users:
        try:
            async with session_factory() as session:
                svc = DigestService(
                    session,
                    anthropic_api_key=settings.anthropic_api_key,
                    language="en",
                )
                await svc.generate_digest(user.id)
                await session.commit()
                logger.info("digest_generated", user_id=str(user.id))
        except Exception:
            logger.error(
                "digest_generation_failed",
                user_id=str(user.id),
                exc_info=True,
            )
```

**Closest analog (sentry-tagged isolated branch):** `src/sync/scheduled.py:189-213` (recall email branch).

**Existing pattern — sentry_phase_scope-tagged isolated try/except** (scheduled.py:189-213):
```python
# Recall email evaluation (EMAIL-03) -- isolated so a failure here
# never propagates into the per-user loop above.
try:
    async with session_factory() as session:
        # ... per-user work ...
        await session.commit()
except Exception:
    with sentry_phase_scope("33"):
        sentry_sdk.capture_exception()
    logger.warning(
        "recall_email_branch_failed",
        user_id=str(user.id),
        exc_info=True,
    )
```

**Apply this pattern by:** New function `generate_study_recommendations_daily()` mirrors `generate_daily_digests` 1:1 (per-user iteration, fresh session per user, try/except around each user's work). UPGRADE the bare `logger.error` to `with sentry_phase_scope("34"): sentry_sdk.capture_exception()` followed by `logger.warning(..., user_id=..., exc_info=True)` — per Phase 33 pattern (lines 207-213) and CONTEXT.md D-D2 ("Logged to Sentry with `feature` tag"). Pass `language=user.language_preference` (NOT `"en"` literal — D-A2 says rec is in user's language). For `embed_hot_courses_worker()`, iterate COURSES not users (RESEARCH §6) — query `select(Course).where(Course.last_qa_access_at >= now() - timedelta(days=7))`.

---

#### `src/sync/engine.py` (scheduler registration, ADD 2 `add_job` blocks)

**Closest analog:** `src/sync/engine.py:100-120` — exact pattern for both `CronTrigger(timezone="Australia/Sydney")` and `IntervalTrigger(minutes=N)`.

**Existing pattern — CronTrigger AEST + IntervalTrigger** (engine.py:100-120):
```python
# Daily digest generation (AEST timezone for DST correctness)
scheduler.add_job(
    generate_daily_digests,
    CronTrigger(
        hour=settings.digest_cron_hour_aest,
        minute=0,
        timezone="Australia/Sydney",
    ),
    id="generate_daily_digests",
    replace_existing=True,
    max_instances=1,
)

# Token health check (runs alongside reminders, same interval)
scheduler.add_job(
    check_token_health,
    IntervalTrigger(minutes=settings.reminder_check_interval_min),
    id="check_token_health",
    replace_existing=True,
    max_instances=1,
)
```

**Apply this pattern by:** Insert AFTER existing `generate_daily_digests` block (line 111). Two new `add_job` blocks: (1) `generate_study_recommendations_daily` with `CronTrigger(hour=settings.study_rec_cron_hour_aest, minute=0, timezone="Australia/Sydney")` — copy `digest_cron_hour_aest` literal exactly, including the `timezone="Australia/Sydney"` literal (CLAUDE.md "Digest 调度器时区陷阱" Pitfall 4 prevents UTC offset hardcoding); (2) `embed_hot_courses_worker` with `IntervalTrigger(minutes=settings.embedding_worker_interval_min)`. Both: `replace_existing=True, max_instances=1`. Update the `logger.info("sync_engine_started", ...)` call below (line 132) to include the new interval kwargs.

---

#### `src/sync/__init__.py` (barrel export, ADD 2 functions)

**Closest analog:** Lines 9-13 + 15-25 — existing import + `__all__` list.

**Existing pattern**:
```python
from src.sync.scheduled import (
    check_deadline_reminders,
    check_token_health,
    generate_daily_digests,
)

__all__ = [
    "check_deadline_reminders",
    "check_token_health",
    "generate_daily_digests",
    # ... others ...
]
```

**Apply this pattern by:** Add `generate_study_recommendations_daily` and `embed_hot_courses_worker` to both the import block and the `__all__` list (alphabetical insertion preferred for consistency with existing list).

---

#### `src/config.py` (config, ADD 2 settings)

**Closest analog:** `src/config.py:78-82` — `digest_cron_hour_aest` and `reminder_check_interval_min`.

**Existing pattern** (config.py:78-82):
```python
# Digest -- uses Australia/Sydney timezone, NOT static UTC offset
digest_cron_hour_aest: int = 7  # 07:00 AEST (APScheduler handles DST)

# Reminder check interval
reminder_check_interval_min: int = 30
```

**Apply this pattern by:** Insert AFTER `reminder_check_interval_min`:
```python
# Phase 34 — Study recommendations daily cache
study_rec_cron_hour_aest: int = 7  # 07:00 AEST (APScheduler handles DST)

# Phase 34 — Hot-set embedding worker interval
embedding_worker_interval_min: int = 30
```
English-only inline comments per `02-standards/code-comments.md`. No `.env` defaults change required (defaults are sensible).

---

#### `src/observability.py` (helper, OPTIONAL DRY helper for feature tagging)

**Closest analog (in same file):** `sentry_phase_scope` (lines 11-22).

**Existing pattern** (observability.py:11-22):
```python
@contextmanager
def sentry_phase_scope(phase: str) -> Iterator[sentry_sdk.Scope]:
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("phase", phase)
        yield scope
```

**Apply this pattern by:** Optional addition (RESEARCH §10 recommends but does not require). Add a sister helper:
```python
@contextmanager
def sentry_phase_feature_scope(
    phase: str, feature: str
) -> Iterator[sentry_sdk.Scope]:
    """Tag Sentry events with both phase= and feature= for ops triage."""
    with sentry_sdk.new_scope() as scope:
        scope.set_tag("phase", phase)
        scope.set_tag("feature", feature)
        yield scope
```
Use in fallback branches like `with sentry_phase_feature_scope("34", "study_recommendation"): sentry_sdk.capture_exception()`. If the planner prefers minimal blast radius, skip this and inline `set_tag("feature", ...)` per call site.

---

### Backend Migration

#### `supabase/migrations/<timestamp>_phase34_ai_features.sql` (migration, DDL + RLS)

**Closest analog (column ADD + comment):** `supabase/migrations/00000000000007_recall_email_and_oauth_profile.sql` (lines 1-44).
**Closest analog (RLS for via-FK table):** `supabase/migrations/00000000000002_rls_policies.sql:380-401` (content_embeddings RLS).
**Closest analog (table create with FK + UNIQUE + index):** `supabase/migrations/00000000000001_initial_schema.sql:382-402` (content_embeddings table).

**Existing pattern — ADD COLUMN with comment** (007:9-15):
```sql
ALTER TABLE public.profiles
  ADD COLUMN recall_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.recall_email_sent_at IS
  'Timestamp of the most recent recall (re-engagement) email sent to this user. NULL = never sent. Used by check_token_health() to enforce a 30-day re-send cap.';

-- No index: at <10k users a partial index is not justified (see 33-RESEARCH Q4).
```

**Existing pattern — RLS via course_id FK** (002:380-401):
```sql
ALTER TABLE content_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings"
  ON content_embeddings FOR SELECT TO authenticated
  USING (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));

CREATE POLICY "Users can insert own embeddings"
  ON content_embeddings FOR INSERT TO authenticated
  WITH CHECK (course_id IN (SELECT id FROM courses WHERE user_id = (select auth.uid())));
-- ... UPDATE + DELETE ...
```

**Existing pattern — create table with UNIQUE + index + updated_at trigger** (001:386-402):
```sql
CREATE TABLE content_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(30) NOT NULL,
  -- ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_embeddings_course ON content_embeddings (course_id);

CREATE TRIGGER content_embeddings_updated_at
  BEFORE UPDATE ON content_embeddings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
```

**Apply this pattern by:** Single migration file with five sections:

1. **(profiles) ADD `remaining_credit_points INTEGER`** — mirror 007:10-14 `ALTER TABLE ... ADD COLUMN ...` + `COMMENT ON COLUMN ...` (English-only comment).
2. **(courses) ADD `last_qa_access_at TIMESTAMPTZ`, `embedded_at TIMESTAMPTZ`, `content_hash VARCHAR(64)`** — three `ALTER TABLE ... ADD COLUMN` blocks, each with `COMMENT ON COLUMN`. Add `CREATE INDEX ix_courses_last_qa_access ON courses (last_qa_access_at) WHERE last_qa_access_at IS NOT NULL` (partial index — embedding worker filters on `>= now() - 7d`).
3. **(study_recommendation_cache) CREATE TABLE** — mirror 001:386-402 shape; add `UNIQUE(user_id, generated_for_date)` constraint inline; add `CREATE INDEX ix_study_rec_user_date ON study_recommendation_cache (user_id, generated_for_date DESC)`; add `CREATE TRIGGER study_recommendation_cache_updated_at BEFORE UPDATE ... EXECUTE FUNCTION handle_updated_at()`.
4. **(study_recommendation_cache RLS)** — mirror 002:380-401 but with **direct user_id** scope: `USING (user_id = (select auth.uid()))` (NOT via course_id FK; this table is per-user not per-course). Four policies: SELECT for authenticated, INSERT/UPDATE/DELETE for service_role only (the daily APScheduler job runs as service role). Pattern in RESEARCH §10 Supabase RLS section.
5. **NO pgvector new columns** — RESEARCH §1 finding 3 confirms Phase 34 only needs scalar columns. Avoid the `sa.Column(sa.Column)` Alembic trap (CLAUDE.md "Alembic Migration 中 sa.Column 误用").

Use the next sequential migration filename: `00000000000008_phase34_ai_features.sql` (007 is the latest per `supabase/migrations/`).

---

### Backend Tests

#### `tests/unit/test_study_recommendation_service.py` (test, service unit)

**Closest analog (DB-fixture style):** `tests/unit/test_digest_service.py:16-80` — uses `@pytest.mark.db` + real `AsyncSession` to insert + assert.
**Closest analog (mock-AsyncMock style):** `tests/unit/test_qa_service.py:1-86` — uses `AsyncMock` + `MagicMock(spec=Profile)` for pure-function-style tests.

**Existing pattern — DB fixture w/ Profile, Course, Grade, UnifiedDeadline seed** (test_digest_service.py:16-80):
```python
async def _create_profile_with_data(session: AsyncSession) -> Profile:
    profile = Profile(
        id=uuid.uuid4(),
        display_name="Digest Tester",
        gpa_target=80.0,
    )
    session.add(profile)
    await session.flush()

    course = Course(
        user_id=profile.id,
        name="Systems Programming",
        code="COMP2017",
        semester="2026S1",
        credit_points=6,
    )
    session.add(course)
    await session.flush()

    # Recent grade (graded in last 24h)
    grade = Grade(
        course_id=course.id,
        # ...
    )
    session.add(grade)
    # ...
    return profile


@pytest.mark.db
@pytest.mark.asyncio
async def test_generate_rule_based_digest(session: AsyncSession) -> None:
    """DigestService generates digest with grades and deadlines from last 24h."""
    from src.services.digest import DigestService

    user = await _create_profile_with_data(session)

    svc = DigestService(session, anthropic_api_key="")
    result = await svc.generate_digest(user.id)
```

**Existing pattern — pure unit-style with AsyncMock** (test_qa_service.py:71-86):
```python
def _make_session_mocks(
    mock_user: MagicMock,
    mock_course: MagicMock,
) -> AsyncMock:
    mock_session = AsyncMock()
    user_result = MagicMock()
    user_result.scalar_one_or_none = MagicMock(return_value=mock_user)
    course_result = MagicMock()
    course_result.scalar_one_or_none = MagicMock(return_value=mock_course)
    mock_session.execute = AsyncMock(side_effect=[user_result, course_result])
    mock_session.flush = AsyncMock()
    return mock_session
```

**Apply this pattern by:** Hybrid — use the **DB-fixture pattern from `test_digest_service.py`** for `test_generate_and_cache`, `test_cache_upsert_idempotent`, `test_get_latest`. Use the **AsyncMock pattern from `test_qa_service.py`** for `test_score_candidate_ranking` (pure function test — no DB needed) and `test_ai_failure_fallback` (mock AIEngine to raise, assert response has empty `main_suggestion` but populated `top_3`). Mark DB-style tests with both `@pytest.mark.db` and `@pytest.mark.asyncio`.

---

#### `tests/unit/test_path_planner.py` (test, calc unit)

**Closest analog:** `tests/unit/test_gpa_service.py` (uses `@pytest.mark.db @pytest.mark.asyncio` with seed helpers similar to `test_digest_service`).

**Apply this pattern by:** Pure-function tests for `_suggest_next_band(max_reachable, original_target)` (no DB needed); DB tests for `calculate_multi_course_path` mirroring `test_gpa_service.py`. Required test cases per RESEARCH §10 Validation map: `test_required_avg_math` (target=78, current=75), `test_unreachable_returns_suggestion` (target=85, current=60, cp_done=72, cp_remain=72), `test_zero_remaining` (cp_remain=0 → required_avg=None), `test_already_achieved` (current >= target → required_avg=0). Use `Decimal(str(...))` literals in expected values to mirror service-side rounding (RESEARCH §10 Pitfall 4).

---

#### `tests/unit/test_embedding_worker.py` (test, scheduler unit)

**Closest analog:** `tests/unit/test_recall_email.py:1-113` — pure-function gating tests for `should_send_recall_email` with explicit `now` parameter (NO freezegun).

**Existing pattern — pure-function gating tests** (test_recall_email.py:18-112):
```python
NOW = datetime(2026, 4, 15, tzinfo=UTC)


def _make_profile(
    *,
    canvas_status: str = "active",
    last_sync_at: datetime | None = None,
    recall_email_sent_at: datetime | None = None,
) -> Profile:
    profile = MagicMock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.canvas_token_status = canvas_status
    profile.last_sync_at = last_sync_at
    profile.recall_email_sent_at = recall_email_sent_at
    return profile


def test_3_returns_false_when_sync_recent() -> None:
    """Test 3: last_sync_at < 14d ago -> False."""
    absent_sign_in = NOW - timedelta(days=30)
    recent_sync = NOW - timedelta(days=5)
    profile = _make_profile(
        canvas_status="expired",
        last_sync_at=recent_sync,
        recall_email_sent_at=None,
    )
    assert should_send_recall_email(profile, absent_sign_in, NOW) is False
```

**Apply this pattern by:** Test the pure `should_reembed_course(course, computed_hash, *, now=NOW)` function with 4-6 cases: cold-set (`last_qa_access_at < 7d ago` → False), hot+never-embedded (`embedded_at IS NULL` → True), hot+hash-match (`computed_hash == content_hash` → False), hot+hash-diff (`computed_hash != content_hash` → True). Use the same fixed `NOW` constant pattern. For the orchestrator test (full embed call), mock `QAService.embed_course_materials` with `AsyncMock` and assert it was called once per gated course.

---

#### `tests/integration/test_rag_real_data.py` (test, env-gated harness)

**Closest analog:** Phase 32.1 `SYNC_REAL_DATA_*` env-gated pattern (referenced in RESEARCH §4 and §10).

**Apply this pattern by:** At top of file: `pytest.mark.skipif(os.getenv("RAG_REAL_DATA_COURSE_ID") is None, reason="RAG_REAL_DATA_COURSE_ID env var not set")`. Inside the test: read `course_id = uuid.UUID(os.environ["RAG_REAL_DATA_COURSE_ID"])`, run `await QAService(...).embed_course_materials(course_id)`, then issue 3 hand-crafted questions ("What's the weight of Quiz 1?", "When is the final?", "Explain [known concept]"), assert each `QAResponse.citations` is non-empty AND at least one citation matches a known module title from the synced lessons. CI keeps the env var unset → test auto-skips.

---

#### `tests/integration/test_ai_routes.py` (test, EXTEND)

**Closest analog (in same file):** `test_post_course_qa_returns_200` (lines 19-52).

**Existing pattern — patch service builder + dependency override** (test_ai_routes.py:19-52):
```python
@pytest.mark.asyncio(loop_scope="session")
async def test_post_course_qa_returns_200(
    test_client: httpx.AsyncClient,
) -> None:
    course_id = uuid.uuid4()

    qa_response = QAResponse(...)

    app = test_client._transport.app  # type: ignore[union-attr]
    app.dependency_overrides[get_current_user_id] = lambda: _TEST_USER_ID

    with patch("src.web.routes.ai._build_qa_service") as mock_build:
        mock_svc = AsyncMock()
        mock_svc.answer_question = AsyncMock(return_value=qa_response)
        mock_build.return_value = mock_svc

        resp = await test_client.post(
            f"/api/v1/courses/{course_id}/qa",
            json={"question": "What is the answer?"},
            headers={"Authorization": "Bearer fake-token"},
        )

    app.dependency_overrides.pop(get_current_user_id, None)

    assert resp.status_code == 200
```

**Apply this pattern by:** Add 2 new tests — (1) `test_get_study_recommendations_returns_cached_row` — patch `StudyRecommendationService.get_latest` to return a fixture, assert response shape matches `StudyRecommendationResponse`; (2) `test_sse_emits_sources_event_before_tokens` — capture SSE stream, assert event order is `status → sources → token+ → done` (use `httpx-sse` if available or parse raw text). Both tests follow the existing `app.dependency_overrides[get_current_user_id]` + `with patch(...)` pattern.

---

### Frontend Components & Hooks

#### `frontend/components/predict/StudyRecCard.tsx` (component, Top-3 list)

**Closest analog:** `frontend/components/predict/RoiCard.tsx` (lines 1-196) — exact pattern for right-rail RoughCard with course-color rows.

**Existing pattern — RoughCard structure with course-color dots and meta rows** (RoiCard.tsx:107-175):
```tsx
return (
  <RoughCard disableHover padding="py-[22px] px-[20px]">
    {cardHeader}

    {/* Ranked assignments */}
    {rankedItems.map((item, idx) => {
      const priority = getPriority(item.roi_score);

      return (
        <div
          key={`${item.course_code}-${item.assessment_name}-${idx}`}
          className="flex items-start gap-[8px] py-[7px] border-b border-[#eae7e0] last:border-b-0"
        >
          {/* Course color dot */}
          <div
            className="w-[8px] h-[8px] rounded-full flex-shrink-0 mt-[4px]"
            style={{ backgroundColor: item.course_color.base }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Assessment name + course code */}
            <div className="flex items-center gap-[6px]">
              <span className="text-[0.74rem] font-semibold text-[#2d2d2a] truncate">
                {item.assessment_name}
              </span>
              {/* ... */}
            </div>
            {/* Meta row */}
            <div className="flex items-center gap-[8px] mt-[2px]">
              <span className="text-[0.64rem] font-medium text-[#6b6b65]">
                {item.course_code}
              </span>
              <span className="text-[0.62rem] text-[#9b9b94]">
                {t("roi_weight")}: {Math.round(item.weight * 100)}%
              </span>
            </div>
          </div>
          {/* Score on right */}
        </div>
      );
    })}
  </RoughCard>
);
```

**Apply this pattern by:** Mirror `RoiCard.tsx` 1:1 for visual consistency — `RoughCard disableHover padding="py-[22px] px-[20px]"`, `useTranslations("predict")` namespace, course color dot via `getCourseColor(course_code)` helper (already imported in PredictPage), weight pill, days-until-due badge, composite-score column on the right. Skeleton state mirrors lines 83-94. Empty state mirrors lines 96-105. Hide AI badge unless backend returns `ai_generated: true` (currently no — Top-3 is structured-only per RESEARCH §10 Open Question 5).

---

#### `frontend/components/predict/MultiCoursePathCard.tsx` (component, verdict + advisory)

**Closest analog:** `frontend/components/predict/RoiCard.tsx` for `RoughCard` shell. RESEARCH §9 provides a rough sketch with `Badge`, numeric line, `<p className="italic">{advisory_text}</p>`.

**Apply this pattern by:** `RoughCard disableHover padding="py-[22px] px-[20px]"`. Header with `t("path.title")`. Verdict badge: green when `is_achievable=true` ("可达 / Reachable"), amber when tight (required_avg > 80), red when `is_achievable=false` ("不可达 — 建议 ${suggested_target}"). Numeric line: `t("path.requiredAvg", { remainingCp, requiredAvg })`. Advisory paragraph: `path.advisory_text && <p className="italic text-[0.72rem] text-[#6b6b65] mt-[12px]">{path.advisory_text}</p>` — D-D1 silent fallback (hide entirely when null, no banner). Use `useTranslations("predict")` namespace.

---

#### `frontend/components/shared/Sources.tsx` (component, citation panel)

**Closest analog (in same dir):** `frontend/components/shared/AiChatBubble.tsx` (45 lines, simple presentational). RESEARCH §9 provides a `<details>` collapsible sketch.

**Existing pattern — small shared presentational component** (AiChatBubble.tsx):
```tsx
"use client";

import { cn } from "@/lib/utils/cn";

interface AiChatBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function AiChatBubble({ role, content, isStreaming = false }: AiChatBubbleProps) {
  // ...
  return (
    <div className={cn(...)}>...</div>
  );
}
```

**Apply this pattern by:** `"use client"`, named export `Sources`. Props: `{ sources: CitationSource[] }`. Render a `<details>` element (HTML-native collapsible — no external library):
```tsx
<details className="text-[0.72rem] text-[#6b6b65] mt-[8px]">
  <summary className="cursor-pointer hover:text-[#2d2d2a] transition-colors">
    {t("sources.label", { count: sources.length })}
  </summary>
  <ol className="mt-[6px] space-y-[4px] pl-[16px]">
    {sources.map((s) => (
      <li key={s.index}>
        <span className="font-semibold">[{s.index}]</span> {s.title}
        {s.anchor && <> · {s.anchor}</>}
        <span className="ml-[6px] text-[#9b9b94]">{(s.score * 100).toFixed(0)}%</span>
        {s.excerpt && <p className="italic mt-[2px]">{s.excerpt}</p>}
      </li>
    ))}
  </ol>
</details>
```
DO NOT use `scrollIntoView` from list items unless guarded with `typeof element.scrollIntoView === "function"` (CLAUDE.md jsdom Pitfall 6 + RESEARCH §10 Pitfall 6). Use `useTranslations("shared")` or `useTranslations("ai")` namespace.

---

#### `frontend/hooks/use-study-recommendations.ts` (hook, TanStack query)

**Closest analog:** `frontend/hooks/use-digest.ts` (52 lines) — exact pattern for read-only daily-cached resource via `paths["..."]["get"]["responses"]["200"]...` typing.

**Existing pattern** (use-digest.ts full file shown above):
```typescript
import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { paths } from "@/lib/api/types.gen";

type DigestLatestResponse =
  paths["/digest/latest"]["get"]["responses"]["200"]["content"]["application/json"];

export const digestKeys = {
  all: ["digest"] as const,
  latest: () => [...digestKeys.all, "latest"] as const,
};

export const digestOptions = {
  latest: () =>
    queryOptions({
      queryKey: digestKeys.latest(),
      queryFn: () =>
        api.get("digest/latest").json<DigestLatestResponse>(),
    }),
};

export function useDigestLatest() {
  return useQuery(digestOptions.latest());
}
```

**Apply this pattern by:** Copy `use-digest.ts` 1:1, replace `digest` with `studyRecommendation`, replace `/digest/latest` with `/ai/study-recommendations`. Export `studyRecKeys`, `studyRecOptions`, `useStudyRecommendation` (singular — only one cached row per user per day).

---

#### `frontend/hooks/use-multi-course-path.ts` (hook, TanStack mutation)

**Closest analog:** `frontend/hooks/use-gpa.ts:59-69` (`useGpaPath`) — exact pattern for POST mutation with `paths["..."]["post"]["requestBody"]...` typing.

**Existing pattern** (use-gpa.ts:59-69):
```typescript
type PathBody =
  paths["/gpa/path"]["post"]["requestBody"]["content"]["application/json"];

export function useGpaPath() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: PathBody) =>
      api.post("gpa/path", { json: body }).json<GpaPathResponse>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gpaKeys.all });
    },
  });
}
```

**Apply this pattern by:** Mirror `useGpaPath` exactly — same `useMutation` shape, same `mutationFn: (body) => api.post("gpa/multi-course-path", { json: body }).json<...>()`, same `onSuccess` invalidation (use `gpaKeys.all` so the report card re-fetches when target changes). Type imports via `paths["/gpa/multi-course-path"]["post"]...`.

---

### Frontend Component Tests

#### `frontend/components/predict/StudyRecCard.test.tsx` / `MultiCoursePathCard.test.tsx` / `Sources.test.tsx`

**Closest analog:** `frontend/__tests__/settings/GpaTargetSection.test.tsx` (69 lines) — exact pattern for vitest + RTL component test.

**Existing pattern** (GpaTargetSection.test.tsx full):
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

const mockMutate = vi.fn();
vi.mock("@/hooks/use-user", () => ({
  useUpdateProfile: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

import GpaTargetSection from "@/components/settings/GpaTargetSection";
// ...

describe("GpaTargetSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders current target value from user.gpa_target", () => {
    renderGpaSection({ gpa_target: 85.0 });
    expect(screen.getByText("85.0")).toBeInTheDocument();
  });
  // ...
});
```

**Apply this pattern by:** Copy this test scaffold for each component. Mock `next-intl` with the same passthrough function. Mock the hooks the component depends on (`useStudyRecommendation`, `useMultiCoursePath`, etc.) via `vi.mock("@/hooks/use-study-recommendations", () => ({ useStudyRecommendation: () => ({ data: { data: ... }, isLoading: false }) }))`. For `Sources.test.tsx`: render with mock `sources` array, assert `[1]` `[2]` text appears, assert `<details>` summary text shows count, click to expand, assert excerpt renders. For `StudyRecCard.test.tsx`: assert Top-3 items render, course-color dots visible. For `MultiCoursePathCard.test.tsx`: assert advisory paragraph hidden when `path.advisory_text === null` (D-D1 visual fallback verification). NEW test files go under `frontend/__tests__/predict/...` to match existing layout (NOT alongside the source file — the existing pattern puts tests in `frontend/__tests__/<page>/`).

---

#### `frontend/hooks/use-ai-stream.test.ts`

**Closest analog:** No existing hook test. Build from `frontend/__tests__/auth/AuthGuard.test.tsx` (uses `vi.mock` + `act()` patterns) AND mirror the RTL `renderHook` pattern.

**Apply this pattern by:** Use `@testing-library/react`'s `renderHook` + `act`. Mock `streamAiResponse` from `@/lib/api/ai-stream` to yield a controlled sequence of SSE events: `{event:"status",...} → {event:"sources", data:{sources:[{index:1,...}]}} → {event:"token",data:{text:"Hello"}} → {event:"done",...}`. Assert that after the stream completes, the hook state has `sources: [{index:1,...}]` populated. Add a second test that asserts `clearMessages()` resets `sources` to `[]`.

---

### Frontend MODIFIED Components

#### `frontend/lib/api/ai-stream.ts` (lib, EXTEND SSEEvent union)

**Existing line to extend** (ai-stream.ts:7-10):
```typescript
export interface SSEEvent {
  event: "status" | "token" | "done" | "error";
  data: Record<string, unknown>;
}
```

**Apply this pattern by:** Add `"sources"` to the union: `event: "status" | "token" | "done" | "error" | "sources";`. The parser at lines 30-43 already handles arbitrary event names via `currentEvent = line.slice(7).trim()` — no parser change needed; only the type annotation tightens. RESEARCH §5 Assumption A10 confirms backward-compat (unknown events are silently skipped by current logic).

---

#### `frontend/hooks/use-ai-stream.ts` (hook, EXTEND state with sources)

**Existing pattern — event-type dispatch** (use-ai-stream.ts:79-100):
```typescript
if (event.event === "status") {
  setStatus(event.data.phase as string);
} else if (event.event === "token") {
  assistantContent += event.data.text as string;
  setMessages((prev) => {
    const updated = [...prev];
    updated[updated.length - 1] = {
      role: "assistant",
      content: assistantContent,
    };
    return updated;
  });
  setStatus(null);
} else if (event.event === "done") {
  setIsStreaming(false);
  setStatus(null);
} else if (event.event === "error") {
  setError(event.data.message as string);
  setIsStreaming(false);
  setStatus(null);
}
```

**Apply this pattern by:** (1) Add `sources` state: `const [sources, setSources] = useState<CitationSource[]>([])`. (2) Add an `else if` branch BEFORE the `token` branch:
```typescript
} else if (event.event === "sources") {
  setSources(event.data.sources as CitationSource[]);
}
```
(3) Reset `sources: []` on every new `sendMessage` call (line 51 area, mirror how `setStatus(null)` resets). (4) Reset on `clearMessages` (line 116 area). (5) Add `sources` to `UseAiStreamReturn` interface. The type `CitationSource` should be imported from `frontend/lib/api/types.gen.d.ts` (after `pnpm generate:types`).

---

#### `frontend/components/dashboard/HeroSection.tsx` (component, wire study rec)

**Existing pattern to replace** (HeroSection.tsx:75-77):
```tsx
// Encouragement text
const encouragement = defaultEncouragementProvider(mockActivity, t);
```

**Apply this pattern by:** Add prop `mainSuggestion?: string | null` to `HeroSectionProps`. Inside the component, replace the `encouragement.message` usage in `renderEncouragement()` with: `const heroLine = mainSuggestion?.trim() || encouragement.message`. When `mainSuggestion` is non-empty, render it directly without the `RoughNotationWrapper highlight` (study rec is already action-specific; no need to highlight a phrase). Keep the fallback to `defaultEncouragementProvider` for new users (D-D1 graceful when no rec yet).

---

#### `frontend/components/dashboard/DashboardPage.tsx` (page, wire hook + pass to Hero)

**Apply this pattern by:** Import `useStudyRecommendation` from `@/hooks/use-study-recommendations`. Call `const studyRec = useStudyRecommendation()` next to the existing `useGpaReport()`/`useCourses()` calls (~line 57). Pass `mainSuggestion={studyRec.data?.data.main_suggestion}` to `<HeroSection ...>`. The hook's natural loading/empty handling (returning `undefined`) makes the Hero fall back automatically.

---

#### `frontend/components/predict/PredictPage.tsx` (page, mount new cards)

**Apply this pattern by:** Mount `<StudyRecCard courses={courses} />` and `<MultiCoursePathCard targetWam={targetWam} remainingCp={user.remaining_credit_points} />` inside the right-rail portal (existing pattern in PredictPage:283-317 — use `createPortal(children, portalTarget)`). Order: `<StudyRecCard>` first (above `<RoiCard>`), `<MultiCoursePathCard>` after `<RoiCard>` or `<RequiredScoresCard>`.

---

#### `frontend/components/settings/GpaTargetSection.tsx` (component, ADD chips + remaining-cp input)

**Existing structure to extend** (GpaTargetSection.tsx:51-115).

**Apply this pattern by:** Above the slider row (line 70), add a chip row:
```tsx
<div className="flex gap-[8px] mb-[12px]">
  {[
    { label: "P 50", value: 50 },
    { label: "CR 65", value: 65 },
    { label: "D 75", value: 75 },
    { label: "HD 85", value: 85 },
  ].map(({ label, value }) => (
    <button
      key={value}
      type="button"
      onClick={() => handleChange(value)}
      className={`py-[6px] px-[12px] text-[0.72rem] font-medium rounded-[6px] border ${
        gpaValue === value
          ? "bg-[#d97757] text-white border-[#d97757]"
          : "bg-[#faf9f5] text-[#6b6b65] border-[#e8e5dd] hover:border-[#d97757]"
      }`}
    >
      {label}
    </button>
  ))}
</div>
```
Below the existing scale reference (line 110-113), add a new input row for `remaining_credit_points` mirroring the existing slider+number-input layout but for an integer field (`type="number" min={0} step={6}` since USYD units are 6cp). Wire to `useUpdateProfile` so save button persists both `gpa_target` AND `remaining_credit_points` in one mutation. Add new translation keys under `settings.gpa.bandChips.*` and `settings.gpa.remainingCp.*`.

---

#### `frontend/components/course-detail/AiCourseChat.tsx` & `frontend/components/deadlines/DeadlineAiChat.tsx` (component, INTEGRATE Sources panel)

**Existing pattern to extend** (AiCourseChat.tsx:77-89):
```tsx
{messages.map((msg, i) => (
  <AiChatBubble
    key={i}
    role={msg.role}
    content={msg.content}
    isStreaming={...}
  />
))}
```

**Apply this pattern by:** Both components destructure `sources` from the extended `useAiStream` return. After each assistant `<AiChatBubble>` (when `msg.role === "assistant"` AND `i === messages.length - 1` — only the latest answer), conditionally render `<Sources sources={sources} />` if `sources.length > 0`. Both files use the same pattern — no logic divergence. Existing `scrollTo` guard (line 32-40) already follows the jsdom-safe pattern (RESEARCH §10 Pitfall 6). Import `<Sources>` from `@/components/shared/Sources`.

---

#### `frontend/openapi/openapi.yaml` (contract, ADD 2 endpoints + 4 schemas)

**Closest analog:** Existing `/gpa/path` block (lines 785-816).

**Existing pattern**:
```yaml
  /gpa/path:
    post:
      operationId: calculateGpaPath
      summary: Calculate path to target GPA
      tags: [gpa]
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [target_wam]
              properties:
                target_wam:
                  type: number
      responses:
        "200":
          description: GPA path result
          content:
            application/json:
              schema:
                type: object
                required: [data, meta]
                properties:
                  data:
                    $ref: "#/components/schemas/GpaPath"
                  meta:
                    $ref: "#/components/schemas/ResponseMeta"
        "401":
          $ref: "#/components/responses/AuthError"
```

**Apply this pattern by:** Add 2 path entries: `/gpa/multi-course-path` (mirror `/gpa/path` but with `target_wam + remaining_credit_points` in requestBody, and a new `MultiCoursePath` response schema), and `/ai/study-recommendations` (GET, mirror digest endpoint shape). Add 4 component schemas: `MultiCoursePathRequest`, `MultiCoursePath`, `StudyRecommendation`, `StudyCandidate`. Use `bearerAuth` security (matches existing pattern). RESEARCH §8 has the full YAML schema. After editing, run `pnpm generate:types` from `frontend/` to regenerate `types.gen.d.ts` (RESEARCH §10 Pitfall 7 — never hand-edit the generated file).

---

## Shared Patterns

### Authentication

**Source:** `src/web/deps.py` (read by all routes via `Depends(get_current_user_id)`).
**Apply to:** Every new route added to `src/web/routes/ai.py` and `src/web/routes/gpa.py`.

```python
# Used pattern across all existing routes — see roi.py:24, gpa.py:44, ai.py:119

current_user_id: uuid.UUID = Depends(get_current_user_id),
session: AsyncSession = Depends(get_session),
```

### Error Handling — Per-Feature Graceful Fallback (D-D1)

**Source:** `src/sync/scheduled.py:189-213` (recall_email branch with `sentry_phase_scope`).
**Apply to:** All three AIFEAT features — wrap `await ai_engine.ask_question(...)` in try/except, fall through to deterministic backup, log to Sentry with `phase=34` tag. Per CONTEXT.md D-D2: silent fallback (no UI banner).

```python
# Source: src/sync/scheduled.py:189-213 (Phase 33 pattern)

try:
    advisory_text = await ai_engine.ask_question(...)
except Exception:
    with sentry_phase_scope("34"):
        sentry_sdk.capture_exception()
    logger.warning(
        "study_rec_ai_failed",   # or "rag_qa_ai_failed" / "path_advisory_ai_failed"
        user_id=str(user_id),
        exc_info=True,
    )
    advisory_text = None  # Frontend renders deterministic fallback per D-D1
```

### Validation — Pydantic Field

**Source:** `src/schemas/gpa.py:71, 97, 174, 234` (recurring `Field(ge=0, le=100)` pattern).
**Apply to:** All new request schemas.

```python
# Source: src/schemas/gpa.py multiple lines (97 = TargetRequest, 234 = GpaPathRequest)

class MultiCoursePathRequest(BaseModel):
    target_wam: float = Field(ge=0, le=100)
    remaining_credit_points: int = Field(ge=0)
```

### Decimal Precision (Path Math)

**Source:** `src/services/gpa.py:48-152` (recurring `Decimal(str(...))` + `quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)` pattern).
**Apply to:** ALL math in `calculate_multi_course_path`. Per RESEARCH §10 Pitfall 4 — converting `float → Decimal` mid-calc causes `78.4999999...` artifacts.

```python
# Source: src/services/gpa.py:113-131 (_calculate_cumulative_wam)

@staticmethod
def _calculate_cumulative_wam(
    courses_data: list[tuple[Decimal, int]],
) -> Decimal:
    if not courses_data:
        return Decimal("0.00")
    total_weighted: Decimal = sum(
        (wam * Decimal(str(cp)) for wam, cp in courses_data), Decimal("0")
    )
    total_credits: Decimal = sum(
        (Decimal(str(cp)) for _, cp in courses_data), Decimal("0")
    )
    if total_credits == 0:
        return Decimal("0.00")
    return (total_weighted / total_credits).quantize(_TWO_PLACES, rounding=ROUND_HALF_UP)
```

### structlog Usage

**Source:** Every service file (e.g., `src/services/qa.py:26`, `src/services/digest.py:22`).
**Apply to:** All new service files.

```python
import structlog
logger = structlog.get_logger()

# Use kw-args, never f-strings (allows JSON output in production):
logger.info("study_rec_generated", user_id=str(user.id), candidates=len(top_3))
logger.warning("study_rec_ai_failed", user_id=str(user.id), exc_info=True)
```

### Sentry Tagging

**Source:** `src/observability.py:11-22` (`sentry_phase_scope`).
**Apply to:** All Phase 34 fallback branches in services and scheduled tasks.

```python
from src.observability import sentry_phase_scope
import sentry_sdk

with sentry_phase_scope("34"):
    sentry_sdk.capture_exception()

# Optional richer tagging (RESEARCH §10):
with sentry_sdk.new_scope() as scope:
    scope.set_tag("phase", "34")
    scope.set_tag("feature", "study_recommendation")  # or "rag_qa" / "path_planner"
    sentry_sdk.capture_exception()
```

### Bilingual Prompt Selection

**Source:** `src/prompts/qa.py:21-23` (`get_qa_prompt(language)` selector helper).
**Apply to:** All new prompt files.

```python
# Source: src/prompts/qa.py:21-23

def get_X_prompt(language: str = "en") -> str:
    """Select X system prompt by language preference."""
    return X_SYSTEM_PROMPT_ZH if language == "zh" else X_SYSTEM_PROMPT
```

Pass `language=user.language_preference` from the calling service (mirror `digest.py:38` ctor + line 240 selection).

### TanStack Query Hook Shape

**Source:** `frontend/hooks/use-digest.ts` (query) and `frontend/hooks/use-gpa.ts:59-69` (mutation).
**Apply to:** All new frontend hooks.

```typescript
// Query pattern (use-digest.ts):
export const studyRecKeys = {
  all: ["studyRec"] as const,
  latest: () => [...studyRecKeys.all, "latest"] as const,
};
export const studyRecOptions = {
  latest: () =>
    queryOptions({
      queryKey: studyRecKeys.latest(),
      queryFn: () => api.get("ai/study-recommendations").json<...>(),
    }),
};
export function useStudyRecommendation() {
  return useQuery(studyRecOptions.latest());
}

// Mutation pattern (use-gpa.ts:59-69):
export function useMultiCoursePath() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PathBody) =>
      api.post("gpa/multi-course-path", { json: body }).json<...>(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: gpaKeys.all }),
  });
}
```

### jsdom-Safe DOM API Calls

**Source:** `frontend/components/course-detail/AiCourseChat.tsx:32-40` (existing `scrollTo` guard).
**Apply to:** Any new component using `scrollIntoView`, `scrollTo`, `getBoundingClientRect`, or other DOM APIs jsdom doesn't fully implement (CLAUDE.md jsdom Pitfall + RESEARCH §10 Pitfall 6).

```tsx
// Existing pattern — guard before call

if (
  scrollRef.current &&
  typeof scrollRef.current.scrollTo === "function"
) {
  scrollRef.current.scrollTo({ top: ..., behavior: "smooth" });
}

// For scrollIntoView in Sources panel (if a "scroll to source" feature added):
if (typeof element.scrollIntoView === "function") {
  element.scrollIntoView({ behavior: "smooth" });
}
```

### Frontend Component Test Mocks

**Source:** `frontend/__tests__/settings/GpaTargetSection.test.tsx:1-31`.
**Apply to:** All new component tests.

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-intl", () => ({
  useTranslations:
    () =>
    (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
}));

vi.mock("@/hooks/use-study-recommendations", () => ({
  useStudyRecommendation: () => ({
    data: { data: { main_suggestion: "Focus on Quiz 3", top_3: [...] } },
    isLoading: false,
  }),
}));
```

### i18n Key Convention

**Apply to:** `frontend/i18n/locales/{en,zh}/*.json`.
- Sources panel keys → namespace `shared.sources.*` or `ai.sources.*` (e.g., `sources.label`, `sources.empty`)
- Study rec keys → namespace `predict.studyRec.*` (e.g., `studyRec.title`, `studyRec.empty`)
- Path planner keys → namespace `predict.path.*` (e.g., `path.title`, `path.requiredAvg`, `path.unreachable`)
- Settings band chips → namespace `settings.gpa.bandChips.*`
- Settings remaining-cp → namespace `settings.gpa.remainingCp.*`

Mirror existing structure in `messages/en.json` (consistent with `useTranslations("predict")` and `useTranslations("settings")` namespaces in source code).

---

## No Analog Found

| File | Role | Reason |
|------|------|--------|
| `tests/unit/test_study_recommendation_scheduler.py` | scheduler timing test | No existing in-repo test directly tests an APScheduler `add_job` registration. Closest is `tests/unit/test_deadline_reminders.py` (tests the underlying async function, not the trigger registration). RESEARCH recommends asserting the scheduled function is reachable/idempotent rather than the trigger config — use the `should_send_*` pure-fn pattern from `test_recall_email.py` instead. |

---

## Metadata

**Analog search scope:** `src/services/`, `src/web/routes/`, `src/sync/`, `src/models/`, `src/schemas/`, `src/prompts/`, `src/observability.py`, `tests/unit/`, `tests/integration/`, `frontend/components/`, `frontend/hooks/`, `frontend/lib/api/`, `frontend/__tests__/`, `supabase/migrations/`, `frontend/openapi/openapi.yaml`.

**Files scanned:** 38 (codebase reads to confirm shape) + 3 (Phase 33 / Phase 32.1 reference for env-gated test pattern).

**Pattern extraction date:** 2026-04-16

**Highest-leverage analogs:**
- `src/services/digest.py` — drives 80% of `study_recommendation.py` shape (daily LLM + cache + per-feature fallback)
- `src/sync/scheduled.py` — drives 100% of new APScheduler async functions (per-user iter + sentry tagging)
- `src/services/gpa.py` (`calculate_target_path`) — drives 100% of `calculate_multi_course_path` shape (Decimal + edge cases)
- `frontend/components/predict/RoiCard.tsx` — drives 100% of `StudyRecCard.tsx` visual structure
- `supabase/migrations/00000000000007_*.sql` + `00000000000002_rls_policies.sql:380-401` — drives the new migration shape

**Key risks the planner must reconcile (from RESEARCH §10 Open Questions):**
1. **A1 — `Module.content_hash` vs `Course.content_hash`**: CONTEXT.md D-B2 says Module; RESEARCH recommends Course (matches embedding granularity). Planner must flag this as a clarification before finalizing migration.
2. **A2 — Daily AI call limit bypass for cron job**: Pitfall 5 — RESEARCH recommends bypass. Document the deviation in service docstring.
3. **A5 — Sources event must precede first token event**: Pitfall 2 — emit synchronously at start of `_sse_wrap` generator before `async for token in stream`.
