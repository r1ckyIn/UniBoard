"""Study recommendation service with daily cache + composite scoring + LLM rendering.

Phase 34 AIFEAT-01: cross-course Top-3 ranking + 20-30 word AI main suggestion.
Daily APScheduler job calls generate_and_cache; frontend reads via get_latest.

Algorithm (per RESEARCH §3):
    score = urgency * weight * sqrt(roi)

    where:
        urgency = 1.5            if days_until_due < 0 (past due boost)
                = exp(-d / 5.0)  otherwise (exponential decay over 14d)

Per RESEARCH §10 Pitfall 5: AI call BYPASSES _check_and_increment_limit
because this is a cron-driven job (1 call/user/day; bounded by APScheduler).
"""

from __future__ import annotations

import math
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from datetime import date as date_type
from zoneinfo import ZoneInfo

import sentry_sdk
import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.study_recommendation_cache import StudyRecommendationCache
from src.prompts.study_recommendation import get_study_rec_prompt
from src.schemas.study_recommendation import (
    StudyCandidate,
    StudyRecommendationResponse,
)

logger = structlog.get_logger()

AEST_TZ = ZoneInfo("Australia/Sydney")
DEADLINE_WINDOW_DAYS = 14
OVERDUE_WINDOW_DAYS = 7  # cap overdue items at 7 days in the past


@dataclass
class _ScoringInput:
    """Internal candidate before composite scoring (mirrors RESEARCH §3 algorithm)."""

    course_code: str
    assessment_name: str
    weight: float
    days_until_due: float
    roi_score: float
    is_completed: bool


def _score_candidate(c: _ScoringInput, *, now: datetime | None = None) -> float:
    """Composite urgency * weight * sqrt(roi) ranking score.

    Returns -1.0 if completed (excluded from ranking).
    Pure function -- explicit ``now`` parameter kept for future time-based
    weighting and to match src/services/recall_email.py ergonomics.
    """
    _ = now  # reserved for future time-based weighting; pure for now
    if c.is_completed:
        return -1.0
    # Past due (days_until_due < 0) gets a hard boost above on-time items;
    # otherwise urgency decays exponentially over a ~14-day window.
    urgency = (
        1.5
        if c.days_until_due < 0
        else math.exp(-c.days_until_due / 5.0)
    )
    return urgency * c.weight * math.sqrt(max(c.roi_score, 0.0))


