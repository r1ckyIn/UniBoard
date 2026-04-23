"""Course ORM model with multi-platform linking."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.models.deadline import UnifiedDeadline
    from src.models.discussion import DiscussionThread
    from src.models.grade import Grade
    from src.models.lesson import Lesson
    from src.models.module import Module
    from src.models.unit_outline import UnitOutline
    from src.models.user import Profile


class Course(UUIDMixin, TimestampMixin, Base):
    """Course linked to Canvas and/or Ed platforms."""

    __tablename__ = "courses"
    __table_args__ = (
        Index("ix_courses_user_semester", "user_id", "semester"),
        Index("ix_courses_canvas_id", "user_id", "canvas_course_id"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("profiles.id", ondelete="CASCADE")
    )
    canvas_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    ed_course_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(20))
    semester: Mapped[str] = mapped_column(String(20))
    credit_points: Mapped[int] = mapped_column(default=6)
    grading_weights: Mapped[dict | None] = mapped_column(  # type: ignore[type-arg]
        JSON, nullable=True
    )
    unit_outline_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    name_zh: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Phase 34 -- RAG hot-set tracker + content-hash trigger
    last_qa_access_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment=(
            "Bumped on every /courses/{id}/qa or /qa/stream call BEFORE LLM. "
            "Fuels embedding worker hot-set predicate "
            "(last_qa_access_at >= now() - 7d). "
            "Per phase 34 D-B1."
        ),
    )
    embedded_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment=(
            "Timestamp of most recent successful embedding pass for this course. "
            "Set by embedding worker after QAService.embed_course_materials "
            "completes. Per phase 34 D-B1."
        ),
    )
    content_hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        comment=(
            "sha256 hex of concatenated module_items.text_content + "
            "lessons.text_content. Worker re-embeds when computed hash differs "
            "from this column. Stored on Course (not Module) -- embedding "
            "granularity is per-course. Per phase 34 D-B2."
        ),
    )

    # Relationships
    profile: Mapped[Profile] = relationship(back_populates="courses")
    grades: Mapped[list[Grade]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    modules: Mapped[list[Module]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    lessons: Mapped[list[Lesson]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    discussion_threads: Mapped[list[DiscussionThread]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    unified_deadlines: Mapped[list[UnifiedDeadline]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
    unit_outlines: Mapped[list[UnitOutline]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
