"""Ed Discussion intelligence service for high-value post filtering."""

from __future__ import annotations

import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.course import Course
from src.models.discussion import DiscussionThread
from src.schemas.intelligence import HighValuePostResponse


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