class StudyRecommendationService:
    """Generate, cache, and retrieve daily AI study recommendations."""

    def __init__(
        self,
        session: AsyncSession,
        anthropic_api_key: str = "",
        language: str = "en",
    ) -> None:
        self._session = session
        self._anthropic_api_key = anthropic_api_key
        self._language = language

    async def generate_and_cache(
        self,
        user_id: uuid.UUID,
    ) -> StudyRecommendationResponse:
        """Build candidates, rank, optionally call AI, UPSERT cache row.

        Per phase 34 D-D1 fallback: AI failure -> main_suggestion="", top_3 still
        populated (frontend renders ROI-only ranking).
        """
        # 1. Collect candidates from existing ROI service
        candidates = await self._collect_candidates(user_id)

        # 2. Pure rank
        top_3 = self._rank_candidates(candidates)[:3]

        # 3. Optional AI main_suggestion (Sentry-tagged failure isolation)
        main_suggestion = await self._render_main_suggestion(top_3)

        # 4. UPSERT cache row keyed on (user_id, today_aest)
        today_aest = self._today_aest()
        await self._upsert_cache(user_id, today_aest, main_suggestion, top_3)

        return StudyRecommendationResponse(
            generated_for_date=today_aest.isoformat(),
            main_suggestion=main_suggestion,
            top_3=top_3,
            language=self._language,
        )

    async def get_latest(
        self,
        user_id: uuid.UUID,
    ) -> StudyRecommendationResponse | None:
        """Read most-recent cached row (mirror DigestService.get_latest)."""
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

    # -------------------------------------------------------------------
    # Private helpers
    # -------------------------------------------------------------------

    @staticmethod
    def _today_aest() -> date_type:
        """Today's date in Australia/Sydney timezone (DST-aware)."""
        return datetime.now(UTC).astimezone(AEST_TZ).date()

    async def _collect_candidates(
        self,
        user_id: uuid.UUID,
    ) -> list[_ScoringInput]:
        """Iterate user courses; combine ROI signals with deadline due_date.

        Uses ROIService.get_course_roi per course (returns CourseROIResponse with
        ``assignments: list[AssignmentROI]`` each having ``weight``, ``roi_score``,
        ``due_date`` optional ISO string, ``score`` / ``max_score``).

        Filters to assessments with days_until_due in [-7, +14] (caps overdue at 7d).
        """
        from src.models.course import Course
        from src.services.roi import ROIService

        roi_svc = ROIService(self._session)
        now = datetime.now(UTC)

        stmt = select(Course).where(Course.user_id == user_id)
        result = await self._session.execute(stmt)
        courses = list(result.scalars().all())

        candidates: list[_ScoringInput] = []
        for course in courses:
            try:
                roi_data = await roi_svc.get_course_roi(user_id, course.id)
            except Exception:  # noqa: BLE001
                # Per-course failure must not block other courses.
                logger.warning(
                    "study_rec_roi_load_failed",
                    user_id=str(user_id),
                    course_id=str(course.id),
                    exc_info=True,
                )
                continue

            for item in roi_data.assignments:
                days_until_due = self._compute_days_until_due(item.due_date, now)
                if days_until_due is None:
                    # No due_date available -- cannot compute urgency; skip.
                    continue
                if not (-OVERDUE_WINDOW_DAYS <= days_until_due <= DEADLINE_WINDOW_DAYS):
                    continue

                is_completed = self._is_graded(item.score)
                candidates.append(
                    _ScoringInput(
                        course_code=course.code or course.name,
                        assessment_name=item.assessment_name,
                        weight=float(item.weight),
                        days_until_due=float(days_until_due),
                        roi_score=float(item.roi_score),
                        is_completed=is_completed,
                    )
                )
        return candidates

    @staticmethod
    def _compute_days_until_due(
        due_date_iso: str | None,
        now: datetime,
    ) -> float | None:
        """Compute days until due from ISO 8601 string. Returns None when unparseable."""
        if not due_date_iso:
            return None
        try:
            due_dt = datetime.fromisoformat(due_date_iso)
        except ValueError:
            return None
        if due_dt.tzinfo is None:
            due_dt = due_dt.replace(tzinfo=UTC)
        delta: timedelta = due_dt - now
        return delta.total_seconds() / 86400.0

    @staticmethod
    def _is_graded(score: float | None) -> bool:
        """An assessment with a non-null score has been completed."""
        return score is not None

    def _rank_candidates(
        self,
        candidates: list[_ScoringInput],
    ) -> list[StudyCandidate]:
        """Compute composite score and return descending-ranked StudyCandidates."""
        scored = [
            (c, _score_candidate(c)) for c in candidates if not c.is_completed
        ]
        scored.sort(key=lambda pair: pair[1], reverse=True)
        return [
            StudyCandidate(
                course_code=c.course_code,
                assessment_name=c.assessment_name,
                weight=c.weight,
                days_until_due=c.days_until_due,
                roi_score=c.roi_score,
                score=score,
            )
            for c, score in scored
        ]

    async def _render_main_suggestion(
        self,
        top_3: list[StudyCandidate],
    ) -> str:
        """Call AsyncAnthropic for 20-30 word main suggestion. Returns '' on failure (D-D1).

        Uses AsyncAnthropic directly (mirrors DigestService._enhance_with_ai) so
        a custom system prompt can be threaded; AIEngine.ask_question is hard-wired
        to the QA system prompt.
        """
        if not self._anthropic_api_key or not top_3:
            return ""
        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic(api_key=self._anthropic_api_key)
            user_msg = self._build_user_message(top_3)
            system_prompt = get_study_rec_prompt(self._language)
            response = await client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": user_msg}],
            )
            text: str = response.content[0].text  # type: ignore[union-attr]
            return text.strip()
        except Exception:
            with sentry_sdk.new_scope() as scope:
                scope.set_tag("phase", "34")
                scope.set_tag("feature", "study_recommendation")
                sentry_sdk.capture_exception()
            logger.warning(
                "study_rec_ai_failed",
                candidates=len(top_3),
                exc_info=True,
            )
            return ""

    @staticmethod
    def _build_user_message(top_3: list[StudyCandidate]) -> str:
        """Format Top-3 as a structured prompt input for the LLM."""
        lines = ["Ranked candidates (by composite urgency * weight * sqrt(roi)):"]
        for i, c in enumerate(top_3, start=1):
            lines.append(
                f"{i}. {c.course_code} -- {c.assessment_name} | "
                f"weight={c.weight:.2f} | days_until_due={c.days_until_due:.1f} | "
                f"roi={c.roi_score:.2f} | composite_score={c.score:.3f}"
            )
        lines.append(
            "\nGenerate ONE focus suggestion (20-30 words) for today's "
            "highest-leverage item. Action verb + course + assessment + weight + tactic."
        )
        return "\n".join(lines)

    async def _upsert_cache(
        self,
        user_id: uuid.UUID,
        today_aest: date_type,
        main_suggestion: str,
        top_3: list[StudyCandidate],
    ) -> None:
        """Idempotent UPSERT on (user_id, generated_for_date) per RESEARCH §3."""
        top_3_json = [c.model_dump() for c in top_3]
        stmt = (
            pg_insert(StudyRecommendationCache)
            .values(
                user_id=user_id,
                generated_for_date=today_aest,
                main_suggestion=main_suggestion,
                top_3=top_3_json,
                language=self._language,
            )
            .on_conflict_do_update(
                index_elements=["user_id", "generated_for_date"],
                set_={
                    "main_suggestion": main_suggestion,
                    "top_3": top_3_json,
                    "language": self._language,
                    "updated_at": datetime.now(UTC),
                },
            )
        )
        await self._session.execute(stmt)
        await self._session.flush()
