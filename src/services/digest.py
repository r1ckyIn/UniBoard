"""Digest service with rule-based aggregation and AI-enhanced urgency scoring."""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime, timedelta

import structlog
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.deadline import UnifiedDeadline
from src.models.digest import Digest
from src.models.discussion import DiscussionThread
from src.models.grade import Grade
from src.models.user import Profile
from src.prompts.digest import DIGEST_SUMMARY_SYSTEM_PROMPT
from src.schemas.digest import DigestItemResponse, DigestResponse

logger = structlog.get_logger()


class DigestService:
    """Generate daily digests with rule-based aggregation and AI enhancement."""

    def __init__(
        self,
        session: AsyncSession,
        anthropic_api_key: str = "",
        ai_engine: object | None = None,
    ) -> None:
        self._session = session
        self._anthropic_api_key = anthropic_api_key
        self._ai_engine = ai_engine

    async def generate_digest(
        self,
        user_id: uuid.UUID,
    ) -> DigestResponse:
        """Generate a daily digest for the user.

        Collects rule-based items, optionally enhances with AI urgency scoring,
        and stores the result in the Digest model.
        """
        items = await self._collect_rule_based(user_id)
        ai_summary: str | None = None

        # AI enhancement if API key set and items exist
        if self._anthropic_api_key and items:
            profile = await self._session.get(Profile, user_id)
            if profile is not None:
                from src.config import get_settings

                settings = get_settings()
                if profile.ai_calls_today < settings.ai_daily_limit_per_user:
                    try:
                        items, ai_summary = await self._enhance_with_ai(items)
                        profile.ai_calls_today += 1
                        await self._session.flush()
                    except Exception:
                        logger.warning(
                            "digest_ai_enhancement_failed",
                            user_id=str(user_id),
                            exc_info=True,
                        )

        # Store digest in database
        now = datetime.utcnow()  # noqa: DTZ003
        content_data = [item.model_dump() for item in items]
        digest = Digest(
            user_id=user_id,
            digest_date=now,
            content_json={"items": content_data},
            ai_summary=ai_summary,
        )
        self._session.add(digest)
        await self._session.flush()

        return DigestResponse(
            id=str(digest.id),
            digest_date=now.isoformat(),
            items=items,
            ai_summary=ai_summary,
            created_at=digest.created_at.isoformat(),
        )

    async def _collect_rule_based(
        self,
        user_id: uuid.UUID,
    ) -> list[DigestItemResponse]:
        """Collect items from last 24h: grades, upcoming deadlines, high-value posts."""
        items: list[DigestItemResponse] = []
        now = datetime.utcnow()  # noqa: DTZ003
        cutoff_24h = now - timedelta(hours=24)

        # Get user's courses
        courses_result = await self._session.execute(
            select(Course).where(Course.user_id == user_id)
        )
        courses = list(courses_result.scalars().all())
        course_map = {c.id: c for c in courses}
        course_ids = list(course_map.keys())

        if not course_ids:
            return items

        # 1. Recent grades (graded in last 24h)
        grades_result = await self._session.execute(
            select(Grade)
            .where(
                Grade.course_id.in_(course_ids),
                Grade.graded_at.isnot(None),
                Grade.graded_at >= cutoff_24h,
            )
        )
        for grade in grades_result.scalars().all():
            course = course_map.get(grade.course_id)
            if course is None:
                continue
            if grade.score is not None:
                score_str = f"{grade.score:.1f}/{grade.max_score:.1f}"
            else:
                score_str = "pending"
            items.append(
                DigestItemResponse(
                    type="grade",
                    title=f"{grade.assessment_name} graded",
                    detail=f"Score: {score_str} (weight: {grade.weight:.0%})",
                    course_code=course.code,
                    urgency_score=None,
                    timestamp=grade.graded_at.isoformat() if grade.graded_at else now.isoformat(),
                )
            )

        # 2. Upcoming deadlines (due in next 7 days)
        deadline_cutoff = now + timedelta(days=7)
        deadlines_result = await self._session.execute(
            select(UnifiedDeadline)
            .where(
                UnifiedDeadline.course_id.in_(course_ids),
                UnifiedDeadline.due_date >= now,
                UnifiedDeadline.due_date <= deadline_cutoff,
            )
            .order_by(UnifiedDeadline.due_date.asc())
        )
        for deadline in deadlines_result.scalars().all():
            course = course_map.get(deadline.course_id)
            if course is None:
                continue
            hours_until = (deadline.due_date - now).total_seconds() / 3600
            items.append(
                DigestItemResponse(
                    type="deadline",
                    title=deadline.title,
                    detail=f"Due in {hours_until:.0f}h",
                    course_code=course.code,
                    urgency_score=None,
                    timestamp=deadline.due_date.isoformat(),
                )
            )

        # 3. High-value Ed posts (endorsed or staff, synced in last 24h)
        posts_result = await self._session.execute(
            select(DiscussionThread)
            .where(
                DiscussionThread.course_id.in_(course_ids),
                or_(
                    DiscussionThread.is_endorsed.is_(True),
                    DiscussionThread.is_staff_post.is_(True),
                ),
                DiscussionThread.synced_at.isnot(None),
                DiscussionThread.synced_at >= cutoff_24h,
            )
        )
        for post in posts_result.scalars().all():
            course = course_map.get(post.course_id)
            if course is None:
                continue
            items.append(
                DigestItemResponse(
                    type="post",
                    title=post.title,
                    detail=(post.content or "")[:100],
                    course_code=course.code,
                    urgency_score=None,
                    timestamp=post.created_at.isoformat(),
                )
            )

        return items

    async def _enhance_with_ai(
        self,
        items: list[DigestItemResponse],
    ) -> tuple[list[DigestItemResponse], str]:
        """Use AIEngine to score urgency and generate summary in parallel.

        Returns (enhanced_items, ai_summary).
        Falls back to original items on failure.
        """
        # Build item descriptions for AI
        item_descs = "\n".join(
            f"[{i}] type={item.type}, title={item.title}, "
            f"detail={item.detail}, course={item.course_code}"
            for i, item in enumerate(items)
        )

        # Use AIEngine if available, else create from API key
        engine = self._ai_engine
        if engine is None and self._anthropic_api_key:
            from src.services.ai_engine import AIEngine

            engine = AIEngine(api_key=self._anthropic_api_key)

        if engine is None:
            return items, ""

        # Run urgency scoring and summary generation in parallel
        async def _score_urgency() -> list[dict[str, object]]:
            try:
                result: list[dict[str, object]] = await engine.score_urgency(item_descs)  # type: ignore[attr-defined]
                return result
            except Exception:
                logger.warning("digest_urgency_scoring_failed", exc_info=True)
                return []

        async def _generate_summary() -> str:
            try:
                from anthropic import AsyncAnthropic

                client = AsyncAnthropic(api_key=self._anthropic_api_key)
                summary_response = await client.messages.create(
                    model="claude-sonnet-4-20250514",
                    max_tokens=200,
                    system=DIGEST_SUMMARY_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": f"Items:\n{item_descs}"}],
                )
                return summary_response.content[0].text  # type: ignore[union-attr]
            except Exception:
                logger.warning("digest_summary_generation_failed", exc_info=True)
                return ""

        urgency_data, ai_summary = await asyncio.gather(
            _score_urgency(), _generate_summary()
        )

        # Apply urgency scores to items
        for entry in urgency_data:
            try:
                idx = int(str(entry["index"]))
                if 0 <= idx < len(items):
                    items[idx] = items[idx].model_copy(
                        update={"urgency_score": int(str(entry["urgency_score"]))}
                    )
            except (KeyError, ValueError, TypeError):
                continue

        return items, ai_summary

    async def get_latest(
        self,
        user_id: uuid.UUID,
    ) -> DigestResponse | None:
        """Return most recent digest for a user."""
        stmt = (
            select(Digest)
            .where(Digest.user_id == user_id)
            .order_by(Digest.digest_date.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        digest = result.scalar_one_or_none()
        if digest is None:
            return None

        # Reconstruct items from content_json
        raw_items = digest.content_json.get("items", [])
        items = [DigestItemResponse(**item) for item in raw_items]

        return DigestResponse(
            id=str(digest.id),
            digest_date=digest.digest_date.isoformat(),
            items=items,
            ai_summary=digest.ai_summary,
            created_at=digest.created_at.isoformat(),
        )

    async def get_history(
        self,
        user_id: uuid.UUID,
        limit: int = 7,
    ) -> list[DigestResponse]:
        """Return last N digests for a user."""
        stmt = (
            select(Digest)
            .where(Digest.user_id == user_id)
            .order_by(Digest.digest_date.desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        digests = list(result.scalars().all())

        responses: list[DigestResponse] = []
        for digest in digests:
            raw_items = digest.content_json.get("items", [])
            items = [DigestItemResponse(**item) for item in raw_items]
            responses.append(
                DigestResponse(
                    id=str(digest.id),
                    digest_date=digest.digest_date.isoformat(),
                    items=items,
                    ai_summary=digest.ai_summary,
                    created_at=digest.created_at.isoformat(),
                )
            )
        return responses
