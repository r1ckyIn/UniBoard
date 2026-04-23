"""DiscussionThread ORM model for Ed Discussion posts."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import Computed, DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.course import Course


class DiscussionThread(UUIDMixin, TimestampMixin, Base):
    """Ed Discussion thread with full-text search support."""

    __tablename__ = "discussion_threads"
    __table_args__ = (
        Index("ix_threads_course_created", "course_id", "created_at"),
        Index("ix_threads_ed_id", "course_id", "ed_thread_id", unique=True),
        Index("ix_threads_gpa_score", "course_id", "gpa_relevance_score"),
        Index(
            "ix_threads_search",
            "search_vector",
            postgresql_using="gin",
        ),
    )

    course_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE")
    )
    ed_thread_id: Mapped[str] = mapped_column(String(50))
    title: Mapped[str] = mapped_column(String(255))
    author: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(100))
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_endorsed: Mapped[bool] = mapped_column(default=False)
    is_staff_post: Mapped[bool] = mapped_column(default=False)
    gpa_relevance_score: Mapped[float] = mapped_column(Float, default=0.0)
    search_vector: Mapped[Any | None] = mapped_column(  # noqa: ANN401
        TSVECTOR,
        Computed(
            "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
            "setweight(to_tsvector('english', coalesce(content, '')), 'B')",
            persisted=True,
        ),
        nullable=True,
    )
    synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    course: Mapped[Course] = relationship(back_populates="discussion_threads")
