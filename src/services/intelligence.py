"""Ed Discussion intelligence service for high-value post filtering."""

from __future__ import annotations

import uuid

import structlog
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.course import Course
from src.models.discussion import DiscussionThread
from src.models.user import User
from src.schemas.intelligence import AIHighValuePostResponse, HighValuePostResponse

logger = structlog.get_logger()


class EdIntelligenceService:
    """Business logic for filtering endorsed and staff-answered Ed Discussion posts."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_high_value_posts(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> list[HighValuePostResponse]:
        """Get posts that are endorsed or from staff, ordered by creation date."""
        stmt = (
            select(DiscussionThread)
            .join(Course, DiscussionThread.course_id == Course.id)
            .where(
                Course.user_id == user_id,
                Course.id == course_id,
                or_(
                    DiscussionThread.is_endorsed.is_(True),
                    DiscussionThread.is_staff_post.is_(True),
                ),
            )
            .order_by(DiscussionThread.created_at.desc())
        )
        result = await self._session.execute(stmt)
        threads = result.scalars().all()

        return [
            HighValuePostResponse(
                id=str(thread.id),
                ed_thread_id=thread.ed_thread_id,
                title=thread.title,
                category=thread.category,
                content_summary=(thread.content or "")[:200],
                is_endorsed=thread.is_endorsed,
                is_staff_post=thread.is_staff_post,
                created_at=thread.created_at.isoformat(),
            )
            for thread in threads
        ]

    async def evaluate_new_threads_ai(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
        ai_engine: object,
    ) -> list[AIHighValuePostResponse]:
        """Evaluate unscored threads using AI, update scores, return high-value posts.

        Falls back to rule-engine (score stays 0.0) when AI fails.
        Threads with gpa_relevance_score > 0.3 are returned.
        ai_engine must have an async evaluate_thread method (duck typing).
        """
        if not hasattr(ai_engine, "evaluate_thread"):
            return []

        # Find unscored threads for this course
        stmt = (
            select(DiscussionThread)
            .join(Course, DiscussionThread.course_id == Course.id)
            .where(
                Course.user_id == user_id,
                Course.id == course_id,
                DiscussionThread.gpa_relevance_score == 0.0,
            )
        )
        result = await self._session.execute(stmt)
        unscored = result.scalars().all()

        scored_posts: list[AIHighValuePostResponse] = []

        # Enforce AI daily limit (consistent with QAService pattern)
        settings = get_settings()
        user = await self._session.get(User, user_id)
        calls_used = user.ai_calls_today if user else 0
        calls_remaining = max(0, settings.ai_daily_limit_per_user - calls_used)
        threads_to_eval = unscored[:calls_remaining] if calls_remaining > 0 else []

        for thread in threads_to_eval:
            try:
                evaluation = await ai_engine.evaluate_thread(
                    title=thread.title,
                    content=thread.content or "",
                    category=thread.category,
                    is_endorsed=thread.is_endorsed,
                    is_staff_post=thread.is_staff_post,
                )
                thread.gpa_relevance_score = evaluation.gpa_relevance
                if user:
                    user.ai_calls_today += 1
                await self._session.flush()

                if evaluation.gpa_relevance > 0.3:
                    scored_posts.append(
                        AIHighValuePostResponse(
                            id=str(thread.id),
                            ed_thread_id=thread.ed_thread_id,
                            title=thread.title,
                            category=thread.category,
                            content_summary=(thread.content or "")[:200],
                            is_endorsed=thread.is_endorsed,
                            is_staff_post=thread.is_staff_post,
                            created_at=thread.created_at.isoformat(),
                            gpa_relevance=evaluation.gpa_relevance,
                            ai_category=evaluation.category,
                            ai_summary=evaluation.summary,
                            urgency=evaluation.urgency,
                            key_facts=evaluation.key_facts,
                        )
                    )
            except Exception:
                logger.warning(
                    "ai_thread_eval_failed",
                    thread_id=str(thread.id),
                    exc_info=True,
                )
                # Rule-engine fallback: thread stays at 0.0

        # Sort by gpa_relevance descending
        scored_posts.sort(key=lambda p: p.gpa_relevance, reverse=True)
        return scored_posts

    async def get_ai_high_value_posts(
        self,
        user_id: uuid.UUID,
        course_id: uuid.UUID,
    ) -> list[AIHighValuePostResponse]:
        """Get threads scored > 0.3 or endorsed/staff, sorted by relevance."""
        stmt = (
            select(DiscussionThread)
            .join(Course, DiscussionThread.course_id == Course.id)
            .where(
                Course.user_id == user_id,
                Course.id == course_id,
                or_(
                    DiscussionThread.gpa_relevance_score > 0.3,
                    DiscussionThread.is_endorsed.is_(True),
                    DiscussionThread.is_staff_post.is_(True),
                ),
            )
            .order_by(DiscussionThread.gpa_relevance_score.desc())
        )
        result = await self._session.execute(stmt)
        threads = result.scalars().all()

        return [
            AIHighValuePostResponse(
                id=str(thread.id),
                ed_thread_id=thread.ed_thread_id,
                title=thread.title,
                category=thread.category,
                content_summary=(thread.content or "")[:200],
                is_endorsed=thread.is_endorsed,
                is_staff_post=thread.is_staff_post,
                created_at=thread.created_at.isoformat(),
                gpa_relevance=thread.gpa_relevance_score,
                ai_category=thread.category,
                ai_summary=(thread.content or "")[:100],
                urgency="informational",
                key_facts=[],
            )
            for thread in threads
        ]
